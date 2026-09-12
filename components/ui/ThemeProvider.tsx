import { PropsWithChildren, useEffect } from "react";
import { Platform, StatusBar as NativeStatusBar, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { vars, useColorScheme } from "nativewind";
import useSettingsStore from "../../store/useSettingsStore";

const lightTheme = {
  "--color-background": "252 252 251",
  "--color-surface": "255 255 255",
  "--color-surface-hover": "247 247 248",
  "--color-surface-sunken": "247 247 248",
  "--color-foreground": "20 21 26",
  "--color-foreground-muted": "102 108 122",
  "--color-foreground-subtle": "139 145 160",
  "--color-border-hairline": "236 238 241",
  "--color-border-strong": "216 219 225",
  "--color-accent": "242 163 60",
  "--color-accent-strong": "201 116 18",
  "--color-accent-on": "32 18 3",
  "--color-accent-soft": "253 243 226",
  "--color-danger": "229 72 77",
  "--color-success": "47 174 106",
};

const darkTheme = {
  "--color-background": "10 11 14",
  "--color-surface": "20 21 26",
  "--color-surface-hover": "33 35 43",
  "--color-surface-sunken": "14 15 19",
  "--color-foreground": "247 247 248",
  "--color-foreground-muted": "139 145 160",
  "--color-foreground-subtle": "74 79 92",
  "--color-border-hairline": "33 35 43",
  "--color-border-strong": "52 56 66",
  "--color-accent": "242 163 60",
  "--color-accent-strong": "246 212 154",
  "--color-accent-on": "32 18 3",
  "--color-accent-soft": "45 38 27",
  "--color-danger": "229 72 77",
  "--color-success": "47 174 106",
};

export default function ThemeProvider({ children }: PropsWithChildren) {
  const { colorScheme } = useColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);

  const effectiveScheme =
    themePreference === "system"
      ? colorScheme === "dark"
        ? "dark"
        : "light"
      : themePreference;

  const theme = effectiveScheme === "dark" ? darkTheme : lightTheme;
  const isDark = effectiveScheme === "dark";
  const systemBarColor = isDark ? "#0a0b0e" : "#fcfcfb";

  useEffect(() => {
    if (Platform.OS === "android") {
      NativeStatusBar.setBackgroundColor(systemBarColor, true);
      NativeStatusBar.setBarStyle(isDark ? "light-content" : "dark-content", true);
    }
  }, [isDark, systemBarColor]);

  return (
    <View style={[{ flex: 1, backgroundColor: systemBarColor }, vars(theme)]}>
      <StatusBar style={isDark ? "light" : "dark"} animated />
      {Platform.OS === "android" ? (
        <NativeStatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={systemBarColor}
          translucent
        />
      ) : null}
      {children}
    </View>
  );
}
