import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Card from "../components/ui/Card";
import useAuthStore from "../store/useAuthStore";
import { apiFetch, ApiError } from "../lib/api";
import { useToast } from "../contexts/ToastContext";

const SECTIONS = [
  [
    "What you share",
    "Your name, profile details, professional identity, perceptions, comments, follows and other activity are shown according to the product surface and permissions. Account credentials are not part of your public profile.",
  ],
  [
    "Professional identity",
    "Selecting a profession or role does not make it verified. Verification is a separate reviewed signal, and a professional label is context rather than automatic authority.",
  ],
  [
    "Intelligence is aggregate",
    "Perception Intelligence works with qualifying groups and conversation evidence. Individual participant identities are not exposed through intelligence aggregates, and city-level aggregate reporting is not exposed.",
  ],
  [
    "AI transparency",
    "AI-assisted semantic processing is a derived layer. Human responses remain the underlying evidence. AI analysis does not turn a discussion into scientific proof, causal evidence, or a prediction.",
  ],
  [
    "Your account controls",
    "You can change your password, notification preferences, professional identity and other profile information from Settings. Verification can be applied for separately when your plan supports it.",
  ],
];

export default function PrivacyScreen() {
  const user = useAuthStore((state) => state.user);
  const refreshMe = useAuthStore((state) => state.refreshMe);
  const { showToast } = useToast();
  const preferences = user?.privacy_preferences ?? {};
  const intelligenceParticipation =
    preferences.intelligence_participation !== false;
  const creatorDiscoverability = preferences.creator_discoverability !== false;

  const updatePreference = async (
    key: "intelligence_participation" | "creator_discoverability",
    value: boolean,
  ) => {
    try {
      await apiFetch("/api/user/preferences", {
        method: "PUT",
        body: { privacy_preferences: { [key]: value } },
      });
      await refreshMe();
      showToast({
        title: "Privacy preference updated",
        message:
          key === "intelligence_participation"
            ? value
              ? "Your qualifying conversation contributions may be included in aggregate intelligence."
              : "Your conversation contributions will be excluded from aggregate intelligence."
            : value
              ? "Your creator profile may appear in contextual discovery."
              : "Your creator profile will be excluded from contextual creator discovery.",
        tone: "success",
      });
    } catch (error) {
      showToast({
        title: "Privacy preference not saved",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        tone: "error",
      });
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pb-3 pt-14">
        <Pressable
          onPress={() => router.back()}
          className="rounded-control p-2"
          hitSlop={8}
        >
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="ml-2 flex-1">
          <Text className="font-sans-semibold text-xl text-foreground">
            Privacy
          </Text>
          <Text className="mt-1 font-sans text-sm text-foreground-muted">
            Understand what Perception shares, protects and derives.
          </Text>
        </View>
      </View>
      <ScrollView contentContainerClassName="gap-3 px-4 pb-10">
        <Card className="border-accent/20 bg-accent-soft p-4">
          <Text className="font-sans-semibold text-base text-foreground">
            A conversation is not a dossier.
          </Text>
          <Text className="mt-1.5 font-sans text-sm leading-5 text-foreground-muted">
            Perception is designed to understand collective perspectives without
            turning individual people into public analytical profiles.
          </Text>
        </Card>
        {SECTIONS.map(([title, body]) => (
          <Card key={title} className="p-4">
            <Text className="font-sans-semibold text-base text-foreground">
              {title}
            </Text>
            <Text className="mt-1.5 font-sans text-sm leading-5 text-foreground-muted">
              {body}
            </Text>
          </Card>
        ))}
        <Pressable
          onPress={() => router.push("/change-password")}
          className="flex-row items-center gap-3 rounded-card border border-border-hairline bg-surface px-4 py-3.5"
        >
          <Feather name="key" size={17} color="#8b91a0" />
          <Text className="flex-1 font-sans-medium text-[15px] text-foreground">
            Open account security
          </Text>
          <Feather name="chevron-right" size={17} color="#8b91a0" />
        </Pressable>
      </ScrollView>
    </View>
  );
}
