import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import Spinner from "../components/ui/Spinner";
import Button from "../components/ui/Button";
import { ApiError, apiFetch } from "../lib/api";
import type { ComparativeIntelligence, Perception, UserMe } from "../types/models";
import { AnalyticsBadge, AnalyticsLegend, stanceKind } from "../components/ui/AnalyticsBadge";

export default function CompareIntelligenceScreen() {
  const [perceptions, setPerceptions] = useState<Perception[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [data, setData] = useState<ComparativeIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch<Perception[]>("/perceptions"), apiFetch<UserMe>("/api/user")])
      .then(([items, user]) => setPerceptions(items.filter((item) => item.user.id === user.id)))
      .catch(() => Alert.alert("Unable to load perceptions", "Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const mine = useMemo(() => perceptions, [perceptions]);

  const toggle = (id: number) => {
    setSelected((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : current.length < 5 ? [...current, id] : current);
    setData(null);
  };

  const compare = async () => {
    if (selected.length < 2) {
      Alert.alert("Select at least two", "Choose two to five perceptions to compare.");
      return;
    }
    setComparing(true);
    try {
      const query = selected.map((id) => `perception_ids=${id}`).join("&");
      setData(await apiFetch<ComparativeIntelligence>(`/api/analytics/compare?${query}`));
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        router.push("/subscription");
      } else {
        Alert.alert("Comparison unavailable", "Please try again.");
      }
    } finally {
      setComparing(false);
    }
  };

  if (loading) return <View className="flex-1 items-center justify-center bg-background"><Spinner /></View>;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} className="rounded-control p-2" hitSlop={8}>
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="ml-2 flex-1">
          <Text className="font-sans-semibold text-xl text-foreground">Compare intelligence</Text>
          <Text className="font-sans text-sm text-foreground-muted">Compare observed response patterns across your Perceptions</Text>
          <AnalyticsLegend />
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-4 pb-12">
        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Select Perceptions</Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">Choose 2–5. Comparisons use only qualifying analyzed responses.</Text>
          {mine.length === 0 ? (
            <Text className="mt-3 font-sans text-sm text-foreground-muted">You do not have any Perceptions to compare.</Text>
          ) : mine.map((perception) => {
            const active = selected.includes(perception.id);
            return (
              <Pressable key={perception.id} onPress={() => toggle(perception.id)} className={`mt-3 rounded-control border p-3 ${active ? "border-accent bg-accent-soft" : "border-border-hairline bg-surface-sunken"}`}>
                <View className="flex-row items-center gap-2">
                  <Feather name={active ? "check-circle" : "circle"} size={17} color={active ? "#c97412" : "#8b91a0"} />
                  <Text className="flex-1 font-sans-medium text-sm text-foreground" numberOfLines={2}>{perception.body}</Text>
                </View>
                {perception.topic?.name && <Text className="mt-1 ml-6 font-sans text-xs text-foreground-subtle">{perception.topic.name}</Text>}
              </Pressable>
            );
          })}
          <View className="mt-4">
            <Button label={comparing ? "Comparing…" : `Compare ${selected.length || ""}`.trim()} variant="accent" disabled={comparing || selected.length < 2} onPress={compare} />
          </View>
        </View>

        {data && (
          <>
            <View className="rounded-card border border-border-hairline bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-semibold text-base text-foreground">Comparative intelligence</Text>
                <AnalyticsBadge label={data.status === "available" ? "Evidence available" : "Insufficient sample"} kind={data.status === "available" ? "strong" : "neutral"} />
              </View>
              <Text className="mt-2 font-sans text-xs leading-5 text-foreground-muted">{data.decision_note}</Text>
            </View>

            {data.perceptions.map((item) => (
              <View key={item.perception_id} className="rounded-card border border-border-hairline bg-surface p-4">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 font-sans-semibold text-sm text-foreground">{item.title}</Text>
                  <Text className="font-mono text-xs text-foreground-muted">n={item.sample_size}</Text>
                </View>
                {item.topic_name && <Text className="mt-1 font-sans text-xs text-foreground-subtle">{item.topic_name}</Text>}
                {item.leading_stance && <View className="mt-2 flex-row items-center gap-2"><AnalyticsBadge label={item.leading_stance} kind={stanceKind(item.leading_stance)} /><Text className="font-sans text-xs text-foreground-muted">leading stance</Text></View>}
                {item.leading_theme && <Text className="mt-2 font-sans text-xs text-foreground-muted">Leading theme: {item.leading_theme}</Text>}
              </View>
            ))}

            <View className="rounded-card border border-border-hairline bg-surface p-4">
              <Text className="font-sans-semibold text-base text-foreground">Observed comparisons</Text>
              {data.comparisons.length === 0 ? (
                <Text className="mt-2 font-sans text-sm text-foreground-muted">No qualifying pair currently produces a comparative signal.</Text>
              ) : data.comparisons.map((item) => (
                <View key={`${item.perception_a_id}-${item.perception_b_id}`} className="mt-3 rounded-control bg-surface-sunken p-3">
                  <AnalyticsBadge label={item.type.replace("_", " ")} kind={item.type === "aligned" ? "strong" : item.type === "stance_difference" ? "warning" : "info"} />
                  <Text className="mt-2 font-sans-medium text-sm text-foreground">{item.perception_a_title} ↔ {item.perception_b_title}</Text>
                  <Text className="mt-1 font-sans text-xs leading-5 text-foreground-muted">n={item.sample_size_a} vs n={item.sample_size_b} · {item.description}</Text>
                  {item.shared_themes.length > 0 && <Text className="mt-1 font-sans text-xs text-foreground-subtle">Shared themes: {item.shared_themes.join(" · ")}</Text>}
                </View>
              ))}
            </View>

            <View className="rounded-card border border-border-hairline bg-surface-sunken p-4">
              <Text className="font-sans-semibold text-sm text-foreground">Limits</Text>
              {data.limitations.map((item) => <Text key={item} className="mt-2 font-sans text-xs leading-5 text-foreground-muted">• {item}</Text>)}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
