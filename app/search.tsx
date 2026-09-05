import Spinner from "../components/ui/Spinner";
// app/search.tsx
import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Avatar from "../components/ui/Avatar";
import Card from "../components/ui/Card";
import { apiFetch } from "../lib/api";
import type { Perception } from "../types/models";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Perception[]>([]);
  const [loading, setLoading] = useState(false);

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
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/perceptions/${item.id}`)}>
            <Card className="p-4">
              <View className="mb-2 flex-row items-center gap-2.5">
                <Avatar uri={item.user.avatar_url} size="sm" />
                <View>
                  <Text className="font-sans-medium text-foreground">{item.user.name}</Text>
                  {item.user.profession && (
                    <Text className="font-sans text-sm text-foreground-subtle">{item.user.profession}</Text>
                  )}
                </View>
              </View>
              <Text numberOfLines={3} className="font-sans text-foreground">
                {item.body}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
