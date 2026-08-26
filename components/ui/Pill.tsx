// components/ui/Pill.tsx
import { View, Text } from "react-native";

const TONES = {
  neutral: { bg: "bg-surface-sunken border-border-hairline", text: "text-foreground-muted" },
  accent: { bg: "bg-accent-soft border-accent/25", text: "text-accent-strong" },
} as const;

interface PillProps {
  label: string;
  tone?: keyof typeof TONES;
  className?: string;
}

export default function Pill({ label, tone = "neutral", className = "" }: PillProps) {
  const t = TONES[tone];
  return (
    <View className={`flex-row items-center rounded-pill border px-2.5 py-1 ${t.bg} ${className}`}>
      <Text className={`text-xs font-sans-medium ${t.text}`}>{label}</Text>
    </View>
  );
}
