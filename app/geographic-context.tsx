import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Button from "../components/ui/Button";
import Pill from "../components/ui/Pill";
import { ApiError, apiFetch } from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import { useToast } from "../contexts/ToastContext";

type LocationVisibility = "private" | "country" | "region";

const VISIBILITY_OPTIONS: { value: LocationVisibility; label: string; description: string }[] = [
  { value: "private", label: "Private", description: "Used as personal context only. Nothing is shown on your public profile." },
  { value: "country", label: "Country", description: "Show your country on your public profile." },
  { value: "region", label: "Country + region", description: "Show your country and user-provided region on your public profile." },
];

export default function GeographicContextScreen() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === "1";
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const { showToast } = useToast();
  const [country, setCountry] = useState(user?.country_code ?? "");
  const [region, setRegion] = useState(user?.region ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [visibility, setVisibility] = useState<LocationVisibility>(user?.location_visibility ?? "private");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/user", {
        method: "PUT",
        body: {
          country_code: country.trim().toUpperCase() || null,
          region: region.trim() || null,
          city: city.trim() || null,
          location_visibility: visibility,
        },
      });
      await refreshMe();
      showToast({ title: "Geographic context updated", message: visibility === "private" ? "Your location remains private." : "Your public location display follows your visibility choice.", tone: "success" });
      if (isOnboarding) router.replace("/subscription?onboarding=1");
    } catch (error) {
      showToast({ title: "Location context not saved", message: error instanceof ApiError ? error.message : "Please try again.", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pb-3 pt-14">
        {!isOnboarding && (
          <Pressable onPress={() => router.back()} className="rounded-control p-2" hitSlop={8}>
            <Feather name="chevron-left" size={22} color="#8b91a0" />
          </Pressable>
        )}
        <View className="ml-2 flex-1">
          <Text className="font-sans-semibold text-xl text-foreground">Geographic context</Text>
          <Text className="mt-1 font-sans text-sm text-foreground-muted">Add broad location context without sharing precise device location.</Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-4 pb-12">
        {isOnboarding && (
          <View className="rounded-card border border-accent/20 bg-accent-soft p-4">
            <View className="flex-row items-center gap-2">
              <Feather name="map-pin" size={17} color="#c97412" />
              <Text className="font-sans-semibold text-sm text-foreground">Step 3 of your setup</Text>
            </View>
            <Text className="mt-1.5 font-sans text-xs leading-5 text-foreground-muted">
              Geographic context can improve relevance later. It is user-provided context, not background location tracking.
            </Text>
          </View>
        )}

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Your location context</Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">
            Country, region, and city are stored as profile context. Perception does not request or silently publish your GPS coordinates.
          </Text>

          <View className="mt-4">
            <Text className="mb-1 font-sans-medium text-xs text-foreground-subtle">Country code</Text>
            <TextInput value={country} onChangeText={setCountry} placeholder="KE" placeholderTextColor="#8b91a0" autoCapitalize="characters" maxLength={2} className="rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 font-sans text-foreground" />
          </View>
          <View className="mt-3">
            <Text className="mb-1 font-sans-medium text-xs text-foreground-subtle">Region / county</Text>
            <TextInput value={region} onChangeText={setRegion} placeholder="e.g. Coast" placeholderTextColor="#8b91a0" autoCapitalize="words" className="rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 font-sans text-foreground" />
          </View>
          <View className="mt-3">
            <Text className="mb-1 font-sans-medium text-xs text-foreground-subtle">City / locality</Text>
            <TextInput value={city} onChangeText={setCity} placeholder="e.g. Mombasa" placeholderTextColor="#8b91a0" autoCapitalize="words" className="rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 font-sans text-foreground" />
          </View>
        </View>

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Public profile visibility</Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">Choose exactly how much broad location context your public creator profile may display.</Text>
          <View className="mt-3 gap-2">
            {VISIBILITY_OPTIONS.map((option) => (
              <Pressable key={option.value} onPress={() => setVisibility(option.value)} className={`rounded-control border p-3 ${visibility === option.value ? "border-accent bg-accent-soft" : "border-border-hairline bg-surface-sunken"}`}>
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans-semibold text-sm text-foreground">{option.label}</Text>
                  <Pill label={visibility === option.value ? "Selected" : ""} tone={visibility === option.value ? "accent" : undefined} />
                </View>
                <Text className="mt-1 font-sans text-xs leading-5 text-foreground-muted">{option.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="rounded-card border border-border-hairline bg-surface-sunken p-4">
          <View className="flex-row items-center gap-2"><Feather name="shield" size={16} color="#2f9e62" /><Text className="font-sans-semibold text-sm text-foreground">Privacy boundary</Text></View>
          <Text className="mt-1.5 font-sans text-xs leading-5 text-foreground-muted">
            Precise device location is not collected by this profile setting. City remains private even when country + region are visible publicly.
          </Text>
        </View>

        <Button label={isOnboarding ? "See plans & verification" : "Save geographic context"} variant="accent" loading={saving} onPress={() => void save()} />
      </ScrollView>
    </View>
  );
}
