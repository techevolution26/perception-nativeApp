import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Feather } from "@expo/vector-icons";

export default function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const restoredTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let wasOffline = false;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOffline = state.isConnected === false || state.isInternetReachable === false;
      if (nextOffline) {
        wasOffline = true;
        setShowRestored(false);
      } else if (wasOffline) {
        wasOffline = false;
        setShowRestored(true);
        if (restoredTimer.current) clearTimeout(restoredTimer.current);
        restoredTimer.current = setTimeout(() => setShowRestored(false), 2200);
      }
      setOffline(nextOffline);
    });
    return () => {
      unsubscribe();
      if (restoredTimer.current) clearTimeout(restoredTimer.current);
    };
  }, []);

  if (!offline && !showRestored) return null;
  return (
    <View className={`absolute left-4 right-4 top-2 z-50 flex-row items-center justify-center gap-2 rounded-pill border px-3 py-2 ${offline ? "border-danger/30 bg-surface" : "border-accent/30 bg-accent-soft"}`}>
      <Feather name={offline ? "wifi-off" : "wifi"} size={13} color={offline ? "#e5484d" : "#b56b13"} />
      <Text className="font-sans-medium text-xs text-foreground">{offline ? "You’re offline · changes may not sync" : "Back online"}</Text>
    </View>
  );
}
