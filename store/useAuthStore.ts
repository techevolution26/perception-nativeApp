// store/useAuthStore.ts
//
// The web app could read localStorage.getItem("token") synchronously
// anywhere, anytime. SecureStore can't be read synchronously, so auth state
// needs to live somewhere reactive that every screen can subscribe to
// instead of re-reading storage on every render. This store is that source
// of truth — hydrated once at launch, updated on login/logout.
import { create } from "zustand";
import { apiFetch, ApiError, setUnauthorizedHandler } from "../lib/api";
import { getToken, setToken, clearToken } from "../lib/storage";
import type { UserMe, AuthResponse } from "../types/models";

interface AuthState {
  user: UserMe | null;
  token: string | null;
  hydrated: boolean;
  loading: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,
  loading: false,

  hydrate: async () => {
    const token = await getToken();
    if (!token) {
      set({ hydrated: true });
      return;
    }
    try {
      const user = await apiFetch<UserMe>("/api/user", { auth: true });
      set({ token, user, hydrated: true });
    } catch {
      // stored token is invalid/expired
      await clearToken();
      set({ token: null, user: null, hydrated: true });
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await apiFetch<AuthResponse>("/api/login", {
        method: "POST",
        auth: false,
        body: { email, password },
      });
      await setToken(res.token);
      set({ token: res.token, user: res.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  loginWithGoogle: async (idToken) => {
    set({ loading: true });
    try {
      const res = await apiFetch<AuthResponse>("/api/google", { method: "POST", auth: false, body: { id_token: idToken } });
      await setToken(res.token);
      set({ token: res.token, user: res.user, loading: false });
    } catch (err) { set({ loading: false }); throw err; }
  },

  register: async (name, email, password, passwordConfirmation) => {
    set({ loading: true });
    try {
      const res = await apiFetch<AuthResponse>("/api/register", {
        method: "POST",
        auth: false,
        body: { name, email, password, password_confirmation: passwordConfirmation },
      });
      await setToken(res.token);
      set({ token: res.token, user: res.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    const token = get().token;
    try {
      if (token) {
        await apiFetch("/api/logout", {
          method: "POST",
          auth: true,
          clearOnUnauthorized: false,
        });
      }
    } catch {
      // Local credential removal is still mandatory if the server is unavailable.
    } finally {
      await clearToken();
      set({ token: null, user: null });
    }
  },

  refreshMe: async () => {
    if (!get().token) return;
    const user = await apiFetch<UserMe>("/api/user");
    set({ user });
  },
}));

export { ApiError };
export default useAuthStore;

// Any authenticated request that comes back 401 anywhere in the app clears
// the (now-invalid) session — see lib/api.ts for why this lives here
// instead of being scattered across every screen that calls apiFetch.
setUnauthorizedHandler(() => {
  useAuthStore.getState().logout();
});
