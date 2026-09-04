import Spinner from "../components/ui/Spinner";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import Button from "../components/ui/Button";
import { ApiError, apiFetch } from "../lib/api";
import type { Plan, Subscription } from "../types/models";

export default function SubscriptionScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [planData, current] = await Promise.all([
        apiFetch<Plan[]>("/api/subscription/plans", { auth: false }),
        apiFetch<Subscription>("/api/subscription"),
      ]);
      setPlans(planData);
      setSubscription(current);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/(auth)/login");
      } else {
        Alert.alert("Unable to load plans", "Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startTrial = async (plan: Plan) => {
    setBusy(plan.code);
    try {
      const result = await apiFetch<{ checkout_url: string; message: string }>("/api/subscription/trial", {
        method: "POST",
        body: { plan_code: plan.code },
      });
      await Linking.openURL(result.checkout_url);
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.body === "object" && error.body !== null
          ? String((error.body as { detail?: unknown }).detail ?? "Please try again.")
          : "Please try again.";
      Alert.alert("Could not start trial", message);
    } finally {
      setBusy(null);
    }
  };

  const openCheckout = async (plan: Plan) => {
    setBusy(plan.code);
    try {
      const result = await apiFetch<{ checkout_url: string; message: string }>("/api/subscription/checkout", {
        method: "POST",
        body: { plan_code: plan.code },
      });
      await Linking.openURL(result.checkout_url);
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.body === "object" && error.body !== null
          ? String((error.body as { detail?: unknown }).detail ?? "Please try again later.")
          : "Please try again later.";
      Alert.alert("Checkout unavailable", message);
    } finally {
      setBusy(null);
    }
  };

  const openBillingPortal = async () => {
    try {
      const result = await apiFetch<{ portal_url: string }>("/api/subscription/portal", { method: "POST" });
      await Linking.openURL(result.portal_url);
    } catch {
      Alert.alert("Billing unavailable", "Please try again later.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  const active = subscription?.analytics_enabled;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} className="rounded-control p-2" hitSlop={8}>
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="ml-2 flex-1">
          <Text className="font-sans-semibold text-xl text-foreground">Analytics access</Text>
          <Text className="font-sans text-sm text-foreground-muted">
            Turn community perceptions into decision signals.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-4 pb-12">
        {active && subscription?.plan && (
          <View className="rounded-card border border-accent/30 bg-accent-soft p-4">
            <Text className="font-sans-semibold text-base text-foreground">
              {subscription.plan.name} is active
            </Text>
            <Text className="mt-1 font-sans text-sm text-foreground-muted">
              Analytics is unlocked for up to {subscription.max_topics} topics.
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Button label="Open analytics" variant="accent" size="sm" onPress={() => router.replace("/analytics")} />
              <Button label="Manage billing" variant="outline" size="sm" onPress={openBillingPortal} />
              <Button label="Billing history" variant="ghost" size="sm" onPress={() => router.push("/billing")} />
            </View>
          </View>
        )}

        <View className="gap-3">
          {plans.filter((plan) => plan.code !== "free").map((plan) => (
            <View key={plan.code} className="rounded-card border border-border-hairline bg-surface p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="font-sans-semibold text-lg text-foreground">{plan.name}</Text>
                  <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">
                    {plan.description}
                  </Text>
                </View>
                <Text className="font-mono text-base text-foreground">
                  ${(plan.price_cents / 100).toFixed(2)}/mo
                </Text>
              </View>

              <View className="mt-4 gap-2">
                <Text className="font-sans text-sm text-foreground-muted">
                  • {plan.max_topics} analytics topics
                </Text>
                <Text className="font-sans text-sm text-foreground-muted">
                  • Professional verification eligibility
                </Text>
                {plan.trial_days > 0 && (
                  <Text className="font-sans text-sm text-accent">
                    • {plan.trial_days}-day trial
                  </Text>
                )}
              </View>

              <View className="mt-4">
                {plan.trial_days > 0 ? (
                  <Button
                    label={busy === plan.code ? "Starting…" : `Start ${plan.trial_days}-day trial`}
                    variant="accent"
                    loading={busy === plan.code}
                    onPress={() => startTrial(plan)}
                    disabled={Boolean(active)}
                  />
                ) : (
                  <Button
                    label="Continue to checkout"
                    variant="primary"
                    loading={busy === plan.code}
                    onPress={() => openCheckout(plan)}
                    disabled={Boolean(active)}
                  />
                )}
              </View>
            </View>
          ))}
        </View>

        <View className="rounded-card border border-border-hairline bg-surface-sunken p-4">
          <Text className="font-sans-semibold text-sm text-foreground">What analytics means</Text>
          <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
            Perception reports observed engagement patterns with sample size and geographic coverage.
            They are signals for exploration and decision-making, not automatically validated scientific
            conclusions or proof of causation.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
