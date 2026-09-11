import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StateView from "../../components/ui/StateView";
import VantageMark from "../../components/ui/VantageMark";
import { apiFetch, resolveMediaUrl } from "../../lib/api";
import useAuthStore from "../../store/useAuthStore";
import type { Topic, TopicsResponse } from "../../types/models";

interface TopicChoice extends Topic {
  followed: boolean;
  busy?: boolean;
}

export default function TopicOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [topics, setTopics] = useState<TopicChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(false);
      try {
        const [raw, followed] = await Promise.all([
          apiFetch<Topic[] | TopicsResponse>("/api/topics", { auth: false }),
          apiFetch<Topic[]>(`/api/users/${user.id}/topics`, { auth: false }),
        ]);
        const all = Array.isArray(raw) ? raw : raw.topics;
        const ids = new Set(followed.map((topic) => topic.id));
        setTopics(
          all.map((topic) => ({ ...topic, followed: ids.has(topic.id) })),
        );
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCount = useMemo(
    () => topics.filter((topic) => topic.followed).length,
    [topics],
  );

  const toggle = async (topic: TopicChoice) => {
    const next = !topic.followed;
    setTopics((current) =>
      current.map((item) =>
        item.id === topic.id ? { ...item, followed: next, busy: true } : item,
      ),
    );
    try {
      await apiFetch(`/api/topics/${topic.id}/follow`, {
        method: next ? "POST" : "DELETE",
      });
    } catch {
      setTopics((current) =>
        current.map((item) =>
          item.id === topic.id
            ? { ...item, followed: topic.followed, busy: false }
            : item,
        ),
      );
      return;
    }
    setTopics((current) =>
      current.map((item) =>
        item.id === topic.id ? { ...item, busy: false } : item,
      ),
    );
  };

  if (loading)
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <StateView kind="loading" />
      </View>
    );
  if (error)
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <StateView
          kind="error"
          title="Topics are unavailable"
          message="Connect to the internet and try again. Your account is already created."
          actionLabel="Try again"
          onAction={() => void load()}
        />
      </View>
    );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-5 pb-3 pt-5">
        <View className="mb-5 h-11 w-11 items-center justify-center rounded-full border border-accent/30 bg-accent-soft">
          <VantageMark size={23} />
        </View>
        <Text className="font-sans-semibold text-2xl text-foreground">
          Choose your vantage points
        </Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-subtle">
          Follow the topics you care about. We’ll use them to shape a more
          relevant Perception feed.
        </Text>
      </View>
      <FlatList
        data={topics}
        keyExtractor={(item) => String(item.id)}
        contentContainerClassName="gap-3 px-5 pb-28"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
          />
        }
        ListEmptyComponent={
          <StateView
            kind="empty"
            title="No topics yet"
            message="Topics will appear here when they are available."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void toggle(item)}
            disabled={item.busy}
            accessibilityRole="button"
            accessibilityLabel={`${item.followed ? "Unfollow" : "Follow"} ${item.name}`}
          >
            <Card
              className={`flex-row items-center p-3.5 ${item.followed ? "border-accent/40 bg-accent-soft" : ""}`}
            >
              {item.image_url ? (
                <Image
                  source={{ uri: resolveMediaUrl(item.image_url) }}
                  style={{ width: 46, height: 46, borderRadius: 23 }}
                  contentFit="cover"
                />
              ) : (
                <View className="h-[46px] w-[46px] items-center justify-center rounded-full bg-surface-sunken">
                  <Text className="font-sans-semibold text-foreground-muted">
                    {item.name[0]}
                  </Text>
                </View>
              )}
              <View className="ml-3 min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  className="font-sans-semibold text-foreground"
                >
                  {item.name}
                </Text>
                {item.description ? (
                  <Text
                    numberOfLines={2}
                    className="mt-0.5 font-sans text-xs leading-4 text-foreground-subtle"
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <View
                className={`ml-3 h-9 w-9 items-center justify-center rounded-full ${item.followed ? "bg-accent" : "bg-surface-sunken"}`}
              >
                {item.followed ? (
                  <Feather name="check" size={16} color="#201203" />
                ) : (
                  <Feather name="plus" size={17} color="#8b91a0" />
                )}
              </View>
            </Card>
          </Pressable>
        )}
      />
      <Pressable onPress={() => router.replace("/(tabs)")} className="absolute right-5 bottom-[92px] px-2 py-1"><Text className="font-sans-medium text-xs text-foreground-subtle">Skip for now</Text></Pressable>
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border-hairline bg-background px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Button
          label={
            selectedCount > 0
              ? `Continue with ${selectedCount} ${selectedCount === 1 ? "topic" : "topics"}`
              : "Follow at least one topic"
          }
          variant="accent"
          size="lg"
          disabled={selectedCount === 0}
          onPress={() => router.replace("/professional-identity?onboarding=1")}
        />
      </View>
    </View>
  );
}
