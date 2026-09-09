import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import Spinner from "../components/ui/Spinner";
import { ApiError, apiFetch } from "../lib/api";
import type { ProfileIntelligence } from "../types/models";

function percent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export default function ProfileIntelligenceScreen() {
  const [data, setData] = useState<ProfileIntelligence | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiFetch<ProfileIntelligence>("/api/analytics/profile?days=180"));
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        router.replace("/subscription");
        return;
      }
      Alert.alert("Profile intelligence unavailable", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  if (loading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (!data) return null;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} className="rounded-control p-2" hitSlop={8}>
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="ml-2 flex-1">
          <Text className="font-sans-semibold text-xl text-foreground">Profile intelligence</Text>
          <Text className="font-sans text-sm text-foreground-muted">Recurring patterns across your Perceptions and Topics</Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-4 pb-12">
        <View className="flex-row flex-wrap gap-2">
          {[
            ["Perceptions", data.perception_count],
            ["Topics", data.topic_count],
            ["Analyzed responses", data.analyzed_comment_count],
            ["Qualifying Perceptions", data.qualifying_perception_count],
          ].map(([label, value]) => (
            <View key={label} className="min-w-[46%] flex-1 rounded-card border border-border-hairline bg-surface p-4">
              <Text className="font-mono text-xl text-foreground">{value}</Text>
              <Text className="mt-1 font-sans text-xs text-foreground-muted">{label}</Text>
            </View>
          ))}
        </View>

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Recurring themes across Topics</Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">Themes observed in responses across at least two Topics.</Text>
          {data.recurring_themes.length === 0 ? (
            <Text className="mt-3 font-sans text-sm text-foreground-muted">No recurring cross-Topic theme currently meets the minimum sample.</Text>
          ) : data.recurring_themes.map((item) => (
            <View key={item.theme} className="mt-3 rounded-control bg-surface-sunken p-3">
              <Text className="font-sans-medium text-sm text-foreground">{item.theme}</Text>
              <Text className="mt-1 font-sans text-xs text-foreground-muted">{item.comment_count} comments · {item.topic_count} Topics</Text>
              <Text className="mt-1 font-sans text-xs text-foreground-subtle">{item.topics.join(" · ")}</Text>
            </View>
          ))}
        </View>

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Topic intelligence</Text>
          {data.topics.length === 0 ? (
            <Text className="mt-2 font-sans text-sm text-foreground-muted">No Topic currently has at least {data.sample_minimum} analyzed comments.</Text>
          ) : data.topics.map((topic) => {
            const stance = topic.stance_distribution[0];
            const theme = topic.top_themes[0];
            return (
              <View key={`${topic.topic_id ?? "none"}-${topic.topic_name}`} className="mt-3 rounded-control bg-surface-sunken p-3">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 font-sans-medium text-sm text-foreground">{topic.topic_name}</Text>
                  <Text className="font-mono text-xs text-foreground-muted">n={topic.sample_size}</Text>
                </View>
                {stance && <Text className="mt-1 font-sans text-xs text-foreground-muted">Leading stance: {stance.label} · {percent(stance.share)}</Text>}
                {theme && <Text className="mt-1 font-sans text-xs text-foreground-muted">Leading theme: {theme.theme} · {percent(theme.share)}</Text>}
                <Text className="mt-1 font-sans text-xs text-foreground-subtle">{topic.perception_count} authored Perception{topic.perception_count === 1 ? "" : "s"}</Text>
              </View>
            );
          })}
        </View>

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Conversation over time</Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">Qualifying 30-day windows only; missing windows are not treated as zero.</Text>
          {data.temporal.buckets.length === 0 ? (
            <Text className="mt-3 font-sans text-sm text-foreground-muted">No time window currently meets the minimum sample.</Text>
          ) : data.temporal.buckets.map((bucket) => {
            const stance = bucket.stance_distribution[0];
            const theme = bucket.top_themes[0];
            return (
              <View key={`${bucket.period_start}-${bucket.period_end}`} className="mt-3 border-b border-border-hairline pb-3">
                <Text className="font-sans-medium text-sm text-foreground">{new Date(bucket.period_start).toLocaleDateString()} – {new Date(bucket.period_end).toLocaleDateString()}</Text>
                <Text className="mt-1 font-mono text-xs text-foreground-muted">n={bucket.sample_size}</Text>
                {stance && <Text className="mt-1 font-sans text-xs text-foreground-muted">Stance: {stance.label} · {percent(stance.share)}</Text>}
                {theme && <Text className="mt-1 font-sans text-xs text-foreground-muted">Theme: {theme.theme} · {percent(theme.share)}</Text>}
              </View>
            );
          })}
        </View>

        {data.patterns.length > 0 && (
          <View className="rounded-card border border-accent/30 bg-accent-soft p-4">
            <Text className="font-sans-semibold text-base text-foreground">Observed longitudinal patterns</Text>
            {data.patterns.map((pattern) => (
              <View key={pattern.label} className="mt-3">
                <Text className="font-sans-medium text-sm text-foreground">{pattern.label}</Text>
                <Text className="mt-1 font-sans text-xs leading-5 text-foreground-muted">{pattern.description} · n={pattern.sample_size}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="rounded-card border border-border-hairline bg-surface-sunken p-4">
          <Text className="font-sans-semibold text-sm text-foreground">Methodology & limits</Text>
          <Text className="mt-2 font-sans text-xs text-foreground-muted">Minimum sample: {data.sample_minimum} analyzed comments · {data.period_days}-day window · {data.temporal.bucket_days}-day buckets.</Text>
          {data.limitations.map((item) => <Text key={item} className="mt-2 font-sans text-xs leading-5 text-foreground-muted">• {item}</Text>)}
        </View>
      </ScrollView>
    </View>
  );
}
