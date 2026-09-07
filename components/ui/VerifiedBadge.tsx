import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text } from "react-native";

interface VerifiedBadgeProps {
  profession?: string | null;
  compact?: boolean;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function iconForProfession(profession?: string | null): { icon: IconName; symbol?: string } {
  const value = profession?.toLowerCase().trim() ?? "";
  if (/mathematic|mathematics|statistic/.test(value)) return { icon: "function" };
  if (/physic|quantum/.test(value)) return { icon: "atom" };
  if (/chemist|chemistry|laboratory|lab/.test(value)) return { icon: "flask-outline" };
  if (/biolog|microbiolog|genetic|life science/.test(value)) return { icon: "microscope" };
  if (/doctor|physician|medical|nurse|health|clinical/.test(value)) return { icon: "medical-bag" };
  if (/engineer|engineering/.test(value)) return { icon: "cog-outline" };
  if (/developer|software|programmer|computer|technology|tech/.test(value)) return { icon: "code-tags" };
  if (/teacher|educat|lecturer|professor|academic/.test(value)) return { icon: "school-outline" };
  if (/econom|finance|account/.test(value)) return { icon: "chart-line" };
  if (/lawyer|legal|attorney/.test(value)) return { icon: "scale-balance" };
  if (/architect/.test(value)) return { icon: "ruler-square" };
  if (/artist|designer|creative/.test(value)) return { icon: "palette-outline" };
  return { icon: "check-decagram" };
}

export default function VerifiedBadge({ profession, compact = false }: VerifiedBadgeProps) {
  const { icon } = iconForProfession(profession);
  return (
    <View
      className={`flex-row items-center rounded-full border border-accent/30 bg-accent-soft ${compact ? "px-1 py-0.5" : "px-1.5 py-0.5"}`}
      accessibilityLabel={`Verified ${profession || "professional"}`}
    >
      <MaterialCommunityIcons name={icon} size={compact ? 12 : 13} color="#f2a33c" />
      {!compact && <Text className="ml-1 font-sans-medium text-[10px] text-accent">Verified</Text>}
    </View>
  );
}
