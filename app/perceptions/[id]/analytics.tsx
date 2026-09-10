import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import Spinner from "../../../components/ui/Spinner";
import Button from "../../../components/ui/Button";
import { ApiError, apiFetch } from "../../../lib/api";
import type { PerceptionIntelligence } from "../../../types/models";
import { AnalyticsBadge, AnalyticsLegend, freshnessKind, sentimentKind, stanceKind } from "../../../components/ui/AnalyticsBadge";
import { AIAnalysisBadge } from "../../../components/ui/AIAnalysisBadge";

export default function PerceptionIntelligenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<PerceptionIntelligence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresSubscription, setRequiresSubscription] = useState(false);
  const [decisionIntent, setDecisionIntent] = useState<PerceptionIntelligence["decision_context"]["intent"]>("general_exploration");

  useEffect(() => {
    let mounted = true;

    apiFetch<PerceptionIntelligence>(`/api/analytics/perceptions/${id}?decision_intent=${decisionIntent}`)
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
          Perception analytics is available with an analytics plan. View the
          plans to start a trial or subscribe.
        </Text>
        <View className="mt-2 w-full gap-2">
          <Button
            label="View plans"
            variant="accent"
            onPress={() => router.replace("/subscription")}
          />
          <Button
            label="Go back"
            variant="outline"
            onPress={() => router.back()}
          />
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
        <Button
          label="Go back"
          variant="outline"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-5 pb-12 pt-14"
    >
      <Text className="font-sans-semibold text-2xl text-foreground">
        {data.context.viewer_lens === "author"
          ? "Perception analytics"
          : "Perception intelligence"}
      </Text>
      <Text className="mt-1 font-sans text-sm text-foreground-subtle">
        {data.context.topic_name ? `${data.context.topic_name} · ` : ""}
        {data.context.viewer_lens === "author"
          ? "Your perception's observed performance"
          : "What is happening in this conversation"}{" "}
        · {data.context.period_days} days
      </Text>
      <AnalyticsLegend />

      {data.context.access_tier === "free_teaser" && (
        <View className="mt-4 rounded-card border border-accent/25 bg-accent-soft p-4">
          <View className="flex-row items-center gap-2">
            <Feather name="unlock" size={16} color="#c97412" />
            <Text className="flex-1 font-sans-semibold text-sm text-foreground">Free intelligence preview</Text>
          </View>
          <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
            You are seeing the strongest available conversation insight. Subscribe to unlock deeper professional and geographic perspectives, cross-lens comparisons, conversation-over-time analysis, and fuller decision intelligence.
          </Text>
          <View className="mt-3">
            <Button label="Explore plans" variant="accent" size="sm" onPress={() => router.push("/subscription")} />
          </View>
        </View>
      )}
      <View className="mt-4">
        <Text className="font-sans-medium text-sm text-foreground">
          Decision lens
        </Text>
        <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">
          Change the framing without changing the underlying evidence.
        </Text>
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
                    if (intent !== decisionIntent) setDecisionIntent(intent as PerceptionIntelligence["decision_context"]["intent"]);
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

      <View className="mt-3 rounded-control border border-border-hairline bg-surface p-3">
        <Text className="font-sans-medium text-xs uppercase tracking-wider text-foreground-subtle">
          {data.context.viewer_lens === "author" ? "Creator lens" : "Conversation lens"}
        </Text>
        <Text className="mt-1 font-sans text-sm text-foreground">
          {data.context.viewer_lens === "author"
            ? `${data.context.author.professional_role ?? "No professional identity"}${data.context.author.verified ? " · Verified" : ""}`
            : "Aggregate signals from people who interacted with this perception"}
        </Text>
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

      <View className="mt-4 rounded-card border border-success/20 bg-success/5 p-4">
        <View className="flex-row items-center gap-2">
          <AIAnalysisBadge status="analyzed" />
          <Text className="flex-1 font-sans text-xs leading-5 text-foreground-muted">
            The semantic patterns and signals below are derived from responses carrying this badge. Responses still marked as processing are not counted as analyzed evidence.
          </Text>
        </View>
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
        {data.quality.status === "available" ? (
          <>
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
            <Text className="mt-3 font-sans text-xs leading-5 text-foreground-subtle">
              Quality is a processing indicator, not statistical confidence or proof that the underlying conversation is representative.
            </Text>
          </>
        ) : null}
      </View>

      <View className="mt-6 flex-row flex-wrap gap-3">
        {(data.context.viewer_lens === "author"
          ? [
              ["Likes", data.measurements.likes.value],
              ["Comments", data.measurements.comments.value],
              ["Views", data.measurements.views.value],
              ["Shares", data.measurements.shares.value],
              ["Participants", data.audience.unique_participants],
            ]
          : [
              ["Comments", data.measurements.comments.value],
              ["Participants", data.audience.unique_participants],
            ]
        ).map(([label, value]) => (
          <View
            key={String(label)}
            className="w-[47%] rounded-card border border-border-hairline bg-surface p-4"
          >
            <Text className="font-mono text-2xl text-foreground">{value}</Text>
            <Text className="mt-1 font-sans text-xs uppercase tracking-wider text-foreground-subtle">
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Where the conversation came from
        </Text>
        {data.audience.breakdown.countries.length === 0 ? (
          <Text className="mt-2 font-sans text-sm text-foreground-subtle">
            No geographic interaction data yet.
          </Text>
        ) : (
          data.audience.breakdown.countries.map((item) => (
            <View
              key={item.country_code}
              className="flex-row justify-between border-b border-border-hairline py-3"
            >
              <Text className="font-sans text-foreground">
                {item.country_code}
              </Text>
              <Text className="font-mono text-foreground-muted">
                {item.participants}
              </Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Regional audience
        </Text>
        {data.audience.breakdown.regions.length === 0 ? (
          <Text className="mt-2 font-sans text-sm text-foreground-subtle">
            {data.audience.breakdown.available
              ? "No regional interaction data yet."
              : `Need at least ${data.audience.breakdown.minimum} unique participants for an audience breakdown.`}
          </Text>
        ) : (
          data.audience.breakdown.regions.map((item) => (
            <View
              key={item.region}
              className="flex-row justify-between border-b border-border-hairline py-3"
            >
              <Text className="flex-1 font-sans text-foreground">
                {item.region}
              </Text>
              <Text className="font-mono text-foreground-muted">
                {item.participants}
              </Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Professional perspectives
        </Text>
        {data.audience.breakdown.professional_roles.length === 0 ? (
          <Text className="mt-2 font-sans text-sm text-foreground-subtle">
            Not enough unique participants for a professional breakdown yet.
          </Text>
        ) : (
          data.audience.breakdown.professional_roles.map((item) => (
            <View
              key={item.role_code}
              className="flex-row justify-between border-b border-border-hairline py-3"
            >
              <Text className="flex-1 font-sans text-foreground">
                {item.role_label}
              </Text>
              <Text className="font-mono text-foreground-muted">
                {item.participants}
              </Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Verified professional perspectives
        </Text>
        {data.audience.breakdown.verified_professional_roles.length === 0 ? (
          <Text className="mt-2 font-sans text-sm text-foreground-subtle">
            No verified professional-role signal is available yet.
          </Text>
        ) : (
          data.audience.breakdown.verified_professional_roles.map((item) => (
            <View
              key={item.role_code}
              className="flex-row justify-between border-b border-border-hairline py-3"
            >
              <Text className="flex-1 font-sans text-foreground">
                {item.role_label}
              </Text>
              <Text className="font-mono text-foreground-muted">
                {item.participants}
              </Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Semantic intelligence
        </Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
          {data.semantic.note}
        </Text>
        <View className="mt-3 rounded-control bg-background px-3 py-2">
          <Text className="font-sans-medium text-xs uppercase tracking-wider text-foreground-subtle">
            Status
          </Text>
          <Text className="mt-1 font-sans text-sm text-foreground">
            {data.semantic.status === "available"
              ? "Available"
              : "Insufficient sample"}
          </Text>
          <Text className="mt-1 font-sans text-xs text-foreground-subtle">
            {data.semantic.analyzed_comment_count} of {data.semantic.sample_minimum}{" "}
            minimum analyzed comments
          </Text>
        </View>

        {data.semantic.status === "available" && (
          <>
            <View className="mt-4">
              <Text className="font-sans-medium text-sm text-foreground">
                Sentiment
              </Text>
              {data.semantic.sentiment_distribution.map((item) => (
                <View key={item.label} className="mt-2 flex-row items-center justify-between gap-3">
                  <AnalyticsBadge label={item.label} kind={sentimentKind(item.label)} />
                  <Text className="font-mono text-sm text-foreground-muted">{Math.round(item.share * 100)}% · n={item.comments}</Text>
                </View>
              ))}
            </View>

            <View className="mt-4">
              <Text className="font-sans-medium text-sm text-foreground">
                Stance
              </Text>
              {data.semantic.stance_distribution.map((item) => (
                <View key={item.label} className="mt-2 flex-row items-center justify-between gap-3">
                  <AnalyticsBadge label={item.label} kind={stanceKind(item.label)} />
                  <Text className="font-mono text-sm text-foreground-muted">{Math.round(item.share * 100)}% · n={item.comments}</Text>
                </View>
              ))}
            </View>

            <View className="mt-4">
              <Text className="font-sans-medium text-sm text-foreground">
                Themes
              </Text>
              {data.semantic.top_themes.map((item) => (
                <View
                  key={item.theme}
                  className="mt-2 flex-row justify-between"
                >
                  <Text className="flex-1 font-sans text-sm text-foreground-muted">
                    {item.theme}
                  </Text>
                  <Text className="font-mono text-sm text-foreground-muted">
                    {Math.round(item.share * 100)}%
                  </Text>
                </View>
              ))}
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              <View className="rounded-control bg-background px-3 py-2">
                <Text className="font-sans text-xs text-foreground-muted">
                  Questions
                </Text>
                <Text className="mt-1 font-mono text-base text-foreground">
                  {data.semantic.question_count}
                </Text>
              </View>
              {data.semantic.quality_score !== null && (
                <View className="rounded-control bg-background px-3 py-2">
                  <Text className="font-sans text-xs text-foreground-muted">
                    Analysis quality
                  </Text>
                  <Text className="mt-1 font-mono text-base text-foreground">
                    {Math.round(data.semantic.quality_score * 100)}%
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Professional × geographic intelligence
        </Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
          {data.perspectives.note}
        </Text>
        <Text className="mt-2 font-sans text-xs text-foreground-subtle">
          {data.perspectives.analyzed_comment_count} analyzed comments · minimum {data.perspectives.sample_minimum} per cohort
        </Text>

        {data.perspectives.status === "insufficient_sample" ? (
          <Text className="mt-4 font-sans text-sm text-foreground-subtle">
            More analyzed comments are needed before cohort-level semantic comparisons can be shown.
          </Text>
        ) : (
          <>
            {data.perspectives.cross_lens.length > 0 && (
              <View className="mt-4">
                <Text className="font-sans-medium text-sm text-foreground">
                  Professional + region cohorts
                </Text>
                {data.perspectives.cross_lens.map((item) => (
                  <View key={`${item.role_code}-${item.geography}`} className="mt-3 rounded-control bg-background p-3">
                    <View className="flex-row justify-between gap-3">
                      <Text className="flex-1 font-sans-medium text-sm text-foreground">
                        {item.role_label} · {item.geography}
                      </Text>
                      <Text className="font-mono text-xs text-foreground-muted">
                        n={item.sample_size}
                      </Text>
                    </View>
                    {item.stance_distribution[0] && (
                      <Text className="mt-2 font-sans text-xs text-foreground-muted">
                        Leading stance: {item.stance_distribution[0].label} ({Math.round(item.stance_distribution[0].share * 100)}%)
                      </Text>
                    )}
                    {item.top_themes[0] && (
                      <Text className="mt-1 font-sans text-xs text-foreground-muted">
                        Leading theme: {item.top_themes[0].theme}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {data.perspectives.professional.length > 0 && (
              <View className="mt-5">
                <Text className="font-sans-medium text-sm text-foreground">
                  Professional perspectives
                </Text>
                {data.perspectives.professional.slice(0, 5).map((item) => (
                  <View key={item.role_code} className="mt-3 flex-row justify-between border-b border-border-hairline pb-3">
                    <Text className="flex-1 font-sans text-sm text-foreground">
                      {item.role_label}
                    </Text>
                    <Text className="font-mono text-xs text-foreground-muted">
                      n={item.sample_size}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {data.perspectives.geographic.length > 0 && (
              <View className="mt-5">
                <Text className="font-sans-medium text-sm text-foreground">
                  Geographic perspectives
                </Text>
                {data.perspectives.geographic.slice(0, 5).map((item) => (
                  <View key={item.geography} className="mt-3 flex-row justify-between border-b border-border-hairline pb-3">
                    <Text className="flex-1 font-sans text-sm text-foreground">
                      {item.geography}
                    </Text>
                    <Text className="font-mono text-xs text-foreground-muted">
                      n={item.sample_size}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Cross-lens comparison
        </Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
          {data.cross_lens_analysis.note}
        </Text>
        {data.cross_lens_analysis.status === "insufficient_comparison" ? (
          <Text className="mt-3 font-sans text-sm text-foreground-subtle">
            More qualifying cohorts are needed before convergence or divergence can be compared.
          </Text>
        ) : (
          <>
            {data.cross_lens_analysis.convergence.length > 0 && (
              <View className="mt-4">
                <Text className="font-sans-medium text-sm text-foreground">Convergence</Text>
                {data.cross_lens_analysis.convergence.slice(0, 5).map((item, index) => (
                  <View key={`convergence-${item.dimension}-${item.cohort_a}-${item.cohort_b}-${index}`} className="mt-3 rounded-control bg-background p-3">
                    <View className="flex-row justify-between gap-3">
                      <Text className="flex-1 font-sans-medium text-sm text-foreground">
                        {item.cohort_a} ↔ {item.cohort_b}
                      </Text>
                      <Text className="font-mono text-xs text-foreground-muted">
                        n={item.sample_size_a}/{item.sample_size_b}
                      </Text>
                    </View>
                    <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">
                      {item.description}
                    </Text>
                    {item.shared_themes.length > 0 && (
                      <Text className="mt-1 font-sans text-xs text-foreground-subtle">
                        Shared themes: {item.shared_themes.join(", ")}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            {data.cross_lens_analysis.divergence.length > 0 && (
              <View className="mt-5">
                <Text className="font-sans-medium text-sm text-foreground">Divergence</Text>
                {data.cross_lens_analysis.divergence.slice(0, 5).map((item, index) => (
                  <View key={`divergence-${item.dimension}-${item.cohort_a}-${item.cohort_b}-${index}`} className="mt-3 rounded-control bg-background p-3">
                    <View className="flex-row justify-between gap-3">
                      <Text className="flex-1 font-sans-medium text-sm text-foreground">
                        {item.cohort_a} ↔ {item.cohort_b}
                      </Text>
                      <Text className="font-mono text-xs text-foreground-muted">
                        n={item.sample_size_a}/{item.sample_size_b}
                      </Text>
                    </View>
                    <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">
                      {item.description}
                    </Text>
                    {item.shared_themes.length > 0 && (
                      <Text className="mt-1 font-sans text-xs text-foreground-subtle">
                        Shared themes: {item.shared_themes.join(", ")}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Conversation over time
        </Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
          {data.temporal.note}
        </Text>
        {data.temporal.status === "insufficient_sample" ? (
          <Text className="mt-3 font-sans text-sm text-foreground-subtle">
            No qualifying time window is available yet.
          </Text>
        ) : (
          <>
            {data.temporal.buckets.filter((bucket) => bucket.status === "available").slice(-6).map((bucket) => {
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
                  <Text className="mt-2 font-sans text-xs text-foreground-muted">
                    Leading stance: {stance}
                  </Text>
                  <Text className="mt-1 font-sans text-xs text-foreground-muted">
                    Leading theme: {theme}
                  </Text>
                  <Text className="mt-1 font-sans text-xs text-foreground-subtle">
                    Questions: {bucket.question_count}
                  </Text>
                </View>
              );
            })}
            {data.temporal.changes.length > 0 && (
              <View className="mt-5">
                <Text className="font-sans-medium text-sm text-foreground">Observed changes</Text>
                {data.temporal.changes.slice(-5).map((change) => (
                  <View key={`${change.from_period_start}-${change.to_period_end}`} className="mt-3 rounded-control bg-background p-3">
                    <Text className="font-sans text-sm leading-5 text-foreground-muted">
                      {change.stance_changed ? `Leading stance changed from ${change.leading_stance_from ?? "unknown"} to ${change.leading_stance_to ?? "unknown"}.` : "Leading stance remained the same."} {change.theme_changed ? `Leading theme changed from ${change.leading_theme_from ?? "unknown"} to ${change.leading_theme_to ?? "unknown"}.` : "Leading theme remained the same."}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="font-sans-semibold text-base text-foreground">Evidence governance</Text>
          <AnalyticsBadge label={data.evidence_governance.status} kind={data.evidence_governance.status === "eligible" ? "strong" : data.evidence_governance.status === "provisional" ? "warning" : "negative"} />
        </View>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">Patterns: {data.evidence_governance.patterns_eligible ? "eligible" : "restricted"} · Signals: {data.evidence_governance.signals_eligible ? "eligible" : "restricted"}</Text>
        {data.evidence_governance.reasons.slice(0, 4).map((reason) => <Text key={reason} className="mt-2 font-sans text-xs leading-5 text-foreground-subtle">• {reason}</Text>)}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="font-sans-semibold text-base text-foreground">Semantic model governance</Text>
          <AnalyticsBadge label={data.semantic_model_governance.status.replace("_", " ")} kind={data.semantic_model_governance.status === "stable" ? "strong" : data.semantic_model_governance.status === "review_required" ? "warning" : "neutral"} />
        </View>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">Latest: {data.semantic_model_governance.latest_model_version ?? "unknown"} · baseline: {data.semantic_model_governance.baseline_model_version ?? "none"}</Text>
        <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">{data.semantic_model_governance.note}</Text>
        {data.semantic_model_governance.distribution_shifts.map((item) => <Text key={String(item.dimension)} className="mt-2 font-mono text-[10px] text-foreground-subtle">{String(item.dimension)} · {item.max_distribution_shift !== undefined ? `shift ${item.max_distribution_shift}` : `theme overlap ${item.top_theme_overlap}`}</Text>)}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Evidence provenance
        </Text>
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
          <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">
            {data.provenance.qualification}
          </Text>
        </View>
        {data.provenance.limitations.slice(0, 3).map((item) => (
          <Text key={item} className="mt-2 font-sans text-xs leading-5 text-foreground-subtle">
            • {item}
          </Text>
        ))}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Observed patterns
        </Text>
        {data.patterns.length === 0 ? (
          <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
            Patterns are withheld until the semantic evidence reaches the minimum sample.
          </Text>
        ) : (
          data.patterns.map((item) => (
            <View key={item.label} className="mt-3 rounded-control bg-background p-3">
              <AnalyticsBadge label="Observed pattern" kind="info" />
              <Text className="mt-2 font-sans-medium text-sm text-foreground">{item.label}</Text>
              <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">
                {item.description}
              </Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Observed signals
        </Text>
        {data.signals.length === 0 ? (
          <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
            No evidence-backed signals are qualified yet.
          </Text>
        ) : (
          data.signals.map((item) => (
            <View key={item.label} className="mt-3 rounded-control bg-background p-3">
              <View className="flex-row items-center justify-between gap-3">
                <AnalyticsBadge label="Observed signal" kind="warning" />
                <Text className="flex-1 font-sans-medium text-sm text-foreground">{item.label}</Text>
                <Text className="font-mono text-xs text-foreground-muted">n={item.sample_size}</Text>
              </View>
              <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">
                {item.description}
              </Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Decision intelligence
        </Text>
        <Text className="mt-1 font-sans text-sm capitalize text-foreground-subtle">
          {data.decision_context.intent.split("_").join(" ")} · {data.decision_context.status.replace("_", " ")}
        </Text>
        <Text className="mt-3 font-sans text-sm leading-5 text-foreground">
          {data.decision_context.summary}
        </Text>

        {data.decision_context.observations.length > 0 && (
          <View className="mt-4">
            <Text className="font-sans-medium text-sm text-foreground">
              Evidence-backed observations
            </Text>
            {data.decision_context.observations.slice(0, 6).map((item) => (
              <View key={`${item.title}-${item.evidence_source}`} className="mt-3 rounded-control bg-background p-3">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 font-sans-medium text-sm text-foreground">
                    {item.title}
                  </Text>
                  <Text className="font-mono text-xs text-foreground-muted">
                    n={item.sample_size}
                  </Text>
                </View>
                <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">
                  {item.description}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className="mt-4">
          <Text className="font-sans-medium text-sm text-foreground">
            How to use this lens
          </Text>
          {data.decision_context.considerations.map((item) => (
            <View key={item.title} className="mt-2">
              <Text className="font-sans-medium text-xs text-foreground">
                {item.title}
              </Text>
              <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">
                {item.description}
              </Text>
            </View>
          ))}
        </View>

        <View className="mt-4 rounded-control bg-background p-3">
          <Text className="font-sans text-xs leading-5 text-foreground-subtle">
            {data.decision_context.guardrail}
          </Text>
        </View>
      </View>

      <View className="mt-5 rounded-card border border-border-hairline bg-surface p-4">
        <Text className="font-sans-semibold text-base text-foreground">
          Methodology
        </Text>
        {data.methodology.rules.map((item) => (
          <Text
            key={item}
            className="mt-2 font-sans text-sm leading-5 text-foreground-muted"
          >
            • {item}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}
