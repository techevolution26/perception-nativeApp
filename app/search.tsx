import Spinner from "../components/ui/Spinner";
// app/search.tsx
import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import PerceptionCard from "../components/PerceptionCard";
import useLikeToggle from "../hooks/useLikeToggle";
import useSaveToggle from "../hooks/useSaveToggle";
import useReportPerception from "../hooks/useReportPerception";
import useGuardAction from "../hooks/useGuardAction";
import { apiFetch } from "../lib/api";
import useCurrentUser from "../hooks/useCurrentUser";
import { useToast } from "../contexts/ToastContext";
import type { Perception } from "../types/models";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Perception[]>([]);
  const [loading, setLoading] = useState(false);
  const guard = useGuardAction();
  const toggleLike = useLikeToggle();
  const toggleSave = useSaveToggle();
  const reportPerception = useReportPerception();
  const { showToast } = useToast();

  const updatePerception = (id: number, changes: Partial<Perception>) => {
    setResults((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  };


  useEffect(() => {
    if (!query.trim()) {
      void Promise.resolve().then(() => setResults([]));
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<Perception[]>(`/api/search?query=${encodeURIComponent(query.trim())}`, { auth: Boolean(user) });
        setResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [query, user]);


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

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 px-4 pt-3">
        <Pressable onPress={() => router.back()} className="rounded-control p-1">
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="flex-1 flex-row items-center rounded-pill border border-border-hairline bg-surface-sunken px-3.5">
          <Feather name="search" size={16} color="#8b91a0" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search perceptions or users…"
            placeholderTextColor="#8b91a0"
            autoFocus
            className="ml-2.5 flex-1 py-3 font-sans text-sm text-foreground"
          />
        </View>
      </View>

      {loading && (
        <View className="flex-row items-center gap-2 px-4 py-2">
          <Spinner size={18} />
          <Text className="font-sans text-sm text-foreground-subtle">Searching…</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        contentContainerClassName="gap-3 px-4 pb-10"
        ListEmptyComponent={
          !loading && query ? (
            <Text className="mt-6 text-center font-sans text-foreground-subtle">
              No results found for &ldquo;{query}&rdquo;.
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => (
          <PerceptionCard
            perception={item}
            index={index}
            onLike={() =>
              guard(() =>
                toggleLike(
                  item,
                  (id, liked, likesCount) =>
                    updatePerception(id, { liked_by_user: liked, likes_count: likesCount }),
                ),
              )
            }
            onSave={() =>
              guard(() =>
                toggleSave(
                  item,
                  (saved) => {
                    updatePerception(item.id, { saved_by_user: saved });
                    showToast({ title: saved ? "Perception bookmarked" : "Bookmark removed", message: saved ? "Saved to your private collection." : "Removed from your saved perceptions.", tone: "success" });
                  },
                  (error) => showToast({ title: "Bookmark failed", message: error instanceof Error ? error.message : "Please try again.", tone: "error" }),
                ),
              )
            }
            onReport={handleReport}
          />
        )}
      />
    </View>
  );
}
