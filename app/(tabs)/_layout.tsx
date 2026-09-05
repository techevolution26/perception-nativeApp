// app/(tabs)/_layout.tsx

import { useEffect, useRef, useState } from "react";
import { Tabs, router, usePathname } from "expo-router";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import {
  View,
  Pressable,
  Text,
  Platform,
  Animated,
  Keyboard,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import Avatar from "../../components/ui/Avatar";
import useCurrentUser from "../../hooks/useCurrentUser";
import useAuthStore from "../../store/useAuthStore";
import { apiFetch } from "../../lib/api";
import { notificationBadgeEvents } from "../../lib/notificationBadge";
import type { UserWithUnread } from "../../types/models";

/**
 * Routes whose actions require authentication.
 *
 * Home remains public.
 * The navigation item itself can be displayed to guests,
 * but tapping New / Notifications / Messages redirects to login.
 *
 * This mirrors the web MobileNav guardAction() behavior.
 */
const GUARDED_ROUTES = new Set([
  "new-perception-tab",
  "notifications",
  "messages/index",
]);

/**
 * Native equivalent of the web window.scroll listener.
 *
 * Screens can emit their current scroll Y position:
 *
 * GlobalScrollTracker.emit(y)
 *
 * The tab bar subscribes once and uses the values to determine
 * whether the navigation should hide or reveal.
 */
export const GlobalScrollTracker = {
  listeners: new Set<(y: number) => void>(),

  subscribe(fn: (y: number) => void) {
    this.listeners.add(fn);

    return () => {
      this.listeners.delete(fn);
    };
  },

  emit(y: number) {
    this.listeners.forEach((fn) => fn(y));
  },
};

const runWhenIdle = (callback: () => void) => {
  if (typeof globalThis.requestIdleCallback === "function") {
    globalThis.requestIdleCallback(callback);
    return;
  }

  setTimeout(callback, 0);
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { colorScheme } = useColorScheme();

  const { user, loading } = useCurrentUser();
  const token = useAuthStore((s) => s.token);

  const isDark = colorScheme === "dark";

  const iconColor = isDark ? "#8b91a0" : "#666c7a";
  const activeColor = isDark ? "#f7f7f8" : "#14151a";

  const [unread, setUnread] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  /**
   * Navigation visibility state.
   */
  const [visible, setVisible] = useState(true);
  const [showHandle, setShowHandle] = useState(false);

  /**
   * Animated presentation values.
   *
   * Native driver is used because these values only affect
   * transform / opacity.
   */
  const [barTranslateY] = useState(() => new Animated.Value(0));
  const [barOpacity] = useState(() => new Animated.Value(1));
  const [handleScale] = useState(() => new Animated.Value(0));

  /**
   * Scroll trend tracking.
   *
   * This intentionally mirrors the web implementation:
   *
   *   downward > 80px  => hide
   *   upward   > 50px  => reveal
   *
   * Direction changes reset the accumulated distance so small
   * finger tremors do not make the navigation flicker.
   */
  const lastY = useRef(0);
  const scrollDistance = useRef(0);

  /**
   * Used by flashVisible / handleReveal so a previous timer
   * cannot unexpectedly hide the bar after a new interaction.
   */
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Re-check the server count when authentication or the active tab changes. */
  useEffect(() => {
    if (!token) {
      void Promise.resolve().then(() => setUnread(0));
      return;
    }

    const refreshUnread = () => {
      apiFetch<{ count: number }>("/api/notifications/unread-count")
        .then((payload) => setUnread(payload.count))
        .catch(() => {
          // Badge failure should never break navigation.
        });
    };

    refreshUnread();
    return notificationBadgeEvents.subscribe((delta) => {
      setUnread((current) => Math.max(0, current + delta));
    });
  }, [token, state.index]);

  /**
   * Re-check unread conversation counts whenever:
   *
   * - authentication changes
   * - active tab changes
   */
  useEffect(() => {
    if (!token) {
      void Promise.resolve().then(() => setUnreadMessages(0));
      return;
    }

    apiFetch<UserWithUnread[]>("/api/conversations")
      .then((conversations) => {
        setUnreadMessages(
          conversations.reduce(
            (sum, conversation) => sum + (conversation.unread || 0),
            0,
          ),
        );
      })
      .catch(() => {
        // Badge failure should never break navigation.
      });
  }, [token, state.index]);

  /**
   * Animate navigation visibility.
   */
  useEffect(() => {
    Animated.parallel([
      Animated.timing(barTranslateY, {
        toValue: visible ? 0 : 90,
        duration: 220,
        useNativeDriver: true,
      }),

      Animated.timing(barOpacity, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),

      Animated.spring(handleScale, {
        toValue: showHandle && !visible ? 1 : 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }),
    ]).start();
  }, [visible, showHandle, barTranslateY, barOpacity, handleScale]);

  /**
   * Keyboard behavior.
   *
   * Equivalent to the web version's focusin/focusout handling.
   *
   * When the user opens a keyboard:
   *   - hide navigation
   *   - hide reveal handle
   *
   * When the keyboard closes:
   *   - restore navigation
   */
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }

      setVisible(false);
      setShowHandle(false);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setVisible(true);
      setShowHandle(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  /**
   * Native scroll equivalent of the web window.scroll handler.
   */
  useEffect(() => {
    /**
     * Start from the current known scroll position.
     */
    lastY.current = 0;
    scrollDistance.current = 0;

    const unsubscribe = GlobalScrollTracker.subscribe((y) => {
      /**
       * Protect against negative / elastic overscroll.
       *
       * This corresponds to the web:
       *
       *   if (y <= 10) return;
       */
      if (y <= 10) {
        lastY.current = y;
        scrollDistance.current = 0;
        return;
      }

      const diff = y - lastY.current;

      /**
       * Direction changed.
       *
       * Clear the previous trend so a small reversal does not
       * accidentally trigger the opposite navigation state.
       */
      if (
        (diff > 0 && scrollDistance.current < 0) ||
        (diff < 0 && scrollDistance.current > 0)
      ) {
        scrollDistance.current = 0;
      }

      scrollDistance.current += diff;

      /**
       * Scrolling DOWN.
       *
       * Match web threshold:
       *   > 80px
       */
      if (scrollDistance.current > 80) {
        setVisible(false);
        setShowHandle(true);
        scrollDistance.current = 0;
      } else if (scrollDistance.current < -50) {
        /**
         * Scrolling UP.
         *
         * Match web threshold:
         *   < -50px
         */
        setVisible(true);
        setShowHandle(false);
        scrollDistance.current = 0;
      }

      lastY.current = y;
    });

    return () => {
      unsubscribe();

      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, []);

  /**
   * Temporarily reveal the navigation.
   *
   * Used when the user taps:
   *   - New
   *   - Notifications
   *
   * This mirrors the web MobileNav flashVisible().
   */
  const flashVisible = (duration = 2500) => {
    setVisible(true);
    setShowHandle(false);

    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }

    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setShowHandle(true);
    }, duration);
  };

  /**
   * Reveal navigation after the user taps the small pulse handle.
   *
   * Web equivalent:
   *   handleReveal()
   */
  const handleReveal = () => {
    setVisible(true);
    setShowHandle(false);

    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }

    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setShowHandle(true);
    }, 4000);
  };

  /**
   * Web equivalent of:
   *
   *   guardAction(callback)
   *
   * Guests can browse the public application, but guarded actions
   * redirect them to the native login route.
   */
  const guardAction = (callback: () => void) => {
    /**
     * If there is definitely no token, redirect immediately.
     *
     * If authentication is still loading, let the current user
     * hook resolve before making a second authentication decision.
     */
    if (!token) {
      router.push("/(auth)/login");
      return;
    }

    /**
     * We have a token but the user request has not finished resolving.
     * Wait until useCurrentUser has resolved before executing a
     * protected navigation action.
     */
    if (loading) {
      return;
    }

    /**
     * Token + resolved user means authenticated.
     */
    if (!user) {
      router.push("/(auth)/login");
      return;
    }

    callback();
  };

  /**
   * The profile route is intentionally not rendered as a tab.
   */

  // console.log(
  //   "CUSTOM TAB ROUTES:",
  //   state.routes.map((route) => ({
  //     name: route.name,
  //     key: route.key,
  //   })),
  // );

  const TAB_ROUTES = [
    "new-perception-tab",
    "notifications",
    "messages/index",
    "index",
  ] as const;

  const routes = state.routes.filter((route) =>
    TAB_ROUTES.includes(route.name as (typeof TAB_ROUTES)[number]),
  );
  /**
   * Mirrors the web MobileNav behavior.
   *
   * The profile/sign-in control is hidden while the user is
   * inside Messages so it does not compete with the messaging UI.
   */
  const isMessageConversation = Boolean(pathname?.match(/^\/messages\/[^/]+$/));

  // A conversation owns the full screen, including the bottom edge where
  // the composer and Android keyboard insets are negotiated.
  if (isMessageConversation) {
    return null;
  }

  const hideProfileOnMessages = pathname?.startsWith("/messages");

  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 bottom-0 z-50">
      {/* =========================================================
          REVEAL HANDLE
          ========================================================= */}

      <Animated.View
        pointerEvents={showHandle && !visible ? "auto" : "none"}
        className="absolute left-1/2 items-center justify-center"
        style={{
          transform: [{ translateX: -20 }, { scale: handleScale }],
          bottom: insets.bottom + 16,
        }}
      >
        <Pressable
          onPress={handleReveal}
          className="h-10 w-10 items-center justify-center rounded-full border border-border-hairline bg-surface/95 shadow-md active:opacity-80"
          accessibilityLabel="Open navigation"
          accessibilityRole="button"
        >
          <View className="h-2.5 w-2.5 rounded-full bg-accent" />
        </Pressable>
      </Animated.View>

      {/* =========================================================
          MAIN NAVIGATION PILL
          ========================================================= */}

      {/* =========================================================
    MAIN NAVIGATION PILL
    ========================================================= */}

      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        className="self-center"
        style={{
          transform: [{ translateY: barTranslateY }],
          opacity: barOpacity,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <View
          style={{
            borderRadius: 999,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
            backgroundColor: isDark
              ? "rgba(20,21,26,0.82)"
              : "rgba(255,255,255,0.82)",
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.14,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View
            className="flex-row items-center justify-center"
            style={{
              paddingHorizontal: 6,
              paddingVertical: 6,
              gap: 2,
            }}
          >
            {routes.map((route) => {
              const isFocused =
                state.index ===
                state.routes.findIndex((item) => item.key === route.key);

              const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
                index: "home",
                "new-perception-tab": "plus",
                notifications: "bell",
                "messages/index": "message-circle",
              };

              const iconName = iconMap[route.name];

              if (!iconName) {
                return null;
              }

              const accessibilityLabel =
                route.name === "index"
                  ? "Home"
                  : route.name === "new-perception-tab"
                    ? "New perception"
                    : route.name === "notifications"
                      ? "Notifications"
                      : "Messages";

              const onPress = () => {
                if (GUARDED_ROUTES.has(route.name)) {
                  guardAction(() => {
                    if (route.name === "new-perception-tab") {
                      flashVisible(3000);

                      runWhenIdle(() => {
                        router.push("/new-perception");
                      });

                      return;
                    }

                    if (route.name === "notifications") {
                      flashVisible(2600);
                    }

                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                      navigation.navigate(route.name);
                    }
                  });

                  return;
                }

                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  className="items-center justify-center rounded-full active:bg-surface-hover/30"
                  style={{
                    width: 44,
                    height: 44,
                  }}
                  accessibilityLabel={accessibilityLabel}
                  accessibilityRole="button"
                >
                  <View
                    className="items-center justify-center"
                    style={{
                      width: 44,
                      height: 44,
                    }}
                  >
                    <Feather
                      name={iconName}
                      size={20}
                      color={isFocused ? activeColor : iconColor}
                    />

                    {/* Notifications badge */}
                    {route.name === "notifications" && unread > 0 && (
                      <View
                        style={{
                          position: "absolute",
                          right: 4,
                          top: 4,
                          minWidth: 16,
                          height: 16,
                          borderRadius: 999,
                          alignItems: "center",
                          justifyContent: "center",
                          paddingHorizontal: 4,
                          backgroundColor: isDark ? "#f7f7f8" : "#14151a",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            lineHeight: 11,
                            fontWeight: "700",
                            color: isDark ? "#14151a" : "#f7f7f8",
                          }}
                        >
                          {unread > 9 ? "9+" : unread}
                        </Text>
                      </View>
                    )}

                    {/* Messages badge */}
                    {route.name === "messages/index" && unreadMessages > 0 && (
                      <View
                        style={{
                          position: "absolute",
                          right: 4,
                          top: 4,
                          minWidth: 16,
                          height: 16,
                          borderRadius: 999,
                          alignItems: "center",
                          justifyContent: "center",
                          paddingHorizontal: 4,
                          backgroundColor: isDark ? "#f7f7f8" : "#14151a",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            lineHeight: 11,
                            fontWeight: "700",
                            color: isDark ? "#14151a" : "#f7f7f8",
                          }}
                        >
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* ===========================================================
          PROFILE / SIGN-IN
          Separate from the navigation pill.
          =========================================================== */}

      {!hideProfileOnMessages && (
        <View
          pointerEvents="box-none"
          className="absolute right-4"
          style={{
            bottom: insets.bottom + 12,
          }}
        >
          {loading ? (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                borderWidth: 1,
                alignItems: "center",
                justifyContent: "center",
                borderColor: isDark
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(0,0,0,0.10)",
                backgroundColor: isDark
                  ? "rgba(30,31,38,1)"
                  : "rgba(245,245,247,1)",
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 6,
              }}
            />
          ) : token && user ? (
            <Pressable
              onPress={() => router.push(`/users/${user.id}`)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: isDark ? "#14151a" : "#ffffff",
                backgroundColor: "transparent",
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                shadowOpacity: 0.16,
                shadowRadius: 8,
                elevation: 7,
              }}
              accessibilityLabel="Your profile"
              accessibilityRole="button"
            >
              <Avatar uri={user.avatar_url} size={40} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={{
                height: 44,
                paddingHorizontal: 16,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? "#f7f7f8" : "#14151a",
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                shadowOpacity: 0.16,
                shadowRadius: 8,
                elevation: 7,
              }}
              accessibilityLabel="Sign in or create account"
              accessibilityRole="button"
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: isDark ? "#14151a" : "#f7f7f8",
                }}
              >
                Sign in
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  /**
   * There is deliberately NO global authentication redirect here.
   *
   * The application is publicly browsable.
   *
   * Authentication is enforced at the point of protected action:
   *
   *   New perception
   *   Notifications
   *   Messages
   *   Profile
   *
   * This mirrors the web MobileNav architecture.
   */
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="new-perception-tab"
        options={{
          title: "New",
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: null,
        }}
      />
    </Tabs>
  );
}
