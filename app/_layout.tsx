// app/_layout.tsx
import "./global.css";
import "react-native-reanimated";

import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
  const [hydrationStarted, setHydrationStarted] = useState(false);

  // Previously re-implemented system-theme tracking by hand (React
  // Native's useColorScheme + a manual setColorScheme("light"|"dark")
  // effect) — this both fought with, and didn't reliably react the same
  // way as, NativeWind's own tracking. NativeWind's colorScheme.set()
  // accepts "system" directly and handles OS-level live updates itself;
  // useSettingsStore.hydrate() calls it once with the persisted
  // preference (default "system") and that's the whole story now.
  useEffect(() => {
    if (!hydrationStarted) {
      setHydrationStarted(true);
      hydrateAuth();
      hydrateSettings();
    }
  }, [hydrationStarted, hydrateAuth, hydrateSettings]);

  const appReady = fontsLoaded && authHydrated && settingsHydrated;

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  if (!appReady) {
    return null; // splash screen stays up
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
