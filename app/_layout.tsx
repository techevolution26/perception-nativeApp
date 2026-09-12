// app/_layout.tsx
import "./global.css";
import "react-native-reanimated";

import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";
import Svg, { Circle, Line, Rect } from "react-native-svg";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import {
  useFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
} from "@expo-google-fonts/geist-mono";
import { EchoProvider } from "../contexts/EchoContext";
import useAuthStore from "../store/useAuthStore";
import useSettingsStore from "../store/useSettingsStore";
import ThemeProvider from "../components/ui/ThemeProvider";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });

  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);

  // Previously re-implemented system-theme tracking by hand (React
  // Native's useColorScheme + a manual setColorScheme("light"|"dark")
  // effect) — this both fought with, and didn't reliably react the same
  // way as, NativeWind's own tracking. NativeWind's colorScheme.set()
  // accepts "system" directly and handles OS-level live updates itself;
  // useSettingsStore.hydrate() calls it once with the persisted
  // preference (default "system") and that's the whole story now.
  useEffect(() => {
    void Promise.resolve().then(() => {
      hydrateAuth();
      hydrateSettings();
    });
  }, [hydrateAuth, hydrateSettings]);

  const appReady = fontsLoaded && authHydrated && settingsHydrated;
  const { colorScheme } = useColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const isDark =
    themePreference === "dark" ||
    (themePreference === "system" && colorScheme === "dark");
  const rootBackgroundColor = isDark ? "#0a0b0e" : "#fcfcfb";

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  if (!appReady) {
    return null; // splash screen stays up
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: rootBackgroundColor }}
    >
      <LaunchAnimation />
      <KeyboardProvider>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <EchoProvider>
              <ThemeProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen
                    name="new-perception"
                    options={{ presentation: "modal" }}
                  />
                  <Stack.Screen
                    name="perceptions/[id]/edit"
                    options={{ presentation: "modal" }}
                  />
                </Stack>
              </ThemeProvider>
            </EchoProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function LaunchAnimation() {
  const [rotation] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const { colorScheme } = useColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const isDark =
    themePreference === "dark" ||
    (themePreference === "system" && colorScheme === "dark");

  useEffect(() => {
    Animated.sequence([
      Animated.timing(rotation, {
        toValue: 0.5,
        duration: 320,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: 0,
        duration: 320,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: 0.5,
        duration: 640,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: 0,
        duration: 640,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, rotation]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.launchOverlay,
        { opacity, backgroundColor: isDark ? "#0a0b0e" : "#fcfcfb" },
      ]}
    >
      <Animated.View style={{ alignItems: "center" }}>
        <Animated.View
          style={{
            transform: [
              {
                rotate: rotation.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ["-360deg", "360deg"],
                }),
              },
            ],
          }}
        >
          <Svg width={120} height={120} viewBox="0 0 24 24" fill="none">
            <Rect width="24" height="24" rx="6" fill="#0a0b0e" />
            <Circle
              cx="12"
              cy="12"
              r="4.25"
              stroke="#f2a33c"
              strokeWidth="1.8"
            />
            <Line
              x1="12"
              y1="2.5"
              x2="12"
              y2="6"
              stroke="#f2a33c"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <Line
              x1="20.3"
              y1="15.6"
              x2="17"
              y2="14"
              stroke="#f2a33c"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <Line
              x1="5.4"
              y1="18.3"
              x2="7.8"
              y2="15.3"
              stroke="#f2a33c"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
        <Text
          style={[
            styles.launchTitle,
            { color: isDark ? "#f7f7f8" : "#14151a" },
          ]}
        >
          Perception
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  launchOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0b0e",
    zIndex: 10,
  },
  launchTitle: {
    marginTop: 16,
    fontFamily: "Geist_600SemiBold",
    fontSize: 24,
    letterSpacing: 0,
  },
});
