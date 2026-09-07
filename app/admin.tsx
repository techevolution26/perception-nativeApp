import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import useAuthStore from "../store/useAuthStore";
import { ApiError, apiFetch } from "../lib/api";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

interface AdminOverview {
  users: number;
  perceptions: number;
  likes: number;
  comments: number;
  messages: number;
  active_users: number;
}
interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}
interface AdminAudit {
  id: number;
  actor_user_id: number;
  actor_name: string;
  target_user_id: number | null;
  target_name: string | null;
  action: string;
  data: Record<string, unknown>;
  created_at: string;
}

export default function AdminScreen() {
  const user = useAuthStore((s) => s.user);
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AdminAudit[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!isSuperAdmin) router.replace("/(tabs)");
  }, [isSuperAdmin]);

  const loadControlRoom = useCallback(async (token: string) => {
    const options = { auth: false, headers: { Authorization: `Bearer ${token}` } };
    const [overview, adminUsers, auditRows] = await Promise.all([
      apiFetch<AdminOverview>("/api/admin/overview", options),
      apiFetch<AdminUser[]>(`/api/admin/users?query=${encodeURIComponent(query)}`, options),
      apiFetch<AdminAudit[]>("/api/admin/audit?limit=50", options),
    ]);
    setStats(overview);
    setUsers(adminUsers);
    setAudit(auditRows);
  }, [query]);

  const unlock = async () => {
    if (!user || !password) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string }>("/api/admin/session", {
        method: "POST",
        auth: true,
        body: { email: user.email, password },
      });
      setAdminToken(res.token);
      await loadControlRoom(res.token);
      setPassword("");
    } catch (error) {
      Alert.alert(
        error instanceof ApiError && error.status === 403 ? "Access denied" : "Control room unavailable",
        error instanceof Error ? error.message : "Admin authorization failed.",
      );
      setAdminToken(null);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!adminToken) return;
    setRefreshing(true);
    try {
      await loadControlRoom(adminToken);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setAdminToken(null);
        setStats(null);
        setUsers([]);
        setAudit([]);
        Alert.alert("Admin session ended", "Unlock the control room again to continue.");
      } else {
        Alert.alert("Refresh failed", "The control room could not be refreshed.");
      }
    } finally {
      setRefreshing(false);
    }
  };

  const changeUserState = async (target: AdminUser) => {
    if (!adminToken) return;
    const action = target.is_active ? "suspend" : "restore";
    if (action === "suspend") {
      Alert.alert("Suspend user?", `${target.name} will be signed out and unable to log in.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Suspend", style: "destructive", onPress: () => void applyUserState(target, action) },
      ]);
      return;
    }
    await applyUserState(target, action);
  };

  const applyUserState = async (target: AdminUser, action: "suspend" | "restore") => {
    if (!adminToken) return;
    try {
      await apiFetch(`/api/admin/users/${target.id}/${action}`, {
        method: "POST",
        auth: false,
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      await loadControlRoom(adminToken);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setAdminToken(null);
        Alert.alert("Admin session ended", "Unlock the control room again to continue.");
      } else {
        Alert.alert("Action failed", error instanceof Error ? error.message : "Please try again.");
      }
    }
  };

  if (!isSuperAdmin || !user) return null;

  if (!adminToken) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-12 pt-14">
        <Pressable onPress={() => router.back()} className="mb-8 flex-row items-center gap-2">
          <Feather name="chevron-left" size={20} color="#8b91a0" />
          <Text className="font-sans text-foreground-muted">Back</Text>
        </Pressable>
        <Text className="font-sans-semibold text-2xl text-foreground">Control room</Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-foreground-muted">
          Unlock with the same password used for your normal account login. The admin session is separate and short-lived.
        </Text>
        <View className="mt-8 gap-3 rounded-card border border-border-hairline bg-surface p-4">
          <Text className="font-sans-medium text-foreground">Administrator re-authentication</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Account password"
            placeholderTextColor="#8b91a0"
            className="rounded-control border border-border-hairline bg-surface-sunken px-3.5 py-3 font-sans text-foreground"
          />
          <Button label="Unlock control room" loading={loading} disabled={!password} variant="accent" onPress={unlock} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-5 pb-16 pt-14"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="font-sans-semibold text-2xl text-foreground">Control room</Text>
          <Text className="mt-1 font-sans text-sm text-foreground-muted">Platform administration</Text>
        </View>
        <Pressable
          onPress={() => { setAdminToken(null); setStats(null); setUsers([]); setAudit([]); }}
          className="rounded-control border border-border-hairline px-3 py-2 active:opacity-70"
        >
          <Text className="font-sans-medium text-xs text-foreground">Lock</Text>
        </Pressable>
      </View>

      {stats ? (
        <View className="flex-row flex-wrap gap-3">
          {Object.entries(stats).map(([key, value]) => (
            <View key={key} className="w-[47%] rounded-card border border-border-hairline bg-surface p-4">
              <Text className="font-mono text-2xl text-foreground">{value}</Text>
              <Text className="mt-1 font-sans text-xs uppercase tracking-wider text-foreground-subtle">
                {key.replaceAll("_", " ")}
              </Text>
            </View>
          ))}
        </View>
      ) : <Spinner />}

      <View className="mt-8">
        <Text className="font-sans-semibold text-lg text-foreground">Users</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void refresh()}
          placeholder="Search name or email"
          placeholderTextColor="#8b91a0"
          className="mt-3 rounded-control border border-border-hairline bg-surface px-3.5 py-3 font-sans text-foreground"
        />
        <View className="mt-3 gap-2">
          {users.map((target) => (
            <View key={target.id} className="rounded-card border border-border-hairline bg-surface p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="font-sans-medium text-foreground">{target.name}</Text>
                  <Text className="mt-1 font-sans text-xs text-foreground-muted">{target.email}</Text>
                  <Text className="mt-1 font-sans text-xs text-foreground-subtle">
                    {target.role} · {target.is_active ? "active" : "suspended"}
                  </Text>
                </View>
                {target.id !== user.id && (
                  <Pressable onPress={() => void changeUserState(target)} className="rounded-control border border-border-hairline px-3 py-2">
                    <Text className="font-sans-medium text-xs text-foreground">{target.is_active ? "Suspend" : "Restore"}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="mt-8">
        <Text className="font-sans-semibold text-lg text-foreground">Administrative audit</Text>
        <View className="mt-3 gap-2">
          {audit.length === 0 ? (
            <Text className="font-sans text-sm text-foreground-muted">No administrative actions recorded yet.</Text>
          ) : audit.map((entry) => (
            <View key={entry.id} className="rounded-card border border-border-hairline bg-surface p-4">
              <Text className="font-sans-medium text-sm text-foreground">{entry.action}</Text>
              <Text className="mt-1 font-sans text-xs text-foreground-muted">
                {entry.actor_name}{entry.target_name ? ` → ${entry.target_name}` : ""}
              </Text>
              <Text className="mt-1 font-sans text-xs text-foreground-subtle">
                {new Date(entry.created_at).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
