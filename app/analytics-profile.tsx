import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import Button from "../components/ui/Button";
import Pill from "../components/ui/Pill";
import { apiFetch, ApiError } from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import type { Subscription, Topic, UserMe } from "../types/models";

export default function AnalyticsProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [focus, setFocus] = useState(user?.professional_focus ?? "");
  const [country, setCountry] = useState(user?.country_code ?? "");
  const [region, setRegion] = useState(user?.region ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [primary, setPrimary] = useState<number | null>(user?.primary_analytics_topic_id ?? null);
  const [selected, setSelected] = useState<number[]>(user?.analytics_specialties ?? []);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [topicData, sub] = await Promise.all([
        apiFetch<{ topics: Topic[] }>("/api/topics", { auth: false }),
        apiFetch<Subscription>("/api/subscription"),
      ]);
      setTopics(topicData.topics);
      setSubscription(sub);
    } catch {
      Alert.alert("Unable to load analytics profile", "Please try again.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user) {
      setFocus(user.professional_focus ?? "");
      setCountry(user.country_code ?? "");
      setRegion(user.region ?? "");
      setCity(user.city ?? "");
      setPrimary(user.primary_analytics_topic_id ?? null);
      setSelected(user.analytics_specialties ?? []);
    }
  }, [user]);

  const toggleTopic = (id: number) => {
    const max = subscription?.max_topics || 0;
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= max) {
        Alert.alert("Topic limit reached", `Your plan supports ${max} analytics topics.`);
        return current;
      }
      return [...current, id];
    });
  };

  const save = async () => {
    if (!subscription?.analytics_enabled) {
      router.push("/subscription");
      return;
    }

    if (primary !== null && !selected.includes(primary)) {
      setSelected((current) => [primary, ...current].slice(0, subscription.max_topics));
    }

    setSaving(true);
    try {
      await apiFetch<UserMe>("/api/user/analytics-profile", {
        method: "PUT",
        body: {
          professional_focus: focus.trim() || null,
          country_code: country.trim().toUpperCase() || null,
          region: region.trim() || null,
          city: city.trim() || null,
          primary_analytics_topic_id: primary,
          analytics_specialties: Array.from(new Set(primary ? [primary, ...selected] : selected)),
        },
      });
      await refreshMe();
      Alert.alert("Saved", "Your analytics profile has been updated.");
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.body === "object" && error.body !== null
          ? String((error.body as { detail?: unknown }).detail ?? "Please try again.")
          : "Please try again.";
      Alert.alert("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} className="rounded-control p-2" hitSlop={8}>
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="ml-2 flex-1">
          <Text className="font-sans-semibold text-xl text-foreground">Analytics profile</Text>
          <Text className="font-sans text-sm text-foreground-muted">
            Tell Perception where your expertise is strongest.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-4 pb-12">
        {!subscription?.analytics_enabled && (
          <View className="rounded-card border border-accent/30 bg-accent-soft p-4">
            <Text className="font-sans-semibold text-base text-foreground">Analytics is locked</Text>
            <Text className="mt-1 font-sans text-sm text-foreground-muted">
              Subscribe to manage your analytics topics and use the analytics dashboard.
            </Text>
            <Button label="View plans" variant="accent" size="sm" onPress={() => router.push("/subscription")} />
          </View>
        )}

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Professional identity</Text>
          {[
            ["Primary focus", focus, setFocus, "e.g. consumer research"],
            ["Country code", country, setCountry, "KE"],
            ["Region", region, setRegion, "e.g. Coast"],
            ["City", city, setCity, "e.g. Mombasa"],
          ].map(([label, value, setter, placeholder]) => (
            <View key={label as string} className="mt-3">
              <Text className="mb-1 font-sans-medium text-xs text-foreground-subtle">{label as string}</Text>
              <TextInput
                value={value as string}
                onChangeText={setter as (text: string) => void}
                placeholder={placeholder as string}
                placeholderTextColor="#8b91a0"
                className="rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 font-sans text-foreground"
              />
            </View>
          ))}
        </View>

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Primary analytics topic</Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">
            Choose the one field where you want the strongest analytics context.
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {topics.map((topic) => (
              <Pressable key={topic.id} onPress={() => setPrimary(topic.id)}>
                <Pill label={topic.name} tone={primary === topic.id ? "accent" : undefined} />
              </Pressable>
            ))}
          </View>
        </View>

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">
            Analytics topics ({selected.length}/{subscription?.max_topics ?? 0})
          </Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-foreground-subtle">
            You can work across multiple fields. Your primary topic remains the strongest lens.
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {topics.map((topic) => (
              <Pressable key={topic.id} onPress={() => toggleTopic(topic.id)}>
                <Pill label={topic.name} tone={selected.includes(topic.id) ? "accent" : undefined} />
              </Pressable>
            ))}
          </View>
        </View>

        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Verification</Text>
          <Text className="mt-1 font-sans text-sm text-foreground-muted">
            Status: {user.verification_status.replace("_", " ").toLowerCase()}
            {user.verification_badge ? ` ${user.verification_badge}` : ""}
          </Text>
          {subscription?.verification_included && (
            <Button
              label={user.verification_status === "VERIFIED" ? "Verification active" : "Apply for verification"}
              variant="outline"
              size="sm"
              disabled={user.verification_status === "VERIFIED"}
              onPress={() => router.push("/verification")}
            />
          )}
        </View>

        <Button label={saving ? "Saving…" : "Save analytics profile"} variant="accent" loading={saving} onPress={save} />
      </ScrollView>
    </View>
  );
}
