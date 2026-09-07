import Spinner from "../../components/ui/Spinner";
// app/(tabs)/notifications.tsx
//
// Was missing entirely from the first mobile build — the web app has a
// full notifications panel (bell icon, real-time via the same private
// channel/event as everywhere else) that never got ported. This closes
// that gap.
import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import VantageMark from "../../components/ui/VantageMark";
import { apiFetch } from "../../lib/api";
import useAuthStore from "../../store/useAuthStore";
import type {
  Notification,
  NotificationsResponse,
  NotificationData,
} from "../../types/models";
import { playNotificationSound } from "../../lib/sound";
import { notificationEvents } from "../../lib/notifications";
import { notificationBadgeEvents } from "../../lib/notificationBadge";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const me = useAuthStore((s) => s.user);
  const [notes, setNotes] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (!me) {
        setLoading(false);
        return;
      }
      setLoading(true);
      return apiFetch<NotificationsResponse>("/api/notifications")
        .then((payload) => setNotes(payload.data || []))
        .catch((err) => console.error("Failed to load notifications:", err))
        .finally(() => setLoading(false));
    });
  }, [me]);

  useEffect(() => {
    if (!me) return;
    return notificationEvents.subscribe((notification) => {
      setNotes((prev) => [notification, ...prev]);
      void playNotificationSound();
    });
  }, [me]);

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      const unreadCount = notes.filter(
        (notification) => !notification.read_at,
      ).length;
      setNotes((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() })),
      );
      notificationBadgeEvents.emit(-unreadCount);
    } catch (err) {
      console.error("Mark-all-read failed:", err);
    }
  }, [notes]);

  const openNotification = useCallback(async (notification: Notification) => {
    const isUnread = !notification.read_at;

    if (isUnread) {
      setNotes((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );
      notificationBadgeEvents.emit(-1);
    }

    const data = notification.data as unknown as NotificationData;
    const perceptionId =
      "perception_id" in data ? data.perception_id : undefined;
    const actorId = "actor_id" in data ? data.actor_id : undefined;
    if (perceptionId) router.push(`/perceptions/${perceptionId}`);
    else if (actorId) router.push(`/users/${actorId}`);
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
      <View
        className="flex-1 items-center justify-center gap-3 bg-background px-6"
        style={{ paddingTop: insets.top }}
      >
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
        <Text className="font-sans-semibold text-xl text-foreground">
          Notifications
        </Text>
        {notes.length > 0 && (
          <Pressable onPress={markAllRead}>
            <Text className="font-sans-medium text-sm text-accent">
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <Spinner className="mt-8" />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-1 px-3 pb-10"
          ListEmptyComponent={
            <View className="mt-16 items-center gap-3">
              <VantageMark size={30} color="#8b91a0" />
              <Text className="font-sans text-sm text-foreground-subtle">
                No notifications yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const data = item.data as unknown as NotificationData;
            const isUnread = !item.read_at;
            const topic = "topic" in data ? data.topic : "General";
            const body = "body" in data ? data.body : "";
            const type = data?.type ?? "perception";
            const actorName =
              "actor_name" in data ? data.actor_name : undefined;

            return (
              <Pressable
                onPress={() => void openNotification(item)}
                className={`flex-row items-start gap-2.5 rounded-control p-3 ${isUnread ? "bg-accent-soft" : ""}`}
              >
                <View className="mt-0.5">
                  <Feather
                    name={type === "daily" ? "sun" : "zap"}
                    size={16}
                    color="#666c7a"
                  />
                </View>
                <Text
                  className={`flex-1 font-sans text-sm ${isUnread ? "text-foreground" : "text-foreground-muted"}`}
                >
                  {type === "perception" ? (
                    <>
                      <Text className="font-sans-semibold">
                        New in {topic}:{" "}
                      </Text>
                      {body}
                    </>
                  ) : type === "daily" ? (
                    <>
                      <Text className="font-sans-semibold">
                        Daily motivation in {topic}:{" "}
                      </Text>
                      {body}
                    </>
                  ) : type === "follow" ? (
                    <>
                      <Text className="font-sans-semibold">
                        {actorName ?? "Someone"}
                      </Text>{" "}
                      followed you.
                    </>
                  ) : type === "message" ? (
                    <>
                      <Text className="font-sans-semibold">
                        {actorName ?? "New message"}
                      </Text>{" "}
                      sent you a message.
                    </>
                  ) : type === "perception_like" ? (
                    <>
                      <Text className="font-sans-semibold">
                        {actorName ?? "Someone"}
                      </Text>{" "}
                      liked your perception.
                    </>
                  ) : (
                    <>
                      <Text className="font-sans-semibold">
                        {actorName ?? "Someone"}
                      </Text>{" "}
                      interacted with your content.
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
