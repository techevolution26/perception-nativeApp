// app/(tabs)/index.tsx
import { useCallback, useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import PerceptionCard from "../../components/PerceptionCard";
import VantageMark from "../../components/ui/VantageMark";
import { apiFetch } from "../../lib/api";
import useCurrentUser from "../../hooks/useCurrentUser";
import usePerceptionsStore from "../../store/usePerceptionsStore";
import useTopics from "../../hooks/useTopics";
import type { Perception, LikeToggle, Topic } from "../../types/models";

interface TopicGroup extends Topic {
  items: Perception[];
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useCurrentUser();
  const { data: topics = [] } = useTopics();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  /*
    FIXED: Dynamically calculate bottom padding based on your custom tab bar 
    layout heights so content scrolls neatly above the floating buttons.
  */
  const bottomTabBarPadding = useMemo(() => {
    return insets.bottom + 74;
  }, [insets.bottom]);

  const load = useCallback(async () => {
    try {
      const perData = await apiFetch<Perception[]>("/api/perceptions");
      hydrateFeed(perData);
    } catch (err) {
      console.error("Failed to load feed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hydrateFeed]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLike = async (p: Perception) => {
    const method = p.liked_by_user ? "DELETE" : "POST";
    try {
      const result = await apiFetch<LikeToggle>(
        `/api/perceptions/${p.id}/like`,
        { method },
      );
      updatePerception(p.id, {
        liked_by_user: result.liked,
        likes_count: result.likes_count,
      });
    } catch (err) {
      console.error("Like toggle failed:", err);
    }
  };

  const handleDelete = (p: Perception) => {
    Alert.alert(
      "Delete perception?",
      "This action is permanent and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/perceptions/${p.id}`, { method: "DELETE" });
              removePerception(p.id);
            } catch (err) {
              Alert.alert(
                "Delete failed",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const byTopic: TopicGroup[] = useMemo(() => {
    return topics
      .map((topic) => ({
        ...topic,
        items: perceptions.filter((p) => p.topic?.id === topic.id).slice(0, 6),
      }))
      .filter((group) => group.items.length > 0);
  }, [topics, perceptions]);

  const flatData = useMemo(() => {
    return byTopic.flatMap((group) => [
      { type: "header" as const, group },
      ...group.items.map((item) => ({
        type: "item" as const,
        item,
        groupId: group.id,
      })),
    ]);
  }, [byTopic]);

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="font-sans-semibold text-xl text-foreground">
          Perception
        </Text>
      </View>

      <FlatList
        data={flatData}
        keyExtractor={(row, i) =>
          row.type === "header" ? `h-${row.group.id}` : `i-${row.item.id}-${i}`
        }
        /* FIXED: Replaced static pb-28 with style injection for reliable devices/notches spacing */
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: bottomTabBarPadding,
        }}
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
            <Text className="font-sans text-sm text-foreground-subtle">
              No perceptions available yet.
            </Text>
          </View>
        }
        renderItem={({ item: row }) =>
          row.type === "header" ? (
            <View className="mb-3 mt-5 flex-row items-center justify-between">
              <Text className="font-sans-semibold text-lg text-foreground">
                {row.group.name}
              </Text>
              {row.group.items.length >= 6 && (
                <Text
                  onPress={() => router.push(`/topics/${row.group.id}`)}
                  className="font-sans-medium text-sm text-accent"
                >
                  See more
                </Text>
              )}
            </View>
          ) : (
            <View className="mb-4">
              <PerceptionCard
                perception={row.item}
                onLike={() => handleLike(row.item)}
                isOwner={user?.id === row.item.user.id}
                showOwnerActions
                onEdit={(p) => router.push(`/perceptions/${p.id}/edit`)}
                onDelete={handleDelete}
              />
            </View>
          )
        }
      />
    </View>
  );
}
