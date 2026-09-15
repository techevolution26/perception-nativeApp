import Spinner from "../../components/ui/Spinner";
// app/(tabs)/search.tsx
import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import PerceptionCard from "../../components/PerceptionCard";
import useLikeToggle from "../../hooks/useLikeToggle";
import useSaveToggle from "../../hooks/useSaveToggle";
import useReportPerception from "../../hooks/useReportPerception";
import useGuardAction from "../../hooks/useGuardAction";
import { apiFetch } from "../../lib/api";
import type { Perception } from "../../types/models";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Perception[]>([]);
  const [loading, setLoading] = useState(false);
  const guard = useGuardAction();
  const toggleLike = useLikeToggle();
  const toggleSave = useSaveToggle();
  const reportPerception = useReportPerception();

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
        const data = await apiFetch<Perception[]>(`/api/search?query=${encodeURIComponent(query.trim())}`);
        setResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);


  const handleReport = (perceptionId: number, reason: Parameters<typeof reportPerception>[1]) => {
    void reportPerception(perceptionId, reason, undefined, () => {});
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
                toggleSave(item, (saved) => updatePerception(item.id, { saved_by_user: saved })),
              )
            }
            onReport={handleReport}
          />
        )}
      />
    </View>
  );
}
