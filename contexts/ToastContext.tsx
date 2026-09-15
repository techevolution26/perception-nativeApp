import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

type ToastTone = "success" | "error" | "info";

export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  dismissToast: () => void;
}

interface ActiveToast extends Required<Pick<ToastOptions, "title" | "tone" | "duration">> {
  message?: string;
  id: number;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_META: Record<ToastTone, { icon: "check-circle" | "alert-circle" | "info"; color: string }> = {
  success: { icon: "check-circle", color: "#2fae6a" },
  error: { icon: "alert-circle", color: "#e5484d" },
  info: { icon: "info", color: "#4f8cff" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-14)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const dismissToast = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -10, duration: 150, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback((options: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    const active: ActiveToast = {
      id: ++nextId.current,
      title: options.title,
      message: options.message,
      tone: options.tone ?? "success",
      duration: options.duration ?? 2600,
    };
    setToast(active);
    opacity.setValue(0);
    translateY.setValue(-14);
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 220, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(dismissToast, active.duration);
  }, [dismissToast, opacity, translateY]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const meta = toast ? TONE_META[toast.tone] : null;

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {toast && meta && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Animated.View
            pointerEvents="box-none"
            style={[styles.host, { paddingTop: insets.top + 10, opacity, transform: [{ translateY }] }]}
          >
            <Pressable
              onPress={dismissToast}
              accessibilityRole="alert"
              style={[styles.toast, { backgroundColor: dark ? "#14151a" : "#ffffff", borderColor: dark ? "rgba(255,255,255,0.10)" : "rgba(128,128,128,0.18)" }]}
            >
              <View style={[styles.icon, { backgroundColor: `${meta.color}18` }]}>
                <Feather name={meta.icon} size={17} color={meta.color} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: dark ? "#f7f7f8" : "#14151a" }]} numberOfLines={1}>{toast.title}</Text>
                {toast.message ? <Text style={[styles.message, { color: dark ? "#a8adb9" : "#666c7a" }]} numberOfLines={2}>{toast.message}</Text> : null}
              </View>
              <View style={[styles.edge, { backgroundColor: meta.color }]} />
            </Pressable>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

const styles = StyleSheet.create({
  host: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", zIndex: 1000, elevation: 1000 },
  toast: { minWidth: 250, maxWidth: "88%", flexDirection: "row", alignItems: "center", overflow: "hidden", borderRadius: 18, borderWidth: 1, borderColor: "rgba(128,128,128,0.18)", backgroundColor: "#ffffff", paddingVertical: 10, paddingLeft: 10, paddingRight: 14, shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, marginLeft: 9 },
  title: { fontFamily: "Geist_600SemiBold", fontSize: 13, color: "#14151a" },
  message: { marginTop: 2, fontFamily: "Geist_400Regular", fontSize: 11, lineHeight: 15, color: "#666c7a" },
  edge: { width: 3, alignSelf: "stretch", borderRadius: 3, marginLeft: 10 },
});
