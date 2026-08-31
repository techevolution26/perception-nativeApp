// components/SettingsPanel.tsx
import { View, Text, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Card from "./ui/Card";
import useSettingsStore, { type ThemePreference } from "../store/useSettingsStore";
import useAuthStore from "../store/useAuthStore";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "smartphone" },
];

// Clearly-labeled "coming soon" rows rather than silent dead taps — an
// empty settings screen undersells what's planned, but a row that looks
// interactive and does nothing is worse.
const UPCOMING_SETTINGS: { label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { label: "Notification preferences", icon: "bell" },
  { label: "Privacy", icon: "lock" },
  { label: "Help & support", icon: "help-circle" },
  { label: "About Perception", icon: "info" },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-6 px-1 font-sans-medium text-xs uppercase tracking-wide text-foreground-subtle first:mt-0">
      {children}
    </Text>
  );
}

export default function SettingsPanel() {
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert("Log out?", "You can always sign back in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  return (
    <View className="px-4 pb-10">
      <SectionLabel>Appearance</SectionLabel>
      <Card className="flex-row overflow-hidden p-1">
        {THEME_OPTIONS.map((opt) => {
          const active = themePreference === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setThemePreference(opt.value)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-control py-2.5 ${active ? "bg-accent-soft" : ""}`}
            >
              <Feather name={opt.icon} size={15} color={active ? "#c97412" : "#8b91a0"} />
              <Text className={`font-sans-medium text-sm ${active ? "text-accent-strong" : "text-foreground-muted"}`}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </Card>

      <SectionLabel>More settings</SectionLabel>
      <Card className="overflow-hidden">
        {UPCOMING_SETTINGS.map((item, i) => (
          <View
            key={item.label}
            className={`flex-row items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border-hairline" : ""}`}
          >
            <Feather name={item.icon} size={17} color="#8b91a0" />
            <Text className="flex-1 font-sans text-[15px] text-foreground-muted">{item.label}</Text>
            <View className="rounded-pill bg-surface-sunken px-2 py-0.5">
              <Text className="font-sans-medium text-[10px] uppercase tracking-wide text-foreground-subtle">Soon</Text>
            </View>
          </View>
        ))}
      </Card>

      <SectionLabel>Account</SectionLabel>
      <Pressable
        onPress={handleLogout}
        className="flex-row items-center gap-3 rounded-card border border-danger/25 bg-danger/5 px-4 py-3.5"
      >
        <Feather name="log-out" size={17} color="#e5484d" />
        <Text className="font-sans-medium text-[15px] text-danger">Log out</Text>
      </Pressable>
    </View>
  );
}
