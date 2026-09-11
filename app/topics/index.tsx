import Spinner from "../../components/ui/Spinner";
// app/topics/index.tsx
import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { View, Text, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { apiFetch, resolveMediaUrl } from "../../lib/api";
import useCurrentUser from "../../hooks/useCurrentUser";
import useGuardAction from "../../hooks/useGuardAction";
import type { Topic, TopicsResponse } from "../../types/models";
import { setTopicReminderPending } from "../../lib/topicReminder";

interface FollowableTopic extends Topic {
  followed: boolean;
}

export default function TopicsIndexScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useCurrentUser();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === "1";
  const guard = useGuardAction();
  const [topics, setTopics] = useState<FollowableTopic[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await apiFetch<Topic[] | TopicsResponse>("/api/topics", { auth: false });
      const topicsData: Topic[] = Array.isArray(raw) ? raw : raw.topics;

      let followedIds: number[] = [];
      if (user) {
        try {
          const followed = await apiFetch<Topic[]>(`/api/users/${user.id}/topics`, { auth: false });
          followedIds = followed.map((t) => t.id);
        } catch {
          // best-effort — an empty list here just means nothing shows as followed yet
        }
      }

      setTopics(topicsData.map((t) => ({ ...t, followed: followedIds.includes(t.id) })));
    } catch (err) {
      console.error("Failed to load topics:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const toggleFollow = (topic: FollowableTopic) =>
    guard(async () => {
      const method = topic.followed ? "DELETE" : "POST";
      // optimistic
      setTopics((prev) => prev.map((t) => (t.id === topic.id ? { ...t, followed: !t.followed } : t)));
      try {
        await apiFetch(`/api/topics/${topic.id}/follow`, { method });
        if (!topic.followed) await setTopicReminderPending(false);
      } catch {
        // roll back on failure
        setTopics((prev) => prev.map((t) => (t.id === topic.id ? { ...t, followed: topic.followed } : t)));
      }
    });

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 px-4 py-3">
        {!isOnboarding && <Pressable onPress={() => router.back()} className="rounded-control p-1">
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>}
        <Text className="font-sans-semibold text-xl text-foreground">{isOnboarding ? "Choose your topics" : "Topics"}</Text>
      </View>

      {loading ? (
        <Spinner className="mt-8" />
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-3 px-4 pb-10"
          ListHeaderComponent={
            <View className="mb-2">
              {isOnboarding && (
                <View className="mb-3 rounded-card border border-accent/20 bg-accent-soft px-4 py-4">
                  <Text className="font-sans-semibold text-base text-foreground">Your Perception starts with what matters to you.</Text>
                  <Text className="mt-1.5 font-sans text-sm leading-5 text-foreground-muted">Choose a few topics to shape the ideas, people, and conversations you see first. You can change this anytime.</Text>
                  <View className="mt-3 flex-row items-center gap-2">
                    <View className="h-1.5 flex-1 rounded-full bg-accent" />
                    <Text className="font-sans-medium text-[11px] text-accent">1 of 3</Text>
                  </View>
                </View>
              )}
              <Text className="font-sans text-sm text-foreground-subtle">
                {isOnboarding
                  ? "Pick the topics you care about. This is optional — you can continue now and shape your feed later."
                  : "Follow the topics you care about — they'll shape your home feed."}
              </Text>
              {isOnboarding && (
                <Text className="mt-1 font-sans-medium text-xs text-accent">{topics.filter((topic) => topic.followed).length} selected</Text>
              )}
            </View>
          }
          ListFooterComponent={isOnboarding ? (
            <View className="mt-3">
              <Button
                label="Continue to professional identity"
                variant="accent"
                size="lg"
                onPress={() => {
                  const hasTopics = topics.some((topic) => topic.followed);
                  void setTopicReminderPending(!hasTopics);
                  router.replace("/professional-identity?onboarding=1");
                }}
              />
              <Pressable onPress={() => router.replace("/(tabs)")} className="items-center py-3">
                <Text className="font-sans-medium text-sm text-foreground-subtle">Skip setup for now</Text>
              </Pressable>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <Card className="flex-row items-center justify-between p-4">
              <Pressable onPress={() => router.push(`/topics/${item.id}`)} className="min-w-0 flex-1 flex-row items-center gap-3.5">
                {item.image_url ? (
                  <Image source={{ uri: resolveMediaUrl(item.image_url) }} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" />
                ) : (
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-sunken">
                    <Text className="font-sans-medium text-sm text-foreground-muted">{item.name[0]}</Text>
                  </View>
                )}
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="font-sans-medium text-foreground">
                    {item.name}
                  </Text>
                  {item.description && (
                    <Text numberOfLines={1} className="font-sans text-sm text-foreground-subtle">
                      {item.description}
                    </Text>
                  )}
                </View>
              </Pressable>

              <Button
                label={item.followed ? "Following" : "Follow"}
                variant={item.followed ? "outline" : "accent"}
                size="sm"
                onPress={() => toggleFollow(item)}
              />
            </Card>
          )}
        />
      )}
    </View>
  );
}
