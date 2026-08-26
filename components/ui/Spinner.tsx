// components/ui/Spinner.tsx
import { View } from "react-native";
import VantageMark from "./VantageMark";
import { useColorScheme } from "nativewind";

export default function Spinner({ size = 22, className = "" }: { size?: number; className?: string }) {
  const { colorScheme } = useColorScheme();
  return (
    <View className={`items-center justify-center ${className}`}>
      <VantageMark size={size} spinning strokeWidth={1.8} color={colorScheme === "dark" ? "#4a4f5c" : "#8b91a0"} />
    </View>
  );
}
