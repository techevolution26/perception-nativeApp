import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import StateView from "../components/ui/StateView";
import useAuthStore from "../store/useAuthStore";
import { apiFetch } from "../lib/api";
import { useToast } from "../contexts/ToastContext";
import type { InvestigationThread } from "../types/models";

const STATUS_LABELS: Record<InvestigationThread["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  verified: "Verified",
  dismissed: "Dismissed",
};

export default function InvestigationsScreen() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((state) => state.token);
  const { showToast } = useToast();
  const [items, setItems] = useState<InvestigationThread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await apiFetch<{ items: InvestigationThread[] }>("/api/investigation-threads");
      setItems(response.items);
    } catch {
      showToast({ title: "Notebook unavailable", message: "Please try again.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [showToast, token]);

  useFocusEffect(useCallback(() => { void load(); return undefined; }, [load]));

  const updateStatus = async (item: InvestigationThread, status: InvestigationThread["status"]) => {
    try {
      const updated = await apiFetch<InvestigationThread>(`/api/investigation-threads/${item.id}`, {
        method: "PATCH",
        json: true,
        body: { status },
      });
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    } catch {
      showToast({ title: "Status not updated", message: "Please try again.", tone: "error" });
    }
  };

  const remove = async (item: InvestigationThread) => {
    try {
      await apiFetch<void>(`/api/investigation-threads/${item.id}`, { method: "DELETE" });
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch {
      showToast({ title: "Couldn’t remove investigation", message: "Please try again.", tone: "error" });
    }
  };

  if (!token) {
    return <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}><StateView kind="error" title="Sign in to use your investigation notebook" actionLabel="Sign in" onAction={() => router.push("/(auth)/login")} /></View>;
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 border-b border-border-hairline px-4 py-3">
        <Pressable onPress={() => router.back()} className="rounded-control p-1" hitSlop={8} accessibilityLabel="Go back"><Feather name="arrow-left" size={20} color="#8b91a0" /></Pressable>
        <View className="flex-1">
          <Text className="font-sans-semibold text-base text-foreground">Investigation notebook</Text>
          <Text className="mt-0.5 font-sans text-[11px] text-foreground-subtle">Private questions worth taking beyond a conversation.</Text>
        </View>
      </View>
      {loading ? <StateView kind="loading" /> : items.length === 0 ? (
        <StateView kind="empty" title="Your notebook is empty" message="Save an investigation path from Perception Intelligence when a question is worth exploring further." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
          {items.map((item) => (
            <View key={item.id} className="mb-3 rounded-card border border-border-hairline bg-surface p-4">
              <View className="flex-row items-start gap-2">
                <View className="mt-0.5 rounded-full bg-background p-1.5"><Feather name="compass" size={14} color="#8b91a0" /></View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="flex-1 font-sans-semibold text-sm text-foreground">{item.title}</Text>
                    <Text className="font-sans-medium text-[10px] text-foreground-subtle">{STATUS_LABELS[item.status]}</Text>
                  </View>
                  <Text className="mt-2 font-sans-medium text-xs leading-5 text-foreground">{item.question}</Text>
                  <Text className="mt-2 font-sans text-[11px] leading-4 text-foreground-muted">{item.validation_step}</Text>
                  {item.note ? <Text className="mt-2 rounded-control bg-background p-2.5 font-sans text-[11px] leading-4 text-foreground-muted">Note: {item.note}</Text> : null}
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    <Pressable onPress={() => void updateStatus(item, item.status === "open" ? "in_progress" : item.status === "in_progress" ? "verified" : "open")} className="rounded-full border border-border-hairline px-2.5 py-1.5"><Text className="font-sans-medium text-[10px] text-foreground-muted">{item.status === "verified" ? "Reopen" : item.status === "in_progress" ? "Mark verified" : "Start"}</Text></Pressable>
                    <Pressable onPress={() => void updateStatus(item, "dismissed")} className="rounded-full border border-border-hairline px-2.5 py-1.5"><Text className="font-sans-medium text-[10px] text-foreground-muted">Dismiss</Text></Pressable>
                    <Pressable onPress={() => void remove(item)} className="rounded-full border border-border-hairline px-2.5 py-1.5"><Text className="font-sans-medium text-[10px] text-foreground-muted">Remove</Text></Pressable>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
