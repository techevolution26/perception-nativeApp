import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Spinner from "../components/ui/Spinner";
import Card from "../components/ui/Card";
import useAuthStore from "../store/useAuthStore";
import { apiFetch, getApiErrorMessage } from "../lib/api";

const DEFAULTS = { likes: true, comments: true, follows: true, messages: true, system: true };
const ITEMS: { key: keyof typeof DEFAULTS; title: string; description: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "likes", title: "Likes", description: "When someone likes one of your perceptions.", icon: "heart" },
  { key: "comments", title: "Comments & replies", description: "When someone responds to your perception or replies to your discussion.", icon: "message-circle" },
  { key: "follows", title: "New followers", description: "When another person follows you.", icon: "user-plus" },
  { key: "messages", title: "Messages", description: "When you receive a direct message.", icon: "mail" },
  { key: "system", title: "Perception updates", description: "Important account and platform notifications.", icon: "bell" },
];

export default function NotificationPreferencesScreen() {
  const user = useAuthStore((s) => s.user);
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const me = await apiFetch<{ notification_preferences?: Record<string, boolean> }>("/api/user/preferences");
      setPrefs({ ...DEFAULTS, ...(me.notification_preferences ?? {}) });
    } catch (error) {
      Alert.alert("Could not load preferences", getApiErrorMessage(error));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (user) void Promise.resolve().then(load);
  }, [load, user]);

  const toggle = async (key: keyof typeof DEFAULTS) => {
    const next = !prefs[key];
    setPrefs((current) => ({ ...current, [key]: next }));
    setSaving(key);
    try {
      await apiFetch("/api/user/preferences", { method: "PUT", body: { notification_preferences: { [key]: next } } });
    } catch (error) {
      setPrefs((current) => ({ ...current, [key]: !next }));
      Alert.alert("Could not save", getApiErrorMessage(error));
    } finally { setSaving(null); }
  };

  if (loading) return <View className="flex-1 items-center justify-center bg-background"><Spinner /></View>;
  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} className="rounded-control p-2" hitSlop={8}><Feather name="chevron-left" size={22} color="#8b91a0" /></Pressable>
        <View className="ml-2 flex-1"><Text className="font-sans-semibold text-xl text-foreground">Notification preferences</Text><Text className="mt-1 font-sans text-sm text-foreground-muted">Choose which activity should interrupt your attention.</Text></View>
      </View>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-10">
        <Card className="p-4"><Text className="font-sans-semibold text-base text-foreground">Your attention, your control</Text><Text className="mt-1.5 font-sans text-sm leading-5 text-foreground-muted">These preferences affect future notifications. Turning one off does not delete existing notifications.</Text></Card>
        <Card className="overflow-hidden">
          {ITEMS.map((item, index) => (
            <Pressable key={item.key} onPress={() => void toggle(item.key)} className={`flex-row items-center gap-3 px-4 py-4 ${index ? "border-t border-border-hairline" : ""}`} disabled={saving === item.key}>
              <View className="h-9 w-9 items-center justify-center rounded-full bg-accent-soft"><Feather name={item.icon} size={17} color="#c97412" /></View>
              <View className="flex-1"><Text className="font-sans-medium text-[15px] text-foreground">{item.title}</Text><Text className="mt-0.5 font-sans text-xs leading-4 text-foreground-subtle">{item.description}</Text></View>
              <View className={`h-6 w-11 justify-center rounded-full px-1 ${prefs[item.key] ? "bg-accent" : "bg-surface-sunken"}`}><View className={`h-4 w-4 rounded-full ${prefs[item.key] ? "self-end bg-foreground" : "self-start bg-foreground-subtle"}`} /></View>
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}
