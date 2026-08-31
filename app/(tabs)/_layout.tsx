// app/(tabs)/_layout.tsx
import { useEffect, useState } from "react";
import { Tabs, router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { View, Pressable, Text, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import Avatar from "../../components/ui/Avatar";
import useCurrentUser from "../../hooks/useCurrentUser";
import useAuthStore from "../../store/useAuthStore";
import { apiFetch } from "../../lib/api";
import type { NotificationsResponse, UserWithUnread } from "../../types/models";

// Actions that require a session redirect guests to /login instead of
// silently doing nothing — mirrors the web app's guardAction pattern.
// Screens themselves (Home, tapped-into Notifications/Messages) are public;
// only the *tap* on New/Notifications/Messages is gated here.
const GUARDED_ROUTES = new Set(["new-perception-tab", "notifications", "messages"]);

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { user, loading } = useCurrentUser();
  const token = useAuthStore((s) => s.token);
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#8b91a0" : "#666c7a";
  const activeColor = isDark ? "#f7f7f8" : "#14151a";
  const [unread, setUnread] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!token) {
      setUnread(0);
      return;
    }
    apiFetch<NotificationsResponse>("/api/notifications")
      .then((payload) => setUnread((payload.data || []).filter((n) => !n.read_at).length))
      .catch(() => {});
  }, [token, state.index]); // re-check whenever the active tab changes, e.g. after visiting Notifications

  useEffect(() => {
    if (!token) {
      setUnreadMessages(0);
      return;
    }
    apiFetch<UserWithUnread[]>("/api/conversations")
      .then((conversations) => setUnreadMessages(conversations.reduce((sum, c) => sum + (c.unread || 0), 0)))
      .catch(() => {});
  }, [token, state.index]); // re-check whenever the active tab changes, e.g. after visiting Messages

  const routes = state.routes.filter((r) => r.name !== "profile");

  // Mirrors the web MobileNav exactly: a floating, centered pill holding
  // just the 4 nav icons, and a *separate* floating circular avatar/sign-in
  // button at bottom-right — not one stretched bar with the avatar tacked
  // onto the end, which is what the first pass built.
  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 bottom-0" style={{ paddingBottom: insets.bottom + 16 }}>
      <View pointerEvents="box-none" className="items-center">
        <View className="overflow-hidden rounded-pill border border-border-hairline shadow-lg">
          <BlurView intensity={60} tint={isDark ? "dark" : "light"} experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}>
            <View className="flex-row items-center gap-1.5 bg-surface/70 px-2 py-1.5">
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
                  <Pressable
                    key={route.key}
                    onPress={onPress}
                    className="relative h-11 w-11 items-center justify-center rounded-full"
                    accessibilityLabel={route.name === "index" ? "Home" : route.name === "new-perception-tab" ? "New perception" : route.name === "notifications" ? "Notifications" : "Messages"}
                    accessibilityRole="button"
                  >
                    <Feather name={iconName} size={20} color={isFocused ? activeColor : iconColor} />
                    {route.name === "notifications" && unread > 0 && (
                      <View className="absolute right-1.5 top-1.5 h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1">
                        <Text className="font-mono text-[10px] font-bold text-accent-on">{unread > 9 ? "9+" : unread}</Text>
                      </View>
                    )}
                    {route.name === "messages" && unreadMessages > 0 && (
                      <View className="absolute right-1.5 top-1.5 h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1">
                        <Text className="font-mono text-[10px] font-bold text-accent-on">
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </BlurView>
        </View>
      </View>

      {/* Separate floating avatar / sign-in button, bottom-right — matches
          web's independently-positioned MobileNav profile button. */}
      <View pointerEvents="box-none" className="absolute bottom-0 right-4">
        {loading ? (
          <View className="h-11 w-11 rounded-full border border-border-hairline bg-surface-sunken shadow-md" />
        ) : user ? (
          <Pressable
            onPress={() => router.push(`/users/${user.id}`)}
            className="h-11 w-11 overflow-hidden rounded-full border-2 border-background shadow-md"
            accessibilityLabel="Your profile"
          >
            <Avatar uri={user.avatar_url} size={44} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            className="h-11 items-center justify-center rounded-pill bg-foreground px-4 shadow-md"
          >
            <Text className="font-sans-semibold text-sm text-background">Sign in</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  // Previously force-redirected to /login whenever there was no token —
  // the web app dropped that gate (home feed and perception detail are
  // public now; see app/(tabs)/_layout.tsx's guardAction below), so this
  // layout no longer redirects. Guests land here and browse freely; only
  // the guarded tab presses above bounce to login.
  return (
    <Tabs
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
