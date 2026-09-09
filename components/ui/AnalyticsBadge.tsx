import { Text, View } from "react-native";

type BadgeKind = "positive" | "negative" | "neutral" | "warning" | "info" | "strong";

const styles: Record<BadgeKind, { container: string; text: string }> = {
  positive: { container: "bg-success/10 border-success/25", text: "text-success" },
  negative: { container: "bg-danger/10 border-danger/25", text: "text-danger" },
  neutral: { container: "bg-surface-sunken border-border-hairline", text: "text-foreground-muted" },
  warning: { container: "bg-accent-soft border-accent/30", text: "text-accent-strong" },
  info: { container: "bg-accent-soft border-accent/20", text: "text-foreground" },
  strong: { container: "bg-foreground border-foreground", text: "text-background" },
};

export function AnalyticsBadge({ label, kind = "neutral" }: { label: string; kind?: BadgeKind }) {
  const style = styles[kind];
  return (
    <View className={`self-start rounded-full border px-2.5 py-1 ${style.container}`}>
      <Text className={`font-sans-medium text-[10px] uppercase tracking-wider ${style.text}`}>{label}</Text>
    </View>
  );
}

export function sentimentKind(label: string): BadgeKind {
  if (label === "positive") return "positive";
  if (label === "negative") return "negative";
  if (label === "mixed") return "warning";
  return "neutral";
}

export function stanceKind(label: string): BadgeKind {
  if (label === "supportive") return "positive";
  if (label === "challenging") return "negative";
  if (label === "mixed") return "warning";
  return "neutral";
}

export function freshnessKind(status: "current" | "pending" | "stale"): BadgeKind {
  if (status === "current") return "positive";
  if (status === "stale") return "negative";
  return "warning";
}

export function AnalyticsLegend() {
  return (
    <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-2">
      <View className="flex-row items-center gap-1.5"><View className="h-2 w-2 rounded-full bg-success" /><Text className="font-sans text-[10px] text-foreground-subtle">strong/current</Text></View>
      <View className="flex-row items-center gap-1.5"><View className="h-2 w-2 rounded-full bg-accent" /><Text className="font-sans text-[10px] text-foreground-subtle">watch/early</Text></View>
      <View className="flex-row items-center gap-1.5"><View className="h-2 w-2 rounded-full bg-danger" /><Text className="font-sans text-[10px] text-foreground-subtle">caution/change</Text></View>
    </View>
  );
}
