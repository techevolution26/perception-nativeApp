import Spinner from "../../components/ui/Spinner";
// app/topics/[id].tsx
import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import PerceptionCard from "../../components/PerceptionCard";
import Button from "../../components/ui/Button";
import VantageMark from "../../components/ui/VantageMark";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../contexts/ToastContext";
import useCurrentUser from "../../hooks/useCurrentUser";
import useLikeToggle from "../../hooks/useLikeToggle";
import useSaveToggle from "../../hooks/useSaveToggle";
import useReportPerception from "../../hooks/useReportPerception";
import useGuardAction from "../../hooks/useGuardAction";
import useTopicFollowToggle from "../../hooks/useTopicFollowToggle";
import type { Topic, Perception } from "../../types/models";

export default function TopicScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useCurrentUser();
  const toggleLike = useLikeToggle();
  const toggleSave = useSaveToggle();
  const reportPerception = useReportPerception();
  const { showToast } = useToast();
  const guard = useGuardAction();
  const topicFollowToggle = useTopicFollowToggle();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [perceptions, setPerceptions] = useState<Perception[]>([]);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([
        apiFetch<Topic>(`/api/topics/${id}`, { auth: Boolean(user) }),
        apiFetch<Perception[]>(`/api/topics/${id}/perceptions`, { auth: false }),
      ]);
      setTopic(t);
      setPerceptions(p);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void Promise.resolve().then(() => load());
      return undefined;
    }, [load]),
  );

  const handleSave = (p: Perception) =>
    guard(async () => {
      await toggleSave(
        p,
        (saved) => {
          setPerceptions((current) =>
            current.map((item) =>
              item.id === p.id ? { ...item, saved_by_user: saved } : item,
            ),
          );
          showToast({ title: saved ? "Perception bookmarked" : "Bookmark removed", message: saved ? "Saved to your private collection." : "Removed from your saved perceptions.", tone: "success" });
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

  if (loading || !topic) {
    return (
      <View className="flex-1 items-center justify-center bg-background" style={{ paddingTop: insets.top }}>
        <Spinner />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 px-4 py-3">
        <Pressable onPress={() => router.back()} className="rounded-control p-1">
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-sans-semibold text-xl text-foreground">
            {topic.name}
          </Text>
          <Text className="mt-0.5 font-sans text-xs text-foreground-subtle">
            {topic.followers_count ?? 0} {(topic.followers_count ?? 0) === 1 ? "follower" : "followers"}
          </Text>
        </View>
        <Button
          label={topic.followed_by_user ? "Following" : "Follow"}
          variant={topic.followed_by_user ? "outline" : "accent"}
          size="sm"
          loading={followBusy}
          disabled={followBusy}
          onPress={() =>
            guard(async () => {
              if (!user) return;
              const previous = Boolean(topic.followed_by_user);
              const previousCount = topic.followers_count ?? 0;
              setFollowBusy(true);
              setTopic((current) =>
                current
                  ? {
                      ...current,
                      followed_by_user: !previous,
                      followers_count: Math.max(0, previousCount + (previous ? -1 : 1)),
                    }
                  : current,
              );
              await topicFollowToggle(
                topic.id,
                previous,
                (followed) => {
                  setTopic((current) => {
                    if (!current) return current;
                    const delta = followed === previous ? 0 : followed ? 1 : -1;
                    return {
                      ...current,
                      followed_by_user: followed,
                      followers_count: Math.max(0, previousCount + delta),
                    };
                  });
                  showToast({
                    title: followed ? "Topic followed" : "Topic unfollowed",
                    message: followed ? "This topic will shape your recommendations." : "This topic was removed from your followed topics.",
                    tone: "success",
                  });
                },
                (error) => {
                  setTopic((current) =>
                    current
                      ? { ...current, followed_by_user: previous, followers_count: previousCount }
                      : current,
                  );
                  showToast({
                    title: "Topic update failed",
                    message: error instanceof Error ? error.message : "Please try again.",
                    tone: "error",
                  });
                },
              );
              setFollowBusy(false);
            })
          }
        />
      </View>

      <FlatList
        data={perceptions}
        keyExtractor={(item) => String(item.id)}
        contentContainerClassName="gap-4 px-4 pb-10"
        ListHeaderComponent={
          topic.description ? (
            <Text className="mb-4 font-sans text-sm text-foreground-subtle">{topic.description}</Text>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center gap-3 py-16">
            <VantageMark size={30} color="#8b91a0" />
            <Text className="font-sans text-sm text-foreground-subtle">No perceptions yet in {topic.name}.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <PerceptionCard
            perception={item}
            onSave={() => handleSave(item)}
            onReport={handleReport}
            index={index}
            isOwner={user?.id === item.user.id}
            onLike={() =>
              guard(() =>
                toggleLike(item, (likedId, liked, likes_count) =>
                  setPerceptions((curr) =>
                    curr.map((p) => (p.id === likedId ? { ...p, liked_by_user: liked, likes_count } : p))
                  )
                )
              )
            }
          />
        )}
      />
    </View>
  );
}
