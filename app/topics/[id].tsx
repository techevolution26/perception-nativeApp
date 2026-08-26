// app/topics/[id].tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import PerceptionCard from "../../components/PerceptionCard";
import VantageMark from "../../components/ui/VantageMark";
import { apiFetch } from "../../lib/api";
import useCurrentUser from "../../hooks/useCurrentUser";
import useLikeToggle from "../../hooks/useLikeToggle";
import type { Topic, Perception, LikeToggle } from "../../types/models";

export default function TopicScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useCurrentUser();
  const toggleLike = useLikeToggle();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [perceptions, setPerceptions] = useState<Perception[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([
        apiFetch<Topic>(`/api/topics/${id}`, { auth: false }),
        apiFetch<Perception[]>(`/api/topics/${id}/perceptions`, { auth: false }),
      ]);
      setTopic(t);
      setPerceptions(p);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !topic) {
    return (
      <View className="flex-1 items-center justify-center bg-background" style={{ paddingTop: insets.top }}>
        <ActivityIndicator />
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
        </View>
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
        renderItem={({ item }) => (
          <PerceptionCard
            perception={item}
            isOwner={user?.id === item.user.id}
            onLike={() =>
              toggleLike(item, (likedId, liked, likes_count) =>
                setPerceptions((curr) =>
                  curr.map((p) => (p.id === likedId ? { ...p, liked_by_user: liked, likes_count } : p))
                )
              )
            }
          />
        )}
      />
    </View>
  );
}
