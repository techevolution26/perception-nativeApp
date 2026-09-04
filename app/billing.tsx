import Spinner from "../components/ui/Spinner";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { ApiError, apiFetch } from "../lib/api";
import type { BillingInvoice } from "../types/models";

function formatAmount(invoice: BillingInvoice): string {
  const currency = (invoice.currency ?? "USD").toUpperCase();
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(invoice.amount_paid / 100);
}

export default function BillingScreen() {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInvoices(await apiFetch<BillingInvoice[]>("/api/subscription/invoices"));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/(auth)/login");
      } else {
        Alert.alert("Unable to load billing history", "Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()} className="rounded-control p-2" hitSlop={8}>
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <View className="ml-2">
          <Text className="font-sans-semibold text-xl text-foreground">Billing history</Text>
          <Text className="font-sans text-sm text-foreground-muted">Your Stripe invoices and receipts.</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><Spinner /></View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 px-4 pb-12">
          {invoices.length === 0 ? (
            <View className="rounded-card border border-border-hairline bg-surface p-4">
              <Text className="font-sans text-sm text-foreground-muted">No invoices yet.</Text>
            </View>
          ) : invoices.map((invoice) => (
            <View key={invoice.id} className="rounded-card border border-border-hairline bg-surface p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="font-sans-semibold text-base text-foreground">
                    {invoice.number ?? invoice.id}
                  </Text>
                  <Text className="mt-1 font-sans text-sm text-foreground-muted">
                    {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : "Date unavailable"}
                  </Text>
                </View>
                <Text className="font-mono text-base text-foreground">{formatAmount(invoice)}</Text>
              </View>
              <Text className="mt-2 font-sans text-sm text-foreground-muted">Status: {invoice.status ?? "unknown"}</Text>
              {invoice.hosted_invoice_url && (
                <Pressable className="mt-3" onPress={() => Linking.openURL(invoice.hosted_invoice_url as string)}>
                  <Text className="font-sans-medium text-sm text-accent">Open invoice</Text>
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
