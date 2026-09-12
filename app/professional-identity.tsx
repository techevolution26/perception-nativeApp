import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Button from "../components/ui/Button";
import ProfessionalIdentityPicker from "../components/ui/ProfessionalIdentityPicker";
import useAuthStore from "../store/useAuthStore";
import { apiFetch, ApiError } from "../lib/api";

export default function ProfessionalIdentityScreen() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === "1";
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [industries, setIndustries] = useState<string[]>(user?.professional_industries ?? []);
  const [roles, setRoles] = useState<string[]>(user?.professional_roles ?? []);
  const [primaryRole, setPrimaryRole] = useState<string | null>(user?.primary_professional_role ?? null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!roles.length) {
      Alert.alert("Choose a professional role", "Select at least one role so Perception can represent your professional identity.");
      return;
    }
    if (!primaryRole) {
      Alert.alert("Choose a primary focus", "Select which professional role should be your primary identity.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/user", {
        method: "PUT",
        body: { professional_industries: industries, professional_roles: roles, primary_professional_role: primaryRole },
      });
      await refreshMe();
      if (isOnboarding) {
        router.replace("/verification?onboarding=1");
        return;
      }
      Alert.alert("Saved", "Your professional identity has been updated.");
    } catch (error) {
      Alert.alert("Could not save", error instanceof ApiError ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} className="rounded-control p-2" hitSlop={8}>
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="ml-2 flex-1">
          <Text className="font-sans-semibold text-xl text-foreground">Professional identity</Text>
          <Text className="mt-1 font-sans text-sm text-foreground-muted">Choose the fields that best describe what you do.</Text>
        </View>
      </View>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-12">
        <View className="rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-semibold text-base text-foreground">Your professional identity</Text>
          <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">
            You can belong to multiple industries and hold multiple roles. One role is your primary focus and can receive the leading professional badge.
          </Text>
          <ProfessionalIdentityPicker
            industries={industries}
            roles={roles}
            primaryRole={primaryRole}
            onChange={(value) => { setIndustries(value.industries); setRoles(value.roles); setPrimaryRole(value.primaryRole); }}
          />
        </View>
        {isOnboarding && (
          <View className="rounded-card border border-accent/20 bg-accent-soft p-4">
            <View className="flex-row items-center gap-2"><Feather name="compass" size={17} color="#c97412" /><Text className="font-sans-semibold text-sm text-foreground">Step 2 of your setup</Text></View>
            <Text className="mt-1.5 font-sans text-xs leading-5 text-foreground-muted">Choose the roles and industries that genuinely describe your work. This gives later conversations useful context without deciding what your responses mean.</Text>
          </View>
        )}
        <View className="rounded-card border border-accent/20 bg-accent-soft p-4">
          <Text className="font-sans-semibold text-sm text-foreground">Professional badge ≠ verification</Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-foreground-muted">
            Your selected role can appear as a professional badge. Verification is a separate platform review and is never granted simply because you selected a role or paid for a plan.
          </Text>
        </View>
        <Button label="Save professional identity" variant="accent" loading={saving} onPress={() => void save()} />
        {isOnboarding && <Pressable onPress={() => router.replace("/verification?onboarding=1")} className="items-center py-2"><Text className="font-sans-medium text-sm text-foreground-subtle">Skip this step for now</Text></Pressable>}
      </ScrollView>
    </View>
  );
}
