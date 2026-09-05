import { Platform } from "react-native";
import Constants from "expo-constants";
import type { Notification, NotificationData } from "../types/models";

const NOTIFICATION_CHANNEL = "perception-notifications";

export const notificationEvents = {
  listeners: new Set<(notification: Notification) => void>(),

  subscribe(listener: (notification: Notification) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },

  emit(notification: Notification) {
    this.listeners.forEach((listener) => listener(notification));
  },
};

type NotificationsModule = typeof import("expo-notifications");
let notificationsModule: NotificationsModule | null | undefined;

async function getNotifications(): Promise<NotificationsModule | null> {
  // Android Expo Go no longer contains expo-notifications. Native builds do.
  if (Platform.OS === "android" && Constants.appOwnership === "expo") {
    return null;
  }

  if (notificationsModule !== undefined) {
    return notificationsModule;
  }

  try {
    notificationsModule = await import("expo-notifications");
  } catch (error) {
    notificationsModule = null;
    console.warn("Device notifications are unavailable in this app build:", error);
  }

  return notificationsModule;
}

export async function configureNotifications() {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL, {
      name: "Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "notification.wav",
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  }
}

export async function presentLocalNotification(notification: Notification) {
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const data = notification.data as unknown as NotificationData;
    const topic = "topic" in data ? data.topic : undefined;
    const body = "body" in data ? data.body : undefined;
    const actorName = "actor_name" in data ? data.actor_name : undefined;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: topic ? `New in ${topic}` : actorName ?? "New notification",
        body: body ?? (actorName ? `${actorName} interacted with your content.` : "You have a new notification."),
        sound: "notification.wav",
        data: { notificationId: notification.id },
      },
      trigger: Platform.OS === "android" ? { channelId: NOTIFICATION_CHANNEL } : null,
    });
  } catch (error) {
    console.warn("Failed to present local notification:", error);
  }
}
