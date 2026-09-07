import Spinner from "../components/ui/Spinner";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import Button from "../components/ui/Button";
import Pill from "../components/ui/Pill";
import ProfessionalIdentityPicker from "../components/ui/ProfessionalIdentityPicker";
import type { ProfessionalTaxonomy } from "../types/models";
import { ApiError, apiFetch, getApiErrorMessage } from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import type { Topic, VerificationApplication } from "../types/models";

export default function VerificationScreen() {
  const user = useAuthStore((s) => s.user);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [taxonomy, setTaxonomy] = useState<ProfessionalTaxonomy | null>(null);
  const [industries, setIndustries] = useState<string[]>(user?.professional_industries ?? []);
  const [roles, setRoles] = useState<string[]>(user?.professional_roles ?? []);
  const [primaryRole, setPrimaryRole] = useState<string | null>(user?.primary_professional_role ?? null);
  const [application, setApplication] = useState<VerificationApplication | null>(null);
  const [focus, setFocus] = useState(user?.professional_focus ?? "");
  const [primary, setPrimary] = useState<number | null>(user?.primary_analytics_topic_id ?? null);
  const [selected, setSelected] = useState<number[]>(user?.analytics_specialties ?? []);
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [topicData, app, taxonomyData] = await Promise.all([
        apiFetch<{ topics: Topic[] }>("/api/topics", { auth: false }),
        apiFetch<VerificationApplication | null>("/api/verification/me"),
        apiFetch<ProfessionalTaxonomy>("/api/professional-taxonomy", { auth: false }),
      ]);
      setTopics(topicData.topics);
      setApplication(app);
      setTaxonomy(taxonomyData);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        Alert.alert("Verification requires the right plan", "Choose a plan that includes professional verification.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const toggleTopic = (id: number) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = async () => {
    const role = taxonomy?.roles.find((item) => item.code === primaryRole);
    if (!role || !roles.length) {
      Alert.alert("Choose your professional identity", "Select at least one professional role and choose a primary role.");
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch<VerificationApplication>("/api/verification/applications", {
        method: "POST",
        body: {
          profession: role.label,
          focus: focus.trim() || role.label,
          industry_codes: industries,
          professional_role_codes: roles,
          primary_professional_role: primaryRole,
          primary_topic_id: primary,
          requested_topic_ids: Array.from(new Set(primary ? [primary, ...selected] : selected)),
          evidence: evidence.trim() || null,
        },
      });
      setApplication(result);
      Alert.alert("Application submitted", "Your verification application is now under review.");
    } catch (error) {
      Alert.alert("Could not submit", getApiErrorMessage(error, "Please try again."));
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
            Professional identity and verification are separate signals. A plan can make you eligible to apply; only a super administrator can approve verification.
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
              <Text className="font-sans-semibold text-base text-foreground">Professional identity</Text>
              <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">Select your industries and roles instead of typing an unstructured profession. Your primary role determines the leading professional badge.</Text>
              <ProfessionalIdentityPicker
                industries={industries}
                roles={roles}
                primaryRole={primaryRole}
                onChange={(value) => { setIndustries(value.industries); setRoles(value.roles); setPrimaryRole(value.primaryRole); }}
              />
              <Text className="mt-4 mb-1 font-sans-medium text-xs text-foreground-subtle">Professional focus (optional)</Text>
              <TextInput
                value={focus}
                onChangeText={setFocus}
                placeholder="e.g. consumer research"
                placeholderTextColor="#8b91a0"
                className="rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 font-sans text-foreground"
              />
              <Text className="mt-4 mb-1 font-sans-medium text-xs text-foreground-subtle">Evidence or context (optional)</Text>
              <TextInput
                value={evidence}
                onChangeText={setEvidence}
                placeholder="Tell the reviewer what supports your professional identity"
                placeholderTextColor="#8b91a0"
                multiline
                className="min-h-[90px] rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 font-sans text-foreground"
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
