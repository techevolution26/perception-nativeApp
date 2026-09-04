import Spinner from "../components/ui/Spinner";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import Button from "../components/ui/Button";
import Pill from "../components/ui/Pill";
import { ApiError, apiFetch } from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import type { Topic, VerificationApplication } from "../types/models";

export default function VerificationScreen() {
  const user = useAuthStore((s) => s.user);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [application, setApplication] = useState<VerificationApplication | null>(null);
  const [profession, setProfession] = useState(user?.profession ?? "");
  const [focus, setFocus] = useState(user?.professional_focus ?? "");
  const [primary, setPrimary] = useState<number | null>(user?.primary_analytics_topic_id ?? null);
  const [selected, setSelected] = useState<number[]>(user?.analytics_specialties ?? []);
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [topicData, app] = await Promise.all([
        apiFetch<{ topics: Topic[] }>("/api/topics", { auth: false }),
        apiFetch<VerificationApplication | null>("/api/verification/me"),
      ]);
      setTopics(topicData.topics);
      setApplication(app);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        Alert.alert("Verification requires the right plan", "Choose a plan that includes professional verification.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleTopic = (id: number) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = async () => {
    if (!profession.trim() || !focus.trim()) {
      Alert.alert("Complete your profile", "Profession and focus are required.");
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch<VerificationApplication>("/api/verification/applications", {
        method: "POST",
        body: {
          profession: profession.trim(),
          focus: focus.trim(),
          primary_topic_id: primary,
          requested_topic_ids: Array.from(new Set(primary ? [primary, ...selected] : selected)),
          evidence: evidence.trim() || null,
        },
      });
      setApplication(result);
      Alert.alert("Application submitted", "Your verification application is now under review.");
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.body === "object" && error.body !== null
          ? String((error.body as { detail?: unknown }).detail ?? "Please try again.")
          : "Please try again.";
      Alert.alert("Could not submit", message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View className="flex-1 items-center justify-center bg-background"><Spinner /></View>;
  }

  if (!user) return null;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} className="rounded-control p-2" hitSlop={8}>
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="ml-2 flex-1">
          <Text className="font-sans-semibold text-xl text-foreground">Professional verification</Text>
          <Text className="font-sans text-sm text-foreground-muted">
            Connect your professional focus to the analytics you use.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-4 pb-12">
        {application ? (
          <View className="rounded-card border border-border-hairline bg-surface p-4">
            <Text className="font-sans-semibold text-base text-foreground">
              Application {application.status.toLowerCase()}
            </Text>
            <Text className="mt-2 font-sans text-sm text-foreground-muted">
              {application.profession} · {application.focus}
            </Text>
            {application.badge && (
              <Text className="mt-3 text-3xl">{application.badge}</Text>
            )}
            {application.reviewer_note && (
              <Text className="mt-2 font-sans text-sm text-foreground-muted">
                {application.reviewer_note}
              </Text>
            )}
          </View>
        ) : (
          <>
            <View className="rounded-card border border-border-hairline bg-surface p-4">
              <Text className="font-sans-semibold text-base text-foreground">Your professional area</Text>
              <TextInput
                value={profession}
                onChangeText={setProfession}
                placeholder="Profession"
                placeholderTextColor="#8b91a0"
                className="mt-3 rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 font-sans text-foreground"
              />
              <TextInput
                value={focus}
                onChangeText={setFocus}
                placeholder="Area of need / focus"
                placeholderTextColor="#8b91a0"
                className="mt-3 rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 font-sans text-foreground"
              />
              <TextInput
                value={evidence}
                onChangeText={setEvidence}
                placeholder="Optional evidence or context"
                placeholderTextColor="#8b91a0"
                multiline
                className="mt-3 min-h-[90px] rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 font-sans text-foreground"
              />
            </View>

            <View className="rounded-card border border-border-hairline bg-surface p-4">
              <Text className="font-sans-semibold text-base text-foreground">Primary field</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {topics.map((topic) => (
                  <Pressable key={topic.id} onPress={() => setPrimary(topic.id)}>
                    <Pill label={topic.name} tone={primary === topic.id ? "accent" : undefined} />
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="rounded-card border border-border-hairline bg-surface p-4">
              <Text className="font-sans-semibold text-base text-foreground">Additional analytics fields</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {topics.map((topic) => (
                  <Pressable key={topic.id} onPress={() => toggleTopic(topic.id)}>
                    <Pill label={topic.name} tone={selected.includes(topic.id) ? "accent" : undefined} />
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="rounded-card border border-border-hairline bg-surface-sunken p-4">
              <Text className="font-sans text-xs leading-5 text-foreground-muted">
                Verification is a reviewed professional signal. A badge identifies the approved area;
                it does not certify every statement or turn community observations into scientific proof.
              </Text>
            </View>

            <Button label={saving ? "Submitting…" : "Submit application"} variant="accent" loading={saving} onPress={submit} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
