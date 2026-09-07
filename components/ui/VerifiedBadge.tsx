import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface VerifiedBadgeProps {
  badge?: string | null;
  compact?: boolean;
}

export default function VerifiedBadge({ badge, compact = false }: VerifiedBadgeProps) {
  return (
    <View
      className={`flex-row items-center rounded-full border border-accent/30 bg-accent-soft ${compact ? "gap-1 px-1.5 py-0.5" : "gap-1.5 px-2 py-1"}`}
      accessibilityLabel={badge ? `Verified professional: ${badge}` : "Verified professional"}
    >
      <Feather name="check" size={compact ? 10 : 11} color="#b56b13" />
      {!compact && badge ? <Text className="font-sans-medium text-[10px] text-foreground-muted">{badge}</Text> : null}
    </View>
  );
}
