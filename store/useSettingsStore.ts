// store/useSettingsStore.ts
//
// Holds user-facing app preferences — currently just theme, with room for
// more (see app/(tabs)/profile/settings.tsx). Persisted via AsyncStorage
// since none of this is sensitive (unlike the auth token, which lives in
// SecureStore instead).
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme as nativewindColorScheme } from "nativewind";

export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "perception_theme_preference";

interface SettingsState {
  themePreference: ThemePreference;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
}

const useSettingsStore = create<SettingsState>((set) => ({
  themePreference: "system",
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      const pref: ThemePreference = stored === "light" || stored === "dark" ? stored : "system";
      nativewindColorScheme.set(pref);
      set({ themePreference: pref, hydrated: true });
    } catch {
      nativewindColorScheme.set("system");
      set({ themePreference: "system", hydrated: true });
    }
  },

  setThemePreference: async (pref) => {
    nativewindColorScheme.set(pref);
    set({ themePreference: pref });
    try {
      await AsyncStorage.setItem(THEME_KEY, pref);
    } catch {
      // best-effort persistence — the in-memory value is already correct
      // for the rest of this session even if writing to disk fails
    }
  },
}));

export default useSettingsStore;
