import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Card from "../components/ui/Card";
import VantageMark from "../components/ui/VantageMark";

const ITEMS = [
  ["The idea", "Every topic looks different from where you stand. Perception gives those different vantage points a structured place to meet."],
  ["The model", "Topic → Perception → Response → Lens → Pattern → Signal → Decision Context."],
  ["The intelligence layer", "Perception Intelligence helps people understand what happened in a conversation, what perspectives appear, where they converge or diverge, and what deserves further investigation."],
  ["The boundary", "Observed conversation patterns are not automatically representative of a population. They do not establish causation, clinical truth or prediction."],
  ["The long-term vision", "Perception is being built as a social-to-intelligence ecosystem: Social → Conversation → Perception → Perspective → Intelligence → Decision Support."],
];

export default function AboutScreen() {
  return <View className="flex-1 bg-background">
    <View className="flex-row items-center px-4 pb-3 pt-14"><Pressable onPress={() => router.back()} className="rounded-control p-2" hitSlop={8}><Feather name="chevron-left" size={22} color="#8b91a0" /></Pressable><View className="ml-2 flex-1"><Text className="font-sans-semibold text-xl text-foreground">About Perception</Text><Text className="mt-1 font-sans text-sm text-foreground-muted">Why the product is built the way it is.</Text></View></View>
    <ScrollView contentContainerClassName="gap-3 px-4 pb-10">
      <Card className="items-center border-accent/20 bg-accent-soft p-6"><View className="mb-3 h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-background"><VantageMark size={28} /></View><Text className="font-sans-bold text-2xl text-foreground">Perception</Text><Text className="mt-1 text-center font-sans text-sm text-foreground-muted">Different vantage points. One structured conversation.</Text></Card>
      {ITEMS.map(([title, body]) => <Card key={title} className="p-4"><Text className="font-sans-semibold text-base text-foreground">{title}</Text><Text className="mt-1.5 font-sans text-sm leading-5 text-foreground-muted">{body}</Text></Card>)}
    </ScrollView>
  </View>;
}
