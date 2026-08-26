// lib/storage.ts
//
// Auth token storage — the mobile equivalent of the web app's
// localStorage.getItem("token") pattern, but backed by the platform
// Keychain (iOS) / Keystore (Android) via expo-secure-store, which is
// actually more secure than localStorage ever was on web.
//
// The one real difference: SecureStore's API is async, where localStorage
// was synchronous — every call site that read the token synchronously on
// web has to await it here instead.
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "perception_auth_token";

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
