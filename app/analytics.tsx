import Spinner from "../components/ui/Spinner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { ApiError, apiFetch } from "../lib/api";
import type { AnalyticsDecision, AnalyticsIntelligence, AnalyticsOverview } from "../types/models";

const PERIODS = [7, 30, 90] as const;

type Period = (typeof PERIODS)[number];

function formatPercent(value: number): string {
  const percent = value * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(0)}%`;
}

function momentumLabel(momentum: string): string {
  if (momentum === "rising") return "Rising";
  if (momentum === "declining") return "Declining";
  return "Stable";
}

export default function AnalyticsScreen() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [period, setPeriod] = useState<Period>(30);
  const [loading, setLoading] = useState(true);
  const [intelligence, setIntelligence] = useState<AnalyticsIntelligence | null>(null);
  const [decision, setDecision] = useState<AnalyticsDecision | null>(null);

  const load = useCallback(async (selectedPeriod: Period) => {
    setLoading(true);
    try {
      const result = await apiFetch<AnalyticsOverview>(`/api/analytics/overview?days=${selectedPeriod}`);
      setData(result);
      const [intelligenceResult, decisionResult] = await Promise.all([
        apiFetch<AnalyticsIntelligence>(`/api/analytics/intelligence?days=${selectedPeriod}`),
        apiFetch<AnalyticsDecision>(`/api/analytics/decision?days=${selectedPeriod}`),
      ]);
      setIntelligence(intelligenceResult);
      setDecision(decisionResult);
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        router.replace("/subscription");
        return;
      }
      Alert.alert("Analytics unavailable", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load(period));
  }, [load, period]);

  const trendMax = useMemo(() => Math.max(...(data?.trend.map((item) => item.perceptions) ?? [1]), 1), [data]);

  if (loading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (!data) return null;

  const strongest = data.strongest_topic;
  const emerging = data.emerging_topic;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} className="rounded-control p-2" hitSlop={8}>
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="ml-2 flex-1">
          <Text className="font-sans-semibold text-xl text-foreground">Portfolio analytics</Text>
          <Text className="font-sans text-sm text-foreground-muted">Observed signals, not predictions</Text>
        </View>
        <Pressable onPress={() => router.push("/profile-intelligence")} className="rounded-control p-2" accessibilityLabel="Profile intelligence">
          <Feather name="activity" size={18} color="#8b91a0" />
        </Pressable>
        <Pressable onPress={() => router.push("/analytics-profile")} className="rounded-control p-2" accessibilityLabel="Analytical profile settings">
          <Feather name="settings" size={18} color="#8b91a0" />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-4 pb-12">
        <View className="flex-row rounded-control border border-border-hairline bg-surface p-1">
          {PERIODS.map((value) => (
            <Pressable
              key={value}
              onPress={() => setPeriod(value)}
              className={`flex-1 items-center rounded-control px-3 py-2 ${period === value ? "bg-accent-soft" : ""}`}
            >
              <Text className={`font-sans-medium text-xs ${period === value ? "text-accent-strong" : "text-foreground-muted"}`}>
                {value} days
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row flex-wrap gap-2">
          {[
            ["Sample", data.sample_size.toString()],
            ["Participants", data.unique_participants.toString()],
            ["Interactions", data.total_interactions.toString()],
            ["Countries", data.geographic_coverage.toString()],
          ].map(([label, value]) => (
            <View key={label} className="min-w-[46%] flex-1 rounded-card border border-border-hairline bg-surface p-4">
              <Text className="font-mono text-2xl text-foreground">{value}</Text>
              <Text className="mt-1 font-sans text-xs text-foreground-subtle">{label}</Text>
            </View>
          ))}
        </View>

        {data.activity_anomaly !== "normal" && (
          <View className="rounded-card border border-border-hairline bg-surface-sunken p-4">
            <Text className="font-sans-medium text-xs uppercase tracking-wider text-foreground-subtle">Activity watch</Text>
            <Text className="mt-1 font-sans-semibold text-base text-foreground">
              {data.activity_anomaly === "spike" ? "Activity is spiking" : data.activity_anomaly === "drop" ? "Activity has dropped" : "New activity detected"}
            </Text>
            <Text className="mt-1 font-sans text-xs leading-5 text-foreground-muted">
              {data.activity_current_daily.toFixed(1)} perceptions/day now versus {data.activity_baseline_daily.toFixed(1)} in the preceding period. This is a screening signal, not a statistical test.
            </Text>
          </View>
        )}

        {data.insights.length > 0 && (
          <View className="rounded-card border border-border-hairline bg-surface p-4">
            <Text className="font-sans-semibold text-base text-foreground">What the data is saying</Text>
            <View className="mt-3 gap-3">
              {data.insights.map((insight) => (
                <View key={`${insight.kind}-${insight.title}`} className="rounded-control bg-surface-sunken p-3">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="flex-1 font-sans-medium text-sm text-foreground">{insight.title}</Text>
                    <Text className="font-mono text-[10px] uppercase text-foreground-subtle">{insight.confidence}</Text>
                  </View>
                  <Text className="mt-1 font-sans text-xs leading-5 text-foreground-muted">{insight.detail}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {decision && (
          <View className="rounded-card border border-accent/30 bg-accent-soft p-4">
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-1">
                <Text className="font-sans-medium text-xs uppercase tracking-wider text-accent-strong">Decision lens</Text>
                <Text className="mt-1 font-sans-semibold text-lg text-foreground">{decision.lens}</Text>
              </View>
              <Feather name="compass" size={20} color="#c97412" />
            </View>
            <Text className="mt-2 font-sans text-xs leading-5 text-foreground-muted">Use these signals to decide what deserves investigation next. They are not predictions or proof of demand.</Text>
            {decision.recommendations.slice(0, 3).map((item) => (
              <View key={item.topic_id} className="mt-3 rounded-control bg-surface/70 p-3">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 font-sans-medium text-sm text-foreground">{item.topic_name}</Text>
                  <Text className="font-mono text-xs text-foreground-muted">{item.signal_score.toFixed(0)}/100</Text>
                </View>
                <Text className="mt-1 font-sans text-xs leading-5 text-foreground-muted">{item.action}</Text>
              </View>
            ))}
          </View>
        )}

        {(strongest || emerging) && (
          <View className="gap-2">
            {strongest && (
              <View className="rounded-card border border-accent/30 bg-accent-soft p-4">
                <Text className="font-sans-medium text-xs uppercase tracking-wider text-accent-strong">Strongest signal</Text>
                <Text className="mt-1 font-sans-semibold text-lg text-foreground">{strongest.topic_name}</Text>
                <Text className="mt-1 font-sans text-sm text-foreground-muted">
                  {strongest.interactions} interactions across {strongest.perception_count} perceptions · score {strongest.signal_score.toFixed(0)}/100
                </Text>
              </View>
            )}
            {emerging && emerging.topic_id !== strongest?.topic_id && (
              <View className="rounded-card border border-border-hairline bg-surface p-4">
                <Text className="font-sans-medium text-xs uppercase tracking-wider text-foreground-subtle">Emerging topic</Text>
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="font-sans-semibold text-lg text-foreground">{emerging.topic_name}</Text>
                  <Text className="font-mono text-sm text-foreground">{formatPercent(emerging.growth_rate)}</Text>
                </View>
                <Text className="mt-1 font-sans text-sm text-foreground-muted">
                  {emerging.perception_count} current perceptions vs {emerging.previous_perception_count} in the prior period.
                </Text>
              </View>
            )}
          </View>
        )}

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Activity trend</Text>
          <Text className="mt-1 font-sans text-xs text-foreground-subtle">Daily perception volume in the selected period.</Text>
          <View className="mt-4 flex-row items-end gap-1" style={{ height: 100 }}>
            {data.trend.map((point) => (
              <View key={point.date} className="flex-1 items-center justify-end" style={{ height: 100 }}>
                <View className="w-full rounded-t-sm bg-accent" style={{ height: Math.max(3, (point.perceptions / trendMax) * 86) }} />
              </View>
            ))}
          </View>
          <View className="mt-2 flex-row justify-between">
            <Text className="font-mono text-[10px] text-foreground-subtle">{data.trend[0]?.date}</Text>
            <Text className="font-mono text-[10px] text-foreground-subtle">{data.trend.at(-1)?.date}</Text>
          </View>
        </View>

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Topic intelligence</Text>
          <View className="mt-3 gap-3">
            {data.topics.map((topic) => (
              <View key={topic.topic_id} className="border-b border-border-hairline pb-3">
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 font-sans-medium text-sm text-foreground">{topic.topic_name}</Text>
                  <Text className="font-mono text-xs text-foreground-muted">{topic.signal_strength.toFixed(2)}</Text>
                </View>
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="font-sans text-xs text-foreground-subtle">
                    {topic.perception_count} perceptions · {topic.interactions} interactions
                  </Text>
                  <Text className="font-mono text-xs text-foreground-muted">{formatPercent(topic.growth_rate)}</Text>
                </View>
                <Text className="mt-1 font-sans text-[11px] text-foreground-subtle">
                  {momentumLabel(topic.momentum)} · {topic.evidence_level} evidence · {topic.unique_participants} participants · score {topic.signal_score.toFixed(0)}/100 · {topic.likes} likes · {topic.comments} comments · {topic.views} views · {topic.shares} shares
                </Text>
              </View>
            ))}
            {data.topics.length === 0 && (
              <Text className="py-4 font-sans text-sm text-foreground-subtle">Not enough perception data yet. Keep contributing and interacting.</Text>
            )}
          </View>
        </View>

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Opportunity signals</Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">
            Patterns worth investigating for business or research decisions — not proof of demand.
          </Text>
          <View className="mt-3 gap-3">
            {data.opportunities.map((opportunity) => (
              <View key={opportunity.topic_id} className="rounded-control bg-surface-sunken p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans-medium text-sm text-foreground">{opportunity.topic_name}</Text>
                  <Text className="font-mono text-xs text-foreground-muted">{formatPercent(opportunity.growth_rate)}</Text>
                </View>
                <Text className="mt-1 font-sans text-xs leading-5 text-foreground-muted">{opportunity.reason}</Text>
                <Text className="mt-1 font-sans text-[11px] text-foreground-subtle">
                  Sample {opportunity.sample_size} · {opportunity.unique_participants} participants · {opportunity.evidence_level} evidence · score {opportunity.signal_score.toFixed(0)}/100
                </Text>
              </View>
            ))}
            {data.opportunities.length === 0 && (
              <Text className="py-3 font-sans text-sm text-foreground-subtle">No high-priority opportunity signals in this period yet.</Text>
            )}
          </View>
        </View>

        {intelligence && intelligence.relationships.length > 0 && (
          <View className="rounded-card border border-border-hairline bg-surface p-4">
            <Text className="font-sans-semibold text-base text-foreground">Cross-topic relationships</Text>
            <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">Topics that repeatedly appear across the same participants. Association, not causation.</Text>
            <View className="mt-3 gap-3">
              {intelligence.relationships.slice(0, 8).map((item) => (
                <View key={`${item.topic_a_id}-${item.topic_b_id}`} className="rounded-control bg-surface-sunken p-3">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="flex-1 font-sans-medium text-sm text-foreground">{item.topic_a_name} + {item.topic_b_name}</Text>
                    <Text className="font-mono text-xs text-foreground-muted">{item.relationship_strength.toFixed(0)}/100</Text>
                  </View>
                  <Text className="mt-1 font-sans text-xs text-foreground-muted">{item.shared_participants} shared participants · {(item.participant_overlap * 100).toFixed(0)}% overlap · {item.evidence_level} evidence</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {intelligence && intelligence.geographic_topic_signals.length > 0 && (
          <View className="rounded-card border border-border-hairline bg-surface p-4">
            <Text className="font-sans-semibold text-base text-foreground">Topic × geography</Text>
            <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">Where particular topics are most represented in the observed dataset.</Text>
            <View className="mt-3 gap-3">
              {intelligence.geographic_topic_signals.slice(0, 10).map((item) => (
                <View key={`${item.topic_id}-${item.country_code}`} className="flex-row items-center justify-between border-b border-border-hairline pb-2">
                  <View className="flex-1 pr-3">
                    <Text className="font-sans-medium text-sm text-foreground">{item.topic_name}</Text>
                    <Text className="mt-0.5 font-mono text-[10px] text-foreground-subtle">{item.country_code} · {item.evidence_level}</Text>
                  </View>
                  <Text className="font-sans text-xs text-foreground-muted">{item.perception_count} · {(item.share_of_topic * 100).toFixed(0)}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Geographic coverage</Text>
          <View className="mt-3 gap-2">
            {data.geography.slice(0, 10).map((geo) => (
              <View key={geo.country_code} className="flex-row items-center justify-between">
                <Text className="font-mono text-sm text-foreground">{geo.country_code}</Text>
                <Text className="font-sans text-sm text-foreground-muted">
                  {geo.perception_count} perceptions · {geo.interactions} interactions · {(geo.share_of_perceptions * 100).toFixed(0)}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="rounded-card border border-border-hairline bg-surface-sunken p-4">
          <Text className="font-sans-semibold text-sm text-foreground">Methodology & limits</Text>
          {data.methodology.map((item) => (
            <Text key={item} className="mt-2 font-sans text-xs leading-5 text-foreground-muted">• {item}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
