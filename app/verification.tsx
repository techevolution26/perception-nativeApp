import Spinner from "../components/ui/Spinner";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useToast } from "../contexts/ToastContext";
import { Feather } from "@expo/vector-icons";

import Button from "../components/ui/Button";
import ProfessionalIdentityPicker from "../components/ui/ProfessionalIdentityPicker";
import type {
  ProfessionalTaxonomy,
  VerificationApplication,
} from "../types/models";
import { ApiError, apiFetch, getApiErrorMessage } from "../lib/api";
import useAuthStore from "../store/useAuthStore";

export default function VerificationScreen() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === "1";
  const user = useAuthStore((s) => s.user);
  const { showToast } = useToast();
  const completeTopicOnboarding = useAuthStore(
    (state) => state.completeTopicOnboarding,
  );
  const [taxonomy, setTaxonomy] = useState<ProfessionalTaxonomy | null>(null);
  const [industries, setIndustries] = useState<string[]>(
    user?.professional_industries ?? [],
  );
  const [roles, setRoles] = useState<string[]>(user?.professional_roles ?? []);
  const [primaryRole, setPrimaryRole] = useState<string | null>(
    user?.primary_professional_role ?? null,
  );
  const [application, setApplication] =
    useState<VerificationApplication | null>(null);
  const [focus, setFocus] = useState(user?.professional_focus ?? "");
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canApply, setCanApply] = useState(true);

  const load = useCallback(async () => {
    try {
      const [app, taxonomyData] = await Promise.all([
        apiFetch<VerificationApplication | null>("/api/verification/me"),
        apiFetch<ProfessionalTaxonomy>("/api/professional-taxonomy", {
          auth: false,
        }),
      ]);
      setApplication(app);
      setTaxonomy(taxonomyData);
      setCanApply(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setCanApply(false);
        if (!isOnboarding)
          Alert.alert(
            "Verification requires the right plan",
            "Choose a plan that includes professional verification.",
          );
      }
    } finally {
      setLoading(false);
    }
  }, [isOnboarding]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const submit = async () => {
    const role = taxonomy?.roles.find((item) => item.code === primaryRole);
    if (!role || !roles.length) {
      Alert.alert(
        "Choose your professional identity",
        "Select at least one professional role and choose a primary role.",
      );
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch<VerificationApplication>(
        "/api/verification/applications",
        {
          method: "POST",
          body: {
            profession: role.label,
            focus: focus.trim() || role.label,
            industry_codes: industries,
            professional_role_codes: roles,
            primary_professional_role: primaryRole,
            evidence: evidence.trim() || null,
          },
        },
      );
      setApplication(result);
      showToast({
        title: "Verification application submitted",
        message: "Your application is now under review.",
        tone: "success",
      });
    } catch (error) {
      showToast({
        title: "Verification not submitted",
        message: getApiErrorMessage(error, "Please try again."),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (!user) return null;

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pb-3 pt-14">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="rounded-control p-2"
            hitSlop={8}
          >
            <Feather name="chevron-left" size={22} color="#8b91a0" />
          </Pressable>
          <View className="ml-2 flex-1">
            <Text className="font-sans-semibold text-xl text-foreground">
              Professional verification
            </Text>
          </View>
        </View>
        <Text className="ml-12 mt-1 font-sans text-sm leading-5 text-foreground-muted">
          A reviewed signal that helps people understand who is speaking
          professionally.
        </Text>
      </View>

      <ScrollView contentContainerClassName="gap-3 px-4 pb-12">
        {isOnboarding && (
          <View className="rounded-card border border-accent/20 bg-accent-soft p-4">
            <View className="flex-row items-center gap-2">
              <Feather name="shield" size={17} color="#c97412" />
              <Text className="font-sans-semibold text-sm text-foreground">
                Step 3 · optional
              </Text>
            </View>
            <Text className="mt-1.5 font-sans text-xs leading-5 text-foreground-muted">
              Apply only if you want your professional identity reviewed. Public
              portfolio, employer, directory, publication or certificate links
              can help. Never submit passwords, private access links or secrets.
            </Text>
          </View>
        )}
        {!canApply && !application ? (
          <View className="rounded-card border border-border-hairline bg-surface p-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-sunken">
              <Feather name="shield" size={19} color="#2563eb" />
            </View>
            <Text className="mt-3 font-sans-semibold text-base text-foreground">
              Verification is optional
            </Text>
            <Text className="mt-1.5 font-sans text-sm leading-5 text-foreground-muted">
              Your professional identity remains available without verification.
              Eligibility depends on your plan; approval is a separate human
              review.
            </Text>
          </View>
        ) : application ? (
          <View className="rounded-card border border-border-hairline bg-surface p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-sunken">
                <Feather
                  name={
                    application.status === "APPROVED"
                      ? "check-circle"
                      : application.status === "REJECTED"
                        ? "x-circle"
                        : "clock"
                  }
                  size={21}
                  color={
                    application.status === "APPROVED"
                      ? "#2563eb"
                      : application.status === "REJECTED"
                        ? "#c0392b"
                        : "#8b91a0"
                  }
                />
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-base text-foreground">
                  Application {application.status.toLowerCase()}
                </Text>
                <Text className="mt-0.5 font-sans text-xs text-foreground-subtle">
                  {application.profession} · {application.focus}
                </Text>
              </View>
            </View>
            {application.status === "PENDING" && (
              <Text className="mt-4 font-sans text-sm leading-5 text-foreground-muted">
                Your application is with the review team. You do not need to
                submit it again while it is pending.
              </Text>
            )}
            {application.status === "APPROVED" && (
              <Text className="mt-4 font-sans text-sm leading-5 text-foreground-muted">
                Your professional verification has been approved for the
                submitted professional identity.
              </Text>
            )}
            {application.status === "REJECTED" && (
              <Text className="mt-4 font-sans text-sm leading-5 text-foreground-muted">
                The application was not approved. Review the note below before
                deciding whether to update your professional identity and apply
                again.
              </Text>
            )}
            {application.reviewer_note && (
              <View className="mt-3 rounded-control bg-surface-sunken p-3">
                <Text className="font-sans-medium text-xs text-foreground-subtle">
                  Reviewer note
                </Text>
                <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">
                  {application.reviewer_note}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <View className="rounded-card border border-border-hairline bg-surface p-4">
              <Text className="font-sans-semibold text-base text-foreground">
                Professional identity
              </Text>
              <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">
                Select your industries and roles instead of typing an
                unstructured profession. Your primary role determines the
                leading professional badge.
              </Text>
              <ProfessionalIdentityPicker
                industries={industries}
                roles={roles}
                primaryRole={primaryRole}
                onChange={(value) => {
                  setIndustries(value.industries);
                  setRoles(value.roles);
                  setPrimaryRole(value.primaryRole);
                }}
              />
              <Text className="mt-4 mb-1 font-sans-medium text-xs text-foreground-subtle">
                Professional focus (optional)
              </Text>
              <TextInput
                value={focus}
                onChangeText={setFocus}
                placeholder="e.g. consumer research"
                placeholderTextColor="#8b91a0"
                className="rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 font-sans text-foreground"
              />
              <Text className="mt-4 mb-1 font-sans-medium text-xs text-foreground-subtle">
                Evidence or context (optional)
              </Text>
              <TextInput
                value={evidence}
                onChangeText={setEvidence}
                placeholder="Explain what supports your identity; you may include public evidence links"
                placeholderTextColor="#8b91a0"
                multiline
                className="min-h-[90px] rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 font-sans text-foreground"
              />
            </View>

            <View className="rounded-card border border-border-hairline bg-surface-sunken p-4">
              <View className="flex-row items-center gap-2">
                <Feather name="check-circle" size={16} color="#2563eb" />
                <Text className="font-sans-semibold text-sm text-foreground">
                  What the badge means
                </Text>
              </View>
              <Text className="mt-1.5 font-sans text-xs leading-5 text-foreground-muted">
                It indicates that the submitted professional identity was
                reviewed and approved. It does not certify every statement,
                expertise in every subject, or turn community observations into
                scientific proof.
              </Text>
            </View>

            <Button
              label={saving ? "Submitting…" : "Submit application"}
              variant="accent"
              loading={saving}
              onPress={submit}
            />
          </>
        )}
        {isOnboarding && (
          <Pressable
            onPress={() => {
              void completeTopicOnboarding();
              router.replace("/(tabs)");
            }}
            className="items-center py-2"
          >
            <Text className="font-sans-medium text-sm text-foreground-subtle">
              Skip verification and finish setup
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
