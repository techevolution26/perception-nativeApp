// app/+not-found.tsx
import { View, Text } from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VantageMark from "../components/ui/VantageMark";

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-6" style={{ paddingTop: insets.top }}>
      <VantageMark size={30} color="#8b91a0" />
      <Text className="font-sans-semibold text-lg text-foreground">This screen doesn&rsquo;t exist.</Text>
      <Link href="/(tabs)">
        <Text className="font-sans-medium text-accent">Go to home</Text>
      </Link>
    </View>
  );
}
