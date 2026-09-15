import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import PerceptionCard from "../components/PerceptionCard";
import StateView from "../components/ui/StateView";
import useLikeToggle from "../hooks/useLikeToggle";
import useSaveToggle from "../hooks/useSaveToggle";
import useReportPerception from "../hooks/useReportPerception";
import useGuardAction from "../hooks/useGuardAction";
import useAuthStore from "../store/useAuthStore";
import { apiFetch } from "../lib/api";
import type { Perception } from "../types/models";

export default function SavedPerceptionsScreen() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((state) => state.token);
  const guard = useGuardAction();
  const toggleLike = useLikeToggle();
  const toggleSave = useSaveToggle();
  const reportPerception = useReportPerception();
  const [perceptions, setPerceptions] = useState<Perception[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const data = await apiFetch<Perception[]>("/api/users/me/saved-perceptions");
      setPerceptions(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <StateView
          kind="error"
          title="Sign in to view saved perceptions"
          message="Your saved perceptions are private to your account."
          actionLabel="Sign in"
          onAction={() => router.push("/(auth)/login")}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <StateView kind="loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <StateView kind="error" title="Saved perceptions are unavailable" actionLabel="Try again" onAction={() => void load()} />
      </View>
    );
  }


  const handleReport = (perceptionId: number, reason: Parameters<typeof reportPerception>[1]) => {
    void reportPerception(perceptionId, reason, undefined, () => {});
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 border-b border-border-hairline px-4 py-3">
        <Pressable onPress={() => router.back()} className="rounded-control p-1" hitSlop={8}>
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="flex-1">
          <Text className="font-sans-semibold text-xl text-foreground">Saved perceptions</Text>
          <Text className="mt-0.5 font-sans text-xs text-foreground-subtle">Private to you</Text>
        </View>
        <Feather name="bookmark" size={19} color="#f2a33c" />
      </View>

      <FlatList
        data={perceptions}
        keyExtractor={(item) => String(item.id)}
        contentContainerClassName="gap-4 px-4 pb-10 pt-4"
        ListEmptyComponent={<StateView kind="empty" title="Nothing saved yet" message="Save a perception when you want to return to it later." />}
        renderItem={({ item, index }) => (
          <PerceptionCard
            perception={item}
            index={index}
            onLike={() =>
              guard(() =>
                toggleLike(item, (id, liked, likesCount) =>
                  setPerceptions((current) =>
                    current.map((p) =>
                      p.id === id ? { ...p, liked_by_user: liked, likes_count: likesCount } : p,
                    ),
                  ),
                ),
              )
            }
            onSave={() =>
              guard(() =>
                toggleSave(item, (saved) => {
                  if (!saved) {
                    setPerceptions((current) => current.filter((p) => p.id !== item.id));
                  }
                }),
              )
            }
            onReport={handleReport}
          />
        )}
      />
    </View>
  );
}
