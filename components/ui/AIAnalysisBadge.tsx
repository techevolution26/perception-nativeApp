import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

export function AIAnalysisBadge({
  status,
}: {
  status: "pending" | "analyzed" | "failed" | null | undefined;
}) {
  if (!status) return null;

  const analyzed = status === "analyzed";
  const failed = status === "failed";

  return (
    <View
      className={`flex-row items-center gap-1 rounded-full border px-2 py-1 ${
        analyzed
          ? "border-success/25 bg-success/10"
          : failed
            ? "border-danger/25 bg-danger/10"
            : "border-accent/30 bg-accent-soft"
      }`}
    >
      <Feather
        name={analyzed ? "cpu" : failed ? "alert-circle" : "activity"}
        size={10}
        color={analyzed ? "#2f9e68" : failed ? "#d95d5d" : "#d48a20"}
      />
      <Text
        className={`font-sans-medium text-[9px] uppercase tracking-wider ${
          analyzed ? "text-success" : failed ? "text-danger" : "text-accent-strong"
        }`}
      >
        {analyzed ? "AI analyzed" : failed ? "AI analysis failed" : "AI processing"}
      </Text>
    </View>
  );
}
