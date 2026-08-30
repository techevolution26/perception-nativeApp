// app/(tabs)/notifications.tsx
//
// Was missing entirely from the first mobile build — the web app has a
// full notifications panel (bell icon, real-time via the same private
// channel/event as everywhere else) that never got ported. This closes
// that gap.
import { useContext, useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import VantageMark from "../../components/ui/VantageMark";
import { EchoContext } from "../../contexts/EchoContext";
import { apiFetch } from "../../lib/api";
import useAuthStore from "../../store/useAuthStore";
import type { Notification, NotificationsResponse, NotificationData } from "../../types/models";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const echo = useContext(EchoContext);
  const me = useAuthStore((s) => s.user);
  const [notes, setNotes] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch<NotificationsResponse>("/api/notifications")
      .then((payload) => setNotes(payload.data || []))
      .catch((err) => console.error("Failed to load notifications:", err))
      .finally(() => setLoading(false));
  }, [me]);

  useEffect(() => {
    if (!echo || !me) return;
    const channel = echo.private(`App.Models.User.${me.id}`);
    channel.listen(".notification", (notification: Notification) => {
      setNotes((prev) => [notification, ...prev]);
    });
    return () => {
      echo.leaveChannel(`private-App.Models.User.${me.id}`);
    };
  }, [echo, me]);

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      setNotes((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
    } catch (err) {
      console.error("Mark-all-read failed:", err);
    }
  }, []);

  const deleteOne = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Delete notification failed:", err);
    }
  }, []);

  if (!me) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6" style={{ paddingTop: insets.top }}>
        <VantageMark size={30} color="#8b91a0" />
        <Text className="text-center font-sans text-sm text-foreground-subtle">
          Log in to see what&rsquo;s new for you.
        </Text>
        <Pressable onPress={() => router.push("/(auth)/login")}>
          <Text className="font-sans-medium text-accent">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="font-sans-semibold text-xl text-foreground">Notifications</Text>
        {notes.length > 0 && (
          <Pressable onPress={markAllRead}>
            <Text className="font-sans-medium text-sm text-accent">Mark all read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-1 px-3 pb-10"
          ListEmptyComponent={
            <View className="mt-16 items-center gap-3">
              <VantageMark size={30} color="#8b91a0" />
              <Text className="font-sans text-sm text-foreground-subtle">No notifications yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const data = item.data as unknown as NotificationData;
            const isUnread = !item.read_at;
            const topic = data?.topic ?? "General";
            const body = data?.body ?? "";
            const perceptionId = data?.type === "perception" ? data.perception_id : undefined;
            const type = data?.type ?? "perception";

            return (
              <Pressable
                onPress={() => perceptionId && router.push(`/perceptions/${perceptionId}`)}
                className={`flex-row items-start gap-2.5 rounded-control p-3 ${isUnread ? "bg-accent-soft" : ""}`}
              >
                <View className="mt-0.5">
                  <Feather name={type === "daily" ? "sun" : "zap"} size={16} color="#666c7a" />
                </View>
                <Text className={`flex-1 font-sans text-sm ${isUnread ? "text-foreground" : "text-foreground-muted"}`}>
                  {type === "perception" ? (
                    <>
                      <Text className="font-sans-semibold">New in {topic}: </Text>
                      {body}
                    </>
                  ) : (
                    <>
                      <Text className="font-sans-semibold">Daily motivation in {topic}: </Text>
                      {body}
                    </>
                  )}
                </Text>
                <Pressable onPress={() => deleteOne(item.id)} className="p-1">
                  <Feather name="trash-2" size={15} color="#e5484d" />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
