import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text } from "react-native";

interface VerifiedBadgeProps {
  roleCode?: string | null;
  label?: string | null;
  compact?: boolean;
  verified?: boolean;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const ICONS: Record<string, IconName> = {
  physicist: "atom", mathematician: "function", statistician: "function", chemist: "flask-outline", biologist: "microscope",
  microbiologist: "microscope", geneticist: "atom", research_scientist: "microscope", laboratory_scientist: "flask-outline",
  doctor: "medical-bag", physician: "medical-bag", surgeon: "medical-bag", nurse: "medical-bag", pharmacist: "pill", dentist: "tooth-outline",
  civil_engineer: "office-building", mechanical_engineer: "cog-outline", electrical_engineer: "flash-outline", electronics_engineer: "cog-outline",
  software_engineer: "code-tags", frontend_developer: "code-tags", backend_developer: "server-outline", fullstack_developer: "code-tags",
  mobile_developer: "cellphone", web_developer: "web", devops_engineer: "infinity", cloud_engineer: "cloud-outline", data_engineer: "database-outline",
  data_scientist: "chart-line", ai_ml_engineer: "brain", cybersecurity_specialist: "shield-lock-outline", network_engineer: "lan-connect",
  teacher: "school-outline", lecturer: "school-outline", professor: "school-outline", tutor: "school-outline",
  entrepreneur: "lightbulb-outline", founder: "rocket-launch-outline", ceo: "briefcase-outline", accountant: "calculator",
  economist: "chart-line", lawyer: "scale-balance", advocate: "scale-balance", journalist: "newspaper-variant-outline", writer: "pencil-outline",
  author: "book-open-outline", poet: "format-quote-close", photographer: "camera-outline", filmmaker: "movie-open-outline", graphic_designer: "palette-outline",
  artist: "palette-outline", architect: "ruler-square", farmer: "sprout-outline", agronomist: "sprout-outline", chef: "silverware-fork-knife", pilot: "airplane",
  aviation_specialist: "airplane", seafarer: "ferry", marine_engineer: "ferry", athlete: "run", coach: "bullhorn-outline",
  conservationist: "tree-outline", security_specialist: "shield-outline", security_analyst: "shield-outline", safety_officer: "hard-hat",
  clergy: "church-outline", faith_worker: "church-outline", social_worker: "account-heart-outline",
};

export default function VerifiedBadge({ roleCode, label, compact = false, verified = false }: VerifiedBadgeProps) {
  const icon = ICONS[roleCode ?? ""] ?? "briefcase-outline";
  const text = label ?? "Professional";
  return (
    <View
      className={`flex-row items-center rounded-full border border-accent/30 bg-accent-soft ${compact ? "px-1 py-0.5" : "px-1.5 py-0.5"}`}
      accessibilityLabel={`${text}${verified ? " verified" : " professional"}`}
    >
      <MaterialCommunityIcons name={icon} size={compact ? 12 : 13} color="#f2a33c" />
      {!compact && <Text className="ml-1 font-sans-medium text-[10px] text-accent">{text}{verified ? " · Verified" : ""}</Text>}
    </View>
  );
}
