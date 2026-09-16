import Spinner from "../../components/ui/Spinner";
// app/(tabs)/search.tsx
import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import PerceptionCard from "../../components/PerceptionCard";
import useLikeToggle from "../../hooks/useLikeToggle";
import useSaveToggle from "../../hooks/useSaveToggle";
import useReportPerception from "../../hooks/useReportPerception";
import useGuardAction from "../../hooks/useGuardAction";
import useCurrentUser from "../../hooks/useCurrentUser";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../contexts/ToastContext";
import type { Perception } from "../../types/models";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Perception[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<"relevance" | "recent">("relevance");
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
        const data = await apiFetch<Perception[]>(`/api/search?query=${encodeURIComponent(query.trim())}&sort=${sort}`, { auth: Boolean(user) });
        setResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [query, sort, user]);


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
      <View className="px-4 py-3">
        <View className="flex-row items-center rounded-pill border border-border-hairline bg-surface-sunken px-3.5">
          <Feather name="search" size={16} color="#8b91a0" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search perceptions or users…"
            placeholderTextColor="#8b91a0"
            className="ml-2.5 flex-1 py-3 font-sans text-sm text-foreground"
          />
        </View>
      </View>

      <View className="flex-row gap-2 px-4 pb-2">
        <Pressable
          onPress={() => setSort("relevance")}
          className={`flex-row items-center gap-1 rounded-pill border px-3 py-1.5 ${sort === "relevance" ? "border-accent bg-accent/10" : "border-border-hairline bg-surface"}`}
        >
          <Feather name="compass" size={13} color={sort === "relevance" ? "#2563eb" : "#8b91a0"} />
          <Text className="font-sans-medium text-xs text-foreground">Relevant</Text>
        </Pressable>
        <Pressable
          onPress={() => setSort("recent")}
          className={`flex-row items-center gap-1 rounded-pill border px-3 py-1.5 ${sort === "recent" ? "border-accent bg-accent/10" : "border-border-hairline bg-surface"}`}
        >
          <Feather name="clock" size={13} color={sort === "recent" ? "#2563eb" : "#8b91a0"} />
          <Text className="font-sans-medium text-xs text-foreground">Recent</Text>
        </Pressable>
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
