// app/_layout.tsx
import "./global.css";
import "react-native-reanimated";

import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";
import { useColorScheme as useSystemColorScheme } from "react-native";
import {
  useFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import { GeistMono_400Regular, GeistMono_500Medium } from "@expo-google-fonts/geist-mono";
import { EchoProvider } from "../contexts/EchoContext";
import useAuthStore from "../store/useAuthStore";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });

  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [hydrationStarted, setHydrationStarted] = useState(false);

  // Follow system color scheme by default — same default as the web app.
  const systemScheme = useSystemColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  useEffect(() => {
    setColorScheme(systemScheme === "dark" ? "dark" : "light");
  }, [systemScheme, setColorScheme]);

  useEffect(() => {
    if (!hydrationStarted) {
      setHydrationStarted(true);
      hydrate();
    }
  }, [hydrationStarted, hydrate]);

  useEffect(() => {
    if (fontsLoaded && hydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, hydrated]);

  if (!fontsLoaded || !hydrated) {
    return null; // splash screen stays up
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <EchoProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="new-perception" options={{ presentation: "modal" }} />
              <Stack.Screen name="perceptions/[id]/edit" options={{ presentation: "modal" }} />
            </Stack>
          </EchoProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
