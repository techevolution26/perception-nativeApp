// components/ui/Pill.tsx
import { View, Text } from "react-native";

const TONES = {
  neutral: { bg: "bg-surface-sunken border-border-hairline", text: "text-foreground-muted" },
  accent: { bg: "bg-accent-soft border-accent/25", text: "text-accent-strong" },
} as const;

interface PillProps {
  label: string;
  tone?: keyof typeof TONES;
  color?: string;
  className?: string;
}

export default function Pill({ label, tone = "neutral", color, className = "" }: PillProps) {
  const t = TONES[tone];
  const colored = Boolean(color);
  return (
    <View
      className={`flex-row items-center rounded-pill border px-2.5 py-1 ${colored ? "" : t.bg} ${className}`}
      style={colored ? { backgroundColor: `${color}14`, borderColor: `${color}40` } : undefined}
    >
      <Text
        className={`text-xs font-sans-medium ${colored ? "" : t.text}`}
        style={colored ? { color } : undefined}
      >
        {label}
      </Text>
    </View>
  );
}
