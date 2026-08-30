// app/(tabs)/_layout.tsx
import { useEffect, useState } from "react";
import { Tabs, router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { View, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import Avatar from "../../components/ui/Avatar";
import useCurrentUser from "../../hooks/useCurrentUser";
import useAuthStore from "../../store/useAuthStore";
import { apiFetch } from "../../lib/api";
import type { NotificationsResponse } from "../../types/models";

// Actions that require a session redirect guests to /login instead of
// silently doing nothing — mirrors the web app's guardAction pattern.
// Screens themselves (Home, tapped-into Notifications/Messages) are public;
// only the *tap* on New/Notifications/Messages is gated here.
const GUARDED_ROUTES = new Set(["new-perception-tab", "notifications", "messages"]);

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { user } = useCurrentUser();
  const token = useAuthStore((s) => s.token);
  const iconColor = colorScheme === "dark" ? "#8b91a0" : "#666c7a";
  const activeColor = colorScheme === "dark" ? "#f7f7f8" : "#14151a";
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token) {
      setUnread(0);
      return;
    }
    apiFetch<NotificationsResponse>("/api/notifications")
      .then((payload) => setUnread((payload.data || []).filter((n) => !n.read_at).length))
      .catch(() => {});
  }, [token, state.index]); // re-check whenever the active tab changes, e.g. after visiting Notifications

  const routes = state.routes.filter((r) => r.name !== "profile");

  return (
    /*
      The absolute classes here pull the bar out of the standard layout flow,
      causing underlying screens to naturally expand completely full-screen underneath.
    */
    <View
      className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between px-4 bg-transparent"
      style={{ paddingBottom: insets.bottom + 10, paddingTop: 10 }}
    >
      <View className="flex-1 flex-row items-center justify-center gap-1.5 rounded-pill border border-border-hairline bg-surface/95 px-2 py-1.5">
        {routes.map((route) => {
          const isFocused = state.index === state.routes.findIndex((r) => r.key === route.key);
          const iconName = (
            {
              index: "home",
              "new-perception-tab": "plus",
              notifications: "bell",
              messages: "message-circle",
            } as const
          )[route.name as "index" | "new-perception-tab" | "notifications" | "messages"];

          const onPress = () => {
            if (GUARDED_ROUTES.has(route.name) && !token) {
              router.push("/(auth)/login");
              return;
            }
            if (route.name === "new-perception-tab") {
              router.push("/new-perception");
              return;
            }
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} className="relative items-center justify-center rounded-full p-2.5">
              <Feather name={iconName} size={20} color={isFocused ? activeColor : iconColor} />
              {route.name === "notifications" && unread > 0 && (
                <View className="absolute right-1 top-1 h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1">
                  <Text className="font-mono text-[10px] font-bold text-accent-on">{unread > 9 ? "9+" : unread}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => (user ? router.push(`/users/${user.id}`) : router.push("/(auth)/login"))}
        className="ml-3 h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-background"
      >
        <Avatar uri={user?.avatar_url} size={44} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  // Previously force-redirected to /login whenever there was no token —
  // the web app dropped that gate (home feed and perception detail are
  // public now; see app/index.tsx for the equivalent mobile change), so
  // this layout no longer redirects. Guests land here and browse freely;
  // only the guarded tab presses above bounce to login.
  return (
    <Tabs
      /* FIXED: Wrap the component in a function call block to preserve Hook hierarchy context */
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="new-perception-tab" options={{ title: "New" }} />
      <Tabs.Screen name="notifications" options={{ title: "Notifications" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", href: null }} />
    </Tabs>
  );
}
