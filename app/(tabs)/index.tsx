import Spinner from "../../components/ui/Spinner";
// app/(tabs)/index.tsx
import { useCallback, useState, useMemo } from "react";
import { View, Text, FlatList, RefreshControl, Alert, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import PerceptionCard from "../../components/PerceptionCard";
import TopicsCarousel from "../../components/TopicsCarousel";
import VantageMark from "../../components/ui/VantageMark";
import { apiFetch } from "../../lib/api";
import useCurrentUser from "../../hooks/useCurrentUser";
import useGuardAction from "../../hooks/useGuardAction";
import useLikeToggle from "../../hooks/useLikeToggle";
import useSaveToggle from "../../hooks/useSaveToggle";
import useReportPerception from "../../hooks/useReportPerception";
import usePerceptionsStore from "../../store/usePerceptionsStore";
import useTopics from "../../hooks/useTopics";
import { useToast } from "../../contexts/ToastContext";
import type { Perception, Topic } from "../../types/models";
import { playLikeSound } from "../../lib/sound";
import { setTopicReminderPending } from "../../lib/topicReminder";

interface TopicGroup extends Topic {
  items: Perception[];
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useCurrentUser();
  const guard = useGuardAction();
  const toggleLike = useLikeToggle();
  const toggleSave = useSaveToggle();
  const reportPerception = useReportPerception();
  const { showToast } = useToast();
  const { data: topics = [] } = useTopics();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topicReminder, setTopicReminder] = useState(false);

  /*
    FIXED: Split the selector block into raw primitive arrays/objects
    to stop the inline reference generation that causes your infinite loop.
  */
  const order = usePerceptionsStore((s) => s.order);
  const byId = usePerceptionsStore((s) => s.byId);
  const hydrateFeed = usePerceptionsStore((s) => s.hydrateFeed);
  const updatePerception = usePerceptionsStore((s) => s.updatePerception);
  const removePerception = usePerceptionsStore((s) => s.removePerception);

  // Safely memoize the mapped perceptions array
  const perceptions = useMemo(() => {
    return order.map((id) => byId[id]).filter(Boolean);
  }, [order, byId]);

  // Authenticated users receive the context-aware feed. Guests retain the
  // public chronological/topic-grouped experience. The card contract stays
  // identical on both paths.
  const isPersonalized = Boolean(user);

  /*
    FIXED: Dynamically calculate bottom padding based on your custom tab bar
    layout heights so content scrolls neatly above the floating buttons.
  */
  const bottomTabBarPadding = useMemo(() => {
    return insets.bottom + 74;
  }, [insets.bottom]);

  const load = useCallback(async () => {
    try {
      const endpoint = isPersonalized
        ? "/api/perceptions/personalized"
        : "/api/perceptions";
      const perData = await apiFetch<Perception[]>(endpoint, { auth: isPersonalized });
      hydrateFeed(perData);
    } catch (err) {
      console.error("Failed to load feed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hydrateFeed, isPersonalized]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load]),
  );

  useFocusEffect(useCallback(() => {
    if (!user) { setTopicReminder(false); return undefined; }
    let active = true;
    void apiFetch<Topic[]>(`/api/users/${user.id}/topics`, { auth: true })
      .then((followed) => {
        if (!active) return;
        const hasTopics = followed.length > 0;
        setTopicReminder(!hasTopics);
        void setTopicReminderPending(!hasTopics);
      })
      .catch(() => { if (active) setTopicReminder(false); });
    return () => { active = false; };
  }, [user]));

  const handleLike = (p: Perception) =>
    guard(async () => {
      await toggleLike(
        p,
        (id, liked, likesCount) => {
          updatePerception(id, { liked_by_user: liked, likes_count: likesCount });
          if (liked) void playLikeSound();
        },
      );
    });

  const handleSave = (p: Perception) =>
    guard(async () => {
      await toggleSave(
        p,
        (saved) => {
          updatePerception(p.id, { saved_by_user: saved });
          showToast({
            title: saved ? "Perception bookmarked" : "Bookmark removed",
            message: saved ? "Saved to your private collection." : "Removed from your saved perceptions.",
            tone: "success",
          });
        },
        (error) => showToast({ title: "Bookmark failed", message: error instanceof Error ? error.message : "Please try again.", tone: "error" }),
      );
    });

  const handleReport = (perceptionId: number, reason: Parameters<typeof reportPerception>[1]) => {
    void reportPerception(
      perceptionId,
      reason,
      undefined,
      (error) => showToast({ title: "Report not submitted", message: error instanceof Error ? error.message : "Please try again.", tone: "error" }),
    ).then((submitted) => {
      if (submitted) showToast({ title: "Report submitted", message: "Thank you. Moderation will review this privately.", tone: "success" });
    });
  };

  const handleDelete = (p: Perception) => {
    Alert.alert("Delete perception?", "This action is permanent and cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/perceptions/${p.id}`, { method: "DELETE" });
            removePerception(p.id);
          } catch (err) {
            Alert.alert("Delete failed", err instanceof Error ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  const byTopic: TopicGroup[] = useMemo(() => {
    return topics
      .map((topic) => ({ ...topic, items: perceptions.filter((p) => p.topic?.id === topic.id).slice(0, 6) }))
      .filter((group) => group.items.length > 0);
  }, [topics, perceptions]);

  const flatData = useMemo(() => {
    let itemIndex = 0;

    if (isPersonalized) {
      return perceptions.map((item) => ({
        type: "item" as const,
        item,
        groupId: item.topic?.id ?? 0,
        itemIndex: itemIndex++,
      }));
    }

    return byTopic.flatMap((group) => [
      { type: "header" as const, group },
      ...group.items.map((item) => ({ type: "item" as const, item, groupId: group.id, itemIndex: itemIndex++ })),
    ]);
  }, [byTopic, isPersonalized, perceptions]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" style={{ paddingTop: insets.top }}>
        <Spinner />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-1">
          <VantageMark size={18} color="#f2a33c" />
          <View className="flex-row items-center">
            <Text className="font-sans-semibold text-xl leading-none text-foreground">Percepti</Text>
            <Ionicons name="bulb" size={18} color="#f2a33c" style={{ marginHorizontal: -1 }} />
            <Text className="font-sans-semibold text-xl leading-none text-foreground">n</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push("/search")} className="rounded-control p-1.5">
          <Feather name="search" size={20} color="#8b91a0" />
        </Pressable>
      </View>

      {topicReminder && (
        <Pressable onPress={() => router.push("/topics")} className="mx-4 mb-2 rounded-card border border-accent/25 bg-accent-soft px-4 py-3">
          <View className="flex-row items-center">
            <VantageMark size={18} color="#f2a33c" />
            <View className="ml-3 flex-1">
              <Text className="font-sans-medium text-sm text-foreground">Shape your Perception feed</Text>
              <Text className="mt-0.5 font-sans text-xs text-foreground-muted">Follow at least one topic when you are ready. This reminder disappears once you do.</Text>
            </View>
            <Feather name="chevron-right" size={17} color="#f2a33c" />
          </View>
        </Pressable>
      )}

      {isPersonalized && (
        <Pressable
          onPress={() => router.push("/recommendations")}
          className="mx-4 mb-2 flex-row items-center rounded-card border border-border-hairline bg-surface px-4 py-3"
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-accent-soft">
            <Feather name="compass" size={18} color="#2563eb" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-sans-medium text-sm text-foreground">Explore recommendations</Text>
            <Text className="mt-0.5 font-sans text-xs text-foreground-muted">Topics, people, and perceptions with a reason behind each suggestion.</Text>
          </View>
          <Feather name="chevron-right" size={17} color="#8b91a0" />
        </Pressable>
      )}

      {isPersonalized && (
        <View className="px-4 pb-1">
          <Text className="font-sans-semibold text-lg text-foreground">For you</Text>
          <Text className="mt-0.5 font-sans text-xs text-foreground-muted">Based on the topics, people, professional context, and places you choose to engage with.</Text>
        </View>
      )}

      <FlatList
        data={flatData}
        keyExtractor={(row, i) => (row.type === "header" ? `h-${row.group.id}` : `i-${row.item.id}-${i}`)}
        contentContainerStyle={{ paddingBottom: bottomTabBarPadding }}
        ListHeaderComponent={<TopicsCarousel topics={topics} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#f2a33c"
          />
        }
        ListEmptyComponent={
          <View className="items-center gap-3 py-20">
            <VantageMark size={30} color="#8b91a0" />
            <Text className="font-sans text-sm text-foreground-subtle">No perceptions available yet.</Text>
          </View>
        }
        renderItem={({ item: row }) =>
          row.type === "header" ? (
            <View className="mb-3 mt-5 flex-row items-center justify-between px-4">
              <Text className="font-sans-semibold text-lg text-foreground">{row.group.name}</Text>
              {row.group.items.length >= 6 && (
                <Text onPress={() => router.push(`/topics/${row.group.id}`)} className="font-sans-medium text-sm text-accent">
                  See more
                </Text>
              )}
            </View>
          ) : (
            <View className="mb-4 px-4">
              <PerceptionCard
                perception={row.item}
                index={row.itemIndex}
                onLike={() => handleLike(row.item)}
                onSave={() => handleSave(row.item)}
                onReport={handleReport}
                isOwner={user?.id === row.item.user.id}
                showOwnerActions
                onEdit={(p) => guard(() => router.push(`/perceptions/${p.id}/edit`))}
                onDelete={handleDelete}
                onAnalytics={(p) => guard(() => router.push(`/perceptions/${p.id}/analytics`))}
              />
            </View>
          )
        }
      />
    </View>
  );
}
