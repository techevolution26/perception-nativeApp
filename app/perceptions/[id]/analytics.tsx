import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import Spinner from "../../../components/ui/Spinner";
import Button from "../../../components/ui/Button";
import { ApiError, apiFetch } from "../../../lib/api";
import type { PerceptionAnalytics } from "../../../types/models";

export default function PerceptionAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<PerceptionAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresSubscription, setRequiresSubscription] = useState(false);

  useEffect(() => {
    let mounted = true;

    apiFetch<PerceptionAnalytics>(`/api/analytics/perceptions/${id}`)
      .then((result) => {
        if (mounted) setData(result);
      })
      .catch((requestError) => {
        if (!mounted) return;

        if (requestError instanceof ApiError && requestError.status === 402) {
          setRequiresSubscription(true);
          return;
        }

        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "We couldn't load this report right now.",
        );
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  if (!data && !error && !requiresSubscription) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (requiresSubscription) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
          <Feather name="bar-chart-2" size={24} color="#c97412" />
        </View>
        <Text className="text-center font-sans-semibold text-xl text-foreground">
          Analytics access required
        </Text>
        <Text className="text-center font-sans text-sm leading-5 text-foreground-muted">
          Perception analytics is available with an analytics plan. View the plans to start a trial or subscribe.
        </Text>
        <View className="mt-2 w-full gap-2">
          <Button label="View plans" variant="accent" onPress={() => router.replace("/subscription")} />
          <Button label="Go back" variant="outline" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
        <Feather name="alert-circle" size={24} color="#e5484d" />
        <Text className="text-center font-sans text-sm text-foreground-muted">
          {error || "We couldn't load this report right now."}
        </Text>
        <Button label="Go back" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-12 pt-14">
      <Text className="font-sans-semibold text-2xl text-foreground">Perception analytics</Text>
      <Text className="mt-1 font-sans text-sm text-foreground-subtle">
        {data.topic_name ? `${data.topic_name} · ` : ""}Observed response to this perception · {data.period_days} days
      </Text>
      <View className="mt-3 rounded-control border border-border-hairline bg-surface p-3">
        <Text className="font-sans-medium text-xs uppercase tracking-wider text-foreground-subtle">Author lens</Text>
        <Text className="mt-1 font-sans text-sm text-foreground">
          {data.author_professional_role ?? "No professional identity"}{data.author_verified ? " · Verified" : ""}
        </Text>
      </View>

      <View className="mt-6 flex-row flex-wrap gap-3">
        {[
          ["Likes", data.likes],
          ["Comments", data.comments],
          ["Views", data.views],
          ["Shares", data.shares],
          ["Participants", data.unique_participants],
        ].map(([label, value]) => (
          <View key={String(label)} className="w-[47%] rounded-card border border-border-hairline bg-surface p-4">
            <Text className="font-mono text-2xl text-foreground">{value}</Text>
            <Text className="mt-1 font-sans text-xs uppercase tracking-wider text-foreground-subtle">{label}</Text>
          </View>
        ))}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Where interaction came from</Text>
        {data.top_countries.length === 0 ? (
          <Text className="mt-2 font-sans text-sm text-foreground-subtle">No geographic interaction data yet.</Text>
        ) : (
          data.top_countries.map((item) => (
            <View key={item.country_code} className="flex-row justify-between border-b border-border-hairline py-3">
              <Text className="font-sans text-foreground">{item.country_code}</Text>
              <Text className="font-mono text-foreground-muted">{item.participants}</Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Regional audience</Text>
        {data.top_regions.length === 0 ? (
          <Text className="mt-2 font-sans text-sm text-foreground-subtle">
            {data.audience_breakdown_available
              ? "No regional interaction data yet."
              : `Need at least ${data.audience_breakdown_minimum} unique participants for an audience breakdown.`}
          </Text>
        ) : (
          data.top_regions.map((item) => (
            <View key={item.region} className="flex-row justify-between border-b border-border-hairline py-3">
              <Text className="flex-1 font-sans text-foreground">{item.region}</Text>
              <Text className="font-mono text-foreground-muted">{item.participants}</Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Professional audience</Text>
        {data.top_professional_roles.length === 0 ? (
          <Text className="mt-2 font-sans text-sm text-foreground-subtle">
            Not enough unique participants for a professional breakdown yet.
          </Text>
        ) : (
          data.top_professional_roles.map((item) => (
            <View key={item.role_code} className="flex-row justify-between border-b border-border-hairline py-3">
              <Text className="flex-1 font-sans text-foreground">{item.role_label}</Text>
              <Text className="font-mono text-foreground-muted">{item.participants}</Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Verified professional audience</Text>
        {data.top_verified_professional_roles.length === 0 ? (
          <Text className="mt-2 font-sans text-sm text-foreground-subtle">
            No verified professional-role signal is available yet.
          </Text>
        ) : (
          data.top_verified_professional_roles.map((item) => (
            <View key={item.role_code} className="flex-row justify-between border-b border-border-hairline py-3">
              <Text className="flex-1 font-sans text-foreground">{item.role_label}</Text>
              <Text className="font-mono text-foreground-muted">{item.participants}</Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Methodology</Text>
        {data.methodology.map((item) => (
          <Text key={item} className="mt-2 font-sans text-sm leading-5 text-foreground-muted">• {item}</Text>
        ))}
      </View>
    </ScrollView>
  );
}