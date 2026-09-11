import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Card from "../components/ui/Card";

const FAQ = [
  ["What is a Perception?", "A Perception is a proposition or idea under a Topic. People respond to it, and the conversation becomes the evidence from which aggregate perspectives can be understood."],
  ["Why does Perception ask for my professional identity?", "Professional identity provides context for comparing legitimate perspectives. It does not automatically make a response authoritative or verified."],
  ["Why do some intelligence sections disappear?", "Intelligence requires enough qualifying evidence. Perception uses a minimum sample and suppresses unsupported views instead of filling gaps with guesses."],
  ["What does the AI badge mean?", "It identifies a response that has been processed by Perception's controlled semantic analysis system. The analysis is derived from the response and does not replace the response itself."],
  ["Can I skip onboarding?", "Yes. Topic, professional identity and verification setup are designed to be optional. You can return to these areas later from your profile."],
  ["Where should I report a problem?", "For a reproducible technical issue, keep the screen name, what you tapped, what you expected and what actually happened. Avoid sending passwords, tokens or private credentials."],
];

export default function HelpSupportScreen() {
  return <View className="flex-1 bg-background">
    <View className="flex-row items-center px-4 pb-3 pt-14"><Pressable onPress={() => router.back()} className="rounded-control p-2" hitSlop={8}><Feather name="chevron-left" size={22} color="#8b91a0" /></Pressable><View className="ml-2 flex-1"><Text className="font-sans-semibold text-xl text-foreground">Help & support</Text><Text className="mt-1 font-sans text-sm text-foreground-muted">Practical answers for using Perception well.</Text></View></View>
    <ScrollView contentContainerClassName="gap-3 px-4 pb-10">
      <Card className="border-accent/20 bg-accent-soft p-4"><Text className="font-sans-semibold text-base text-foreground">Start with the context.</Text><Text className="mt-1.5 font-sans text-sm leading-5 text-foreground-muted">Perception connects Topics, Perceptions, Responses and Perspectives. Intelligence becomes stronger as qualifying conversation evidence accumulates.</Text></Card>
      {FAQ.map(([title, body]) => <Card key={title} className="p-4"><Text className="font-sans-semibold text-base text-foreground">{title}</Text><Text className="mt-1.5 font-sans text-sm leading-5 text-foreground-muted">{body}</Text></Card>)}
    </ScrollView>
  </View>;
}
