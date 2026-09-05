// contexts/EchoContext.tsx
import { createContext, useEffect, useState, type ReactNode } from "react";
import Echo from "laravel-echo";
import Pusher from "pusher-js/react-native";
import useAuthStore from "../store/useAuthStore";
import { API_BASE } from "../lib/api";
import { getToken } from "../lib/storage";
import { configureNotifications, notificationEvents, presentLocalNotification } from "../lib/notifications";
import { notificationBadgeEvents } from "../lib/notificationBadge";
import type { Notification } from "../types/models";

export const EchoContext = createContext<Echo<"pusher"> | null>(null);

export function EchoProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [echo, setEcho] = useState<Echo<"pusher"> | null>(null);

  useEffect(() => {
    if (!token || !user || !process.env.EXPO_PUBLIC_PUSHER_KEY) {
      setEcho(null);
      return;
    }

    void configureNotifications();

    let cancelled = false;
    let instance: Echo<"pusher"> | null = null;

    (async () => {
      const authToken = await getToken();
      if (cancelled) return;

      /* 
        FIXED: Explicitly extract the constructor out of the outer layout namespace object.
        Checks for the custom '.Pusher' property first, then defaults, then the base package.
      */
      const rawPusher: any = Pusher;
      const PusherConstructor =
        rawPusher.Pusher || rawPusher.default || rawPusher;

      if (typeof PusherConstructor !== "function") {
        console.error(
          "Could not find a valid Pusher constructor. Object received:",
          Pusher,
        );
        return;
      }

      const pusherClient = new PusherConstructor(
        process.env.EXPO_PUBLIC_PUSHER_KEY!,
        {
          cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || "eu",
          wsHost: process.env.EXPO_PUBLIC_PUSHER_HOST || undefined,
          wsPort: Number(process.env.EXPO_PUBLIC_PUSHER_PORT) || 6001,
          forceTLS: process.env.EXPO_PUBLIC_PUSHER_FORCE_TLS === "true",
          enabledTransports: ["ws", "wss"],
          authEndpoint: `${API_BASE}/api/broadcasting/auth`,
          auth: { headers: { Authorization: `Bearer ${authToken}` } },
        },
      );

      /* 
        FIXED: Clean bulletproof fallback check for Echo.
      */
      const rawEcho: any = Echo;
      const EchoConstructor = rawEcho.default || rawEcho;

      const echoInstance = new EchoConstructor({
        broadcaster: "pusher",
        client: pusherClient,
      });
      instance = echoInstance;

      const notificationChannel = echoInstance.private(`App.Models.User.${user.id}`);
      notificationChannel.listen(".notification", (notification: Notification) => {
        notificationEvents.emit(notification);
        notificationBadgeEvents.emit(1);
        void presentLocalNotification(notification);
      });

      if (!cancelled) setEcho(instance);
    })();

    return () => {
      cancelled = true;
      instance?.disconnect();
      setEcho(null);
    };
  }, [token, user?.id]);

  return <EchoContext.Provider value={echo}>{children}</EchoContext.Provider>;
}
