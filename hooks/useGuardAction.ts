// hooks/useGuardAction.ts
//
// The app now allows guest browsing (home feed, perception detail, topics,
// search are all public) — only *actions* require a session. This mirrors
// the web app's guardAction pattern: wrap anything that needs auth, and it
// either runs the callback or bounces to /login, instead of the previous
// all-or-nothing "no token => can't even see the app" gate.
import { useCallback } from "react";
import { router } from "expo-router";
import useAuthStore from "../store/useAuthStore";

export default function useGuardAction() {
  const token = useAuthStore((s) => s.token);

  return useCallback(
    (callback: () => void) => {
      if (!token) {
        router.push("/(auth)/login");
        return;
      }
      callback();
    },
    [token]
  );
}
