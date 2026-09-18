import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import { ApiError, apiFetch } from "../../lib/api";
import type { TopicIntelligence } from "../../types/models";
import { AnalyticsBadge, AnalyticsLegend, freshnessKind, sentimentKind, stanceKind } from "../../components/ui/AnalyticsBadge";

export default function TopicIntelligenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<TopicIntelligence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresSubscription, setRequiresSubscription] = useState(false);
  const [decisionIntent, setDecisionIntent] = useState<TopicIntelligence["decision_context"]["intent"]>("general_exploration");

  useEffect(() => {
    let mounted = true;

    apiFetch<TopicIntelligence>(`/api/analytics/topics/${id}?decision_intent=${decisionIntent}`)
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
  }, [id, decisionIntent]);

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
          Topic intelligence is available with an analytics plan. View the
          plans to start a trial or subscribe.
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
      <Pressable onPress={() => router.back()} className="-ml-2 mb-2 w-10 rounded-control p-2" hitSlop={8}>
        <Feather name="chevron-left" size={22} color="#8b91a0" />
      </Pressable>
      <Text className="font-sans-semibold text-2xl text-foreground">Topic intelligence</Text>
      <Text className="mt-1 font-sans text-sm text-foreground-subtle">
        {data.context.topic_name} · What is happening across this Topic's conversation · {data.context.period_days} days
      </Text>
      <AnalyticsLegend />

      {data.context.access_tier === "free_teaser" && (
        <View className="mt-4 rounded-card border border-accent/25 bg-accent-soft p-4">
          <View className="flex-row items-center gap-2">
            <Feather name="unlock" size={16} color="#c97412" />
            <Text className="flex-1 font-sans-semibold text-sm text-foreground">Free intelligence preview</Text>
          </View>
          <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
            {data.context.upgrade_message || "Subscribe to unlock Topic-wide perspectives, convergence and divergence comparisons, and fuller decision intelligence."}
          </Text>
          <View className="mt-3">
            <Button label="Explore plans" variant="accent" size="sm" onPress={() => router.push("/subscription")} />
          </View>
        </View>
      )}

      <View className="mt-4">
        <Text className="font-sans-medium text-sm text-foreground">Decision lens</Text>
        <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">Change the framing without changing the underlying evidence.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
          <View className="flex-row gap-2">
            {[
              "general_exploration",
              "research",
              "business",
              "policy",
              "journalism",
              "education",
              "product",
              "professional",
            ].map((intent) => {
              const selected = decisionIntent === intent;
              return (
                <Pressable
                  key={intent}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    if (intent !== decisionIntent) setDecisionIntent(intent as TopicIntelligence["decision_context"]["intent"]);
                  }}
                  className={`rounded-full border px-3 py-2 ${selected ? "border-foreground bg-foreground" : "border-border-hairline bg-surface"}`}
                >
                  <Text className={`font-sans-medium text-xs capitalize ${selected ? "text-background" : "text-foreground-muted"}`}>
                    {intent.split("_").join(" ")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View className="mt-4 rounded-card border border-border-hairline bg-surface p-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="font-sans-semibold text-base text-foreground">Intelligence freshness</Text>
            <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">{data.freshness.note}</Text>
          </View>
          <AnalyticsBadge label={data.freshness.status} kind={freshnessKind(data.freshness.status)} />
        </View>
        <Text className="mt-3 font-mono text-xs text-foreground-muted">
          {data.freshness.analyzed_comment_count}/{data.freshness.source_comment_count} comments analyzed
          {data.freshness.recalculation_required ? " · recalculation required" : " · current"}
        </Text>
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="font-sans-semibold text-base text-foreground">Analysis quality</Text>
            <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">{data.quality.note}</Text>
          </View>
          <AnalyticsBadge
            label={data.quality.status === "available" ? "available" : "not ready"}
            kind={data.quality.status === "available" ? "strong" : "neutral"}
          />
        </View>
        {data.quality.status === "available" && (
          <View className="mt-3 flex-row flex-wrap gap-2">
            <View className="rounded-control bg-background px-3 py-2">
              <Text className="font-sans text-xs text-foreground-muted">Quality score</Text>
              <Text className="mt-1 font-mono text-base text-foreground">
                {data.quality.quality_score === null ? "—" : `${Math.round(data.quality.quality_score * 100)}%`}
              </Text>
            </View>
            <View className="rounded-control bg-background px-3 py-2">
              <Text className="font-sans text-xs text-foreground-muted">Low-quality analyses</Text>
              <Text className="mt-1 font-mono text-base text-foreground">
                {data.quality.low_quality_comment_count}
                {data.quality.low_quality_share !== null ? ` · ${Math.round(data.quality.low_quality_share * 100)}%` : ""}
              </Text>
            </View>
            <View className="rounded-control bg-background px-3 py-2">
              <Text className="font-sans text-xs text-foreground-muted">Pending</Text>
              <Text className="mt-1 font-mono text-base text-foreground">{data.quality.pending_comment_count}</Text>
            </View>
            <View className="rounded-control bg-background px-3 py-2">
              <Text className="font-sans text-xs text-foreground-muted">Failed</Text>
              <Text className="mt-1 font-mono text-base text-foreground">{data.quality.failed_comment_count}</Text>
            </View>
          </View>
        )}
      </View>

      <View className="mt-6 flex-row flex-wrap gap-3">
        {[
          ["Perceptions", data.measurements.perceptions.value],
          ["Qualifying Perceptions", data.measurements.qualifying_perceptions.value],
          ["Analyzed responses", data.measurements.analyzed_comments.value],
          ["Unique participants", data.measurements.unique_participants.value],
        ].map(([label, value]) => (
          <View key={String(label)} className="w-[47%] rounded-card border border-border-hairline bg-surface p-4">
            <Text className="font-mono text-2xl text-foreground">{value ?? "—"}</Text>
            <Text className="mt-1 font-sans text-xs uppercase tracking-wider text-foreground-subtle">{label}</Text>
          </View>
        ))}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Semantic intelligence</Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">{data.semantic.note}</Text>
        <View className="mt-3 rounded-control bg-background px-3 py-2">
          <Text className="font-sans-medium text-xs uppercase tracking-wider text-foreground-subtle">Status</Text>
          <Text className="mt-1 font-sans text-sm text-foreground">
            {data.semantic.status === "available" ? "Available" : data.semantic.status.replace(/_/g, " ")}
          </Text>
          <Text className="mt-1 font-sans text-xs text-foreground-subtle">
            {data.semantic.analyzed_comment_count} analyzed comments across {data.semantic.qualifying_perception_count} qualifying Perceptions
            {" "}(needs {data.semantic.sample_minimum}+ comments across {data.semantic.perception_minimum}+ Perceptions)
          </Text>
        </View>

        {data.semantic.status === "available" && (
          <>
            <View className="mt-4">
              <Text className="font-sans-medium text-sm text-foreground">Sentiment</Text>
              {data.semantic.sentiment_distribution.map((item) => (
                <View key={item.label} className="mt-2 flex-row items-center justify-between gap-3">
                  <AnalyticsBadge label={item.label} kind={sentimentKind(item.label)} />
                  <Text className="font-mono text-sm text-foreground-muted">{Math.round(item.share * 100)}% · n={item.comments}</Text>
                </View>
              ))}
            </View>

            <View className="mt-4">
              <Text className="font-sans-medium text-sm text-foreground">Stance</Text>
              {data.semantic.stance_distribution.map((item) => (
                <View key={item.label} className="mt-2 flex-row items-center justify-between gap-3">
                  <AnalyticsBadge label={item.label} kind={stanceKind(item.label)} />
                  <Text className="font-mono text-sm text-foreground-muted">{Math.round(item.share * 100)}% · n={item.comments}</Text>
                </View>
              ))}
            </View>

            <View className="mt-4">
              <Text className="font-sans-medium text-sm text-foreground">Themes</Text>
              {data.semantic.top_themes.map((item) => (
                <View key={item.theme} className="mt-2 flex-row justify-between">
                  <Text className="flex-1 font-sans text-sm text-foreground-muted">{item.theme}</Text>
                  <Text className="font-mono text-sm text-foreground-muted">{Math.round(item.share * 100)}%</Text>
                </View>
              ))}
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              <View className="rounded-control bg-background px-3 py-2">
                <Text className="font-sans text-xs text-foreground-muted">Questions</Text>
                <Text className="mt-1 font-mono text-base text-foreground">{data.semantic.question_count}</Text>
              </View>
              {data.semantic.quality_score !== null && (
                <View className="rounded-control bg-background px-3 py-2">
                  <Text className="font-sans text-xs text-foreground-muted">Analysis quality</Text>
                  <Text className="mt-1 font-mono text-base text-foreground">{Math.round(data.semantic.quality_score * 100)}%</Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Professional × geographic perspectives</Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">{data.perspectives.cross_analysis_note}</Text>
        <Text className="mt-2 font-sans text-xs text-foreground-subtle">
          {data.perspectives.cross_analysis_comment_count} analyzed comments · minimum {data.perspectives.cross_analysis_sample_minimum} per cohort
        </Text>

        {data.perspectives.cross_analysis_status !== "available" ? (
          <Text className="mt-4 font-sans text-sm text-foreground-subtle">
            More analyzed comments are needed before cohort-level Topic comparisons can be shown.
          </Text>
        ) : (
          <>
            {data.perspectives.professional_geographic_segments.length > 0 && (
              <View className="mt-4">
                <Text className="font-sans-medium text-sm text-foreground">Professional + region cohorts</Text>
                {data.perspectives.professional_geographic_segments.map((item) => (
                  <View key={`${item.role_code}-${item.geography}`} className="mt-3 rounded-control bg-background p-3">
                    <View className="flex-row justify-between gap-3">
                      <Text className="flex-1 font-sans-medium text-sm text-foreground">{item.role_label} · {item.geography}</Text>
                      <Text className="font-mono text-xs text-foreground-muted">n={item.sample_size}</Text>
                    </View>
                    {item.stance_distribution[0] && (
                      <Text className="mt-2 font-sans text-xs text-foreground-muted">
                        Leading stance: {item.stance_distribution[0].label} ({Math.round(item.stance_distribution[0].share * 100)}%)
                      </Text>
                    )}
                    {item.top_themes[0] && (
                      <Text className="mt-1 font-sans text-xs text-foreground-muted">Leading theme: {item.top_themes[0].theme}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {data.perspectives.professional_semantic_segments.length > 0 && (
              <View className="mt-5">
                <Text className="font-sans-medium text-sm text-foreground">Professional perspectives</Text>
                {data.perspectives.professional_semantic_segments.slice(0, 5).map((item) => (
                  <View key={item.role_code} className="mt-3 flex-row justify-between border-b border-border-hairline pb-3">
                    <Text className="flex-1 font-sans text-sm text-foreground">{item.role_label}</Text>
                    <Text className="font-mono text-xs text-foreground-muted">n={item.sample_size}</Text>
                  </View>
                ))}
              </View>
            )}

            {data.perspectives.geographic_semantic_segments.length > 0 && (
              <View className="mt-5">
                <Text className="font-sans-medium text-sm text-foreground">Geographic perspectives</Text>
                {data.perspectives.geographic_semantic_segments.slice(0, 5).map((item) => (
                  <View key={item.geography} className="mt-3 flex-row justify-between border-b border-border-hairline pb-3">
                    <Text className="flex-1 font-sans text-sm text-foreground">{item.geography}</Text>
                    <Text className="font-mono text-xs text-foreground-muted">n={item.sample_size}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Convergence &amp; divergence</Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">{data.convergence_divergence.note}</Text>
        {data.convergence_divergence.status === "insufficient_comparison" ? (
          <Text className="mt-3 font-sans text-sm text-foreground-subtle">
            More qualifying cohorts are needed before convergence or divergence can be compared.
          </Text>
        ) : (
          <>
            {data.convergence_divergence.convergence.length > 0 && (
              <View className="mt-4">
                <Text className="font-sans-medium text-sm text-foreground">Convergence</Text>
                {data.convergence_divergence.convergence.slice(0, 5).map((item, index) => (
                  <View key={`convergence-${item.dimension}-${item.cohort_a}-${item.cohort_b}-${index}`} className="mt-3 rounded-control bg-background p-3">
                    <View className="flex-row justify-between gap-3">
                      <Text className="flex-1 font-sans-medium text-sm text-foreground">{item.cohort_a} ↔ {item.cohort_b}</Text>
                      <Text className="font-mono text-xs text-foreground-muted">n={item.sample_size_a}/{item.sample_size_b}</Text>
                    </View>
                    <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">{item.description}</Text>
                    {item.shared_themes.length > 0 && (
                      <Text className="mt-1 font-sans text-xs text-foreground-subtle">Shared themes: {item.shared_themes.join(", ")}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            {data.convergence_divergence.divergence.length > 0 && (
              <View className="mt-5">
                <Text className="font-sans-medium text-sm text-foreground">Divergence</Text>
                {data.convergence_divergence.divergence.slice(0, 5).map((item, index) => (
                  <View key={`divergence-${item.dimension}-${item.cohort_a}-${item.cohort_b}-${index}`} className="mt-3 rounded-control bg-background p-3">
                    <View className="flex-row justify-between gap-3">
                      <Text className="flex-1 font-sans-medium text-sm text-foreground">{item.cohort_a} ↔ {item.cohort_b}</Text>
                      <Text className="font-mono text-xs text-foreground-muted">n={item.sample_size_a}/{item.sample_size_b}</Text>
                    </View>
                    <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">{item.description}</Text>
                    {item.shared_themes.length > 0 && (
                      <Text className="mt-1 font-sans text-xs text-foreground-subtle">Shared themes: {item.shared_themes.join(", ")}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Conversation over time</Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">{data.temporal.note}</Text>
        {data.temporal.status === "insufficient_sample" ? (
          <Text className="mt-3 font-sans text-sm text-foreground-subtle">No qualifying time window is available yet.</Text>
        ) : (
          data.temporal.buckets.filter((bucket) => bucket.status === "available").slice(-6).map((bucket) => {
            const stance = bucket.stance_distribution[0]?.label ?? "—";
            const theme = bucket.top_themes[0]?.theme ?? "—";
            return (
              <View key={bucket.period_start} className="mt-3 rounded-control bg-background p-3">
                <View className="flex-row justify-between gap-3">
                  <Text className="flex-1 font-sans-medium text-sm text-foreground">
                    {new Date(bucket.period_start).toLocaleDateString()} → {new Date(bucket.period_end).toLocaleDateString()}
                  </Text>
                  <Text className="font-mono text-xs text-foreground-muted">n={bucket.sample_size}</Text>
                </View>
                <Text className="mt-2 font-sans text-xs text-foreground-muted">Leading stance: {stance}</Text>
                <Text className="mt-1 font-sans text-xs text-foreground-muted">Leading theme: {theme}</Text>
                <Text className="mt-1 font-sans text-xs text-foreground-subtle">Questions: {bucket.question_count}</Text>
              </View>
            );
          })
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="font-sans-semibold text-base text-foreground">Evidence governance</Text>
          <AnalyticsBadge label={data.evidence_governance.status} kind={data.evidence_governance.status === "eligible" ? "strong" : data.evidence_governance.status === "provisional" ? "warning" : "negative"} />
        </View>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
          Patterns: {data.evidence_governance.patterns_eligible ? "eligible" : "restricted"} · Signals: {data.evidence_governance.signals_eligible ? "eligible" : "restricted"}
        </Text>
        {data.evidence_governance.reasons.slice(0, 4).map((reason) => (
          <Text key={reason} className="mt-2 font-sans text-xs leading-5 text-foreground-subtle">• {reason}</Text>
        ))}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="font-sans-semibold text-base text-foreground">Semantic model governance</Text>
          <AnalyticsBadge label={data.semantic_model_governance.status.replace(/_/g, " ")} kind={data.semantic_model_governance.status === "stable" ? "strong" : data.semantic_model_governance.status === "review_required" ? "warning" : "neutral"} />
        </View>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
          Latest: {data.semantic_model_governance.latest_model_version ?? "unknown"} · baseline: {data.semantic_model_governance.baseline_model_version ?? "none"}
        </Text>
        <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">{data.semantic_model_governance.note}</Text>
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Observed patterns</Text>
        {data.patterns.length === 0 ? (
          <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">Patterns are withheld until the Topic evidence reaches the minimum sample and breadth.</Text>
        ) : (
          data.patterns.map((item) => (
            <View key={item.label} className="mt-3 rounded-control bg-background p-3">
              <AnalyticsBadge label="Observed pattern" kind="info" />
              <Text className="mt-2 font-sans-medium text-sm text-foreground">{item.label}</Text>
              <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">{item.description}</Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Observed signals</Text>
        {data.signals.length === 0 ? (
          <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">No evidence-backed signals are qualified yet — signals require patterns that also clear quality and freshness governance.</Text>
        ) : (
          data.signals.map((item) => (
            <View key={item.label} className="mt-3 rounded-control bg-background p-3">
              <View className="flex-row items-center justify-between gap-3">
                <AnalyticsBadge label="Observed signal" kind="warning" />
                <Text className="flex-1 font-sans-medium text-sm text-foreground">{item.label}</Text>
                <Text className="font-mono text-xs text-foreground-muted">n={item.sample_size}</Text>
              </View>
              <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">{item.description}</Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Decision intelligence</Text>
        <Text className="mt-1 font-sans text-sm capitalize text-foreground-subtle">
          {data.decision_context.intent.split("_").join(" ")} · {data.decision_context.status.replace("_", " ")}
        </Text>
        <Text className="mt-3 font-sans text-sm leading-5 text-foreground">{data.decision_context.summary}</Text>
        <View className="mt-4 rounded-control bg-background p-3">
          <Text className="font-sans text-xs leading-5 text-foreground-subtle">{data.decision_context.guardrail}</Text>
        </View>
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">Evidence provenance</Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
          This intelligence is derived from {data.provenance.source.replaceAll("_", " ")} and the qualifying observations in the selected period.
        </Text>
        <View className="mt-3 rounded-control bg-background p-3">
          <Text className="font-sans-medium text-xs text-foreground">Evidence trace</Text>
          <Text className="mt-1 font-mono text-[10px] text-foreground-subtle">{data.provenance.trace_id}</Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">{data.provenance.evidence_chain.join(" → ")}</Text>
        </View>
        <View className="mt-3 rounded-control bg-background p-3">
          <Text className="font-sans text-xs text-foreground-subtle">
            Sample: n={data.provenance.sample_size} · Scope: {data.provenance.scope.replaceAll("_", " ")} · Lens: {data.provenance.viewer_lens}
          </Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">{data.provenance.qualification}</Text>
        </View>
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface-sunken p-4">
        <Text className="font-sans-semibold text-sm text-foreground">Limits</Text>
        {data.limitations.map((item) => (
          <Text key={item} className="mt-2 font-sans text-xs leading-5 text-foreground-muted">• {item}</Text>
        ))}
      </View>
    </ScrollView>
  );
}
