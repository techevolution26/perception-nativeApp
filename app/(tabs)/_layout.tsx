// app/(tabs)/_layout.tsx
import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import Avatar from "../../components/ui/Avatar";
import useCurrentUser from "../../hooks/useCurrentUser";
import useAuthStore from "../../store/useAuthStore";

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { user } = useCurrentUser();
  const iconColor = colorScheme === "dark" ? "#8b91a0" : "#666c7a";
  const activeColor = colorScheme === "dark" ? "#f7f7f8" : "#14151a";

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
          const isFocused =
            state.index === state.routes.findIndex((r) => r.key === route.key);
          const iconName = (
            {
              index: "home",
              "new-perception-tab": "plus",
              search: "search",
              messages: "message-circle",
            } as const
          )[
            route.name as "index" | "new-perception-tab" | "search" | "messages"
          ];

          const onPress = () => {
            if (route.name === "new-perception-tab") {
              router.push("/new-perception");
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
              className="items-center justify-center rounded-full p-2.5"
            >
              <Feather
                name={iconName}
                size={20}
                color={isFocused ? activeColor : iconColor}
              />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() =>
          user ? router.push(`/users/${user.id}`) : router.push("/(auth)/login")
        }
        className="ml-3 h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-background"
      >
        <Avatar uri={user?.avatar_url} size={44} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/(auth)/login");
    }
  }, [hydrated, token]);

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
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", href: null }} />
    </Tabs>
  );
}
