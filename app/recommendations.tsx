import Spinner from "../components/ui/Spinner";
import Avatar from "../components/ui/Avatar";
import PerceptionCard from "../components/PerceptionCard";
import useCurrentUser from "../hooks/useCurrentUser";
import useGuardAction from "../hooks/useGuardAction";
import useLikeToggle from "../hooks/useLikeToggle";
import useSaveToggle from "../hooks/useSaveToggle";
import useReportPerception from "../hooks/useReportPerception";
import { useToast } from "../contexts/ToastContext";
import { playLikeSound } from "../lib/sound";
import { apiFetch } from "../lib/api";
import type { Recommendations, Perception } from "../types/models";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function RecommendationsScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading: userLoading } = useCurrentUser();
  const [data, setData] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const guard = useGuardAction();
  const toggleLike = useLikeToggle();
  const toggleSave = useSaveToggle();
  const reportPerception = useReportPerception();
  const { showToast } = useToast();

  useEffect(() => {
    if (!userLoading && !user) router.replace("/(auth)/login");
  }, [userLoading, user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setData(await apiFetch<Recommendations>("/api/recommendations", { auth: true }));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load]),
  );

  if (userLoading || loading || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background" style={{ paddingTop: insets.top }}>
        <Spinner />
      </View>
    );
  }

  const handleLike = (perception: Perception) =>
    guard(async () => {
      await toggleLike(perception, (id, liked, likesCount) => {
        setData((current) =>
          current
            ? {
                ...current,
                perceptions: current.perceptions.map((item) =>
                  item.perception.id === id
                    ? {
                        ...item,
                        perception: {
                          ...item.perception,
                          liked_by_user: liked,
                          likes_count: likesCount,
                        },
                      }
                    : item,
                ),
              }
            : current,
        );
        if (liked) void playLikeSound();
      });
    });

  const handleSave = (perception: Perception) =>
    guard(async () => {
      await toggleSave(
        perception,
        (saved) => {
          setData((current) =>
            current
              ? {
                  ...current,
                  perceptions: current.perceptions.map((item) =>
                    item.perception.id === perception.id
                      ? { ...item, perception: { ...item.perception, saved_by_user: saved } }
                      : item,
                  ),
                }
              : current,
          );
          showToast({
            title: saved ? "Perception bookmarked" : "Bookmark removed",
            message: saved ? "Saved to your private collection." : "Removed from your saved perceptions.",
            tone: "success",
          });
        },
        (error) =>
          showToast({
            title: "Bookmark failed",
            message: error instanceof Error ? error.message : "Please try again.",
            tone: "error",
          }),
      );
    });

  const handleReport = (perceptionId: number, reason: Parameters<typeof reportPerception>[1]) => {
    void reportPerception(
      perceptionId,
      reason,
      undefined,
      (error) =>
        showToast({
          title: "Report not submitted",
          message: error instanceof Error ? error.message : "Please try again.",
          tone: "error",
        }),
    ).then((submitted) => {
      if (submitted) {
        showToast({
          title: "Report submitted",
          message: "Thank you. Moderation will review this privately.",
          tone: "success",
        });
      }
    });
  };

  const hasAny = data.topics.length > 0 || data.creators.length > 0 || data.perceptions.length > 0;

  if (!hasAny) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-2 px-4 py-3">
          <Pressable onPress={() => router.back()} className="rounded-control p-1">
            <Feather name="chevron-left" size={22} color="#8b91a0" />
          </Pressable>
          <Text className="font-sans-semibold text-xl text-foreground">Recommendations</Text>
        </View>
        <View className="items-center px-8 py-20">
          <Feather name="compass" size={28} color="#8b91a0" />
          <Text className="mt-3 text-center font-sans text-sm text-foreground-subtle">Follow a topic or interact with a few perceptions to start building recommendations.</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 px-4 py-3">
        <Pressable onPress={() => router.back()} className="rounded-control p-1">
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="flex-1">
          <Text className="font-sans-semibold text-xl text-foreground">Recommendations</Text>
          <Text className="mt-0.5 font-sans text-xs text-foreground-muted">Suggestions are based on your explicit context and activity.</Text>
        </View>
      </View>

      <FlatList
        data={["topics", "creators", "perceptions"] as const}
        keyExtractor={(item) => item}
        contentContainerClassName="gap-5 px-4 pb-12"
        renderItem={({ item: section }) => {
          if (section === "topics" && data.topics.length) {
            return (
              <View>
                <Text className="mb-2 font-sans-semibold text-base text-foreground">Topics to explore</Text>
                {data.topics.map((item) => (
                  <Pressable key={item.topic.id} onPress={() => router.push(`/topics/${item.topic.id}`)} className="mb-2 flex-row items-center rounded-card border border-border-hairline bg-surface px-3 py-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-soft"><Feather name="hash" size={18} color="#2563eb" /></View>
                    <View className="ml-3 flex-1"><Text className="font-sans-medium text-foreground">{item.topic.name}</Text><Text className="mt-0.5 font-sans text-xs text-foreground-muted">{item.reason}</Text></View>
                    <Feather name="chevron-right" size={16} color="#8b91a0" />
                  </Pressable>
                ))}
              </View>
            );
          }
          if (section === "creators" && data.creators.length) {
            return (
              <View>
                <Text className="mb-2 font-sans-semibold text-base text-foreground">People to explore</Text>
                {data.creators.map((item) => (
                  <Pressable key={item.creator.id} onPress={() => router.push(`/users/${item.creator.id}`)} className="mb-2 flex-row items-center rounded-card border border-border-hairline bg-surface px-3 py-3">
                    <Avatar uri={item.creator.avatar_url} size="md" />
                    <View className="ml-3 flex-1"><Text className="font-sans-medium text-foreground">{item.creator.name}</Text><Text className="mt-0.5 font-sans text-xs text-foreground-muted">{item.reason}</Text></View>
                    <Feather name="arrow-up-right" size={16} color="#8b91a0" />
                  </Pressable>
                ))}
              </View>
            );
          }
          if (section === "perceptions" && data.perceptions.length) {
            return (
              <View>
                <Text className="mb-2 font-sans-semibold text-base text-foreground">Perceptions to explore</Text>
                {data.perceptions.map((item, index) => (
                  <View key={item.perception.id} className="mb-3">
                    <Text className="mb-1 px-1 font-sans text-xs text-foreground-muted">{item.reason}</Text>
                    <PerceptionCard
                      perception={item.perception}
                      index={index}
                      onLike={() => handleLike(item.perception)}
                      onSave={() => handleSave(item.perception)}
                      onReport={handleReport}
                    />
                  </View>
                ))}
              </View>
            );
          }
          return null;
        }}
        ListEmptyComponent={<View className="items-center py-20"><Text className="font-sans text-sm text-foreground-subtle">No recommendations yet. Follow a topic or interact with a few perceptions and check back.</Text></View>}
      />
    </View>
  );
}
