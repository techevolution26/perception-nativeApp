import Spinner from "../../components/ui/Spinner";
// app/users/[id].tsx
import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Avatar from "../../components/ui/Avatar";
import Pill from "../../components/ui/Pill";
import Button from "../../components/ui/Button";
import VerifiedBadge from "../../components/ui/VerifiedBadge";
import PerceptionCard from "../../components/PerceptionCard";
import SettingsPanel from "../../components/SettingsPanel";
import { apiFetch, API_BASE } from "../../lib/api";
import { getToken } from "../../lib/storage";
import useCurrentUser from "../../hooks/useCurrentUser";
import useGuardAction from "../../hooks/useGuardAction";
import useAuthStore from "../../store/useAuthStore";
import type { UserProfile, Perception, Subscription } from "../../types/models";
import { File } from "expo-file-system";

type ProfileTab = "posts" | "analytics" | "settings";

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useCurrentUser();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const guard = useGuardAction();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [perceptions, setPerceptions] = useState<Perception[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("posts");
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const isOwnProfile = me?.id === Number(id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, p] = await Promise.all([
        apiFetch<UserProfile>(`/api/users/${id}`, { auth: Boolean(me) }),
        apiFetch<Perception[]>(`/api/users/${id}/perceptions`, { auth: false }),
      ]);
      setUser(u);
      setPerceptions(p);

      if (me && isOwnProfile) {
        const sub = await apiFetch<Subscription>("/api/subscription");
        setSubscription(sub);
      }

      if (me && !isOwnProfile) {
        setIsFollowing(u.is_following);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }, [id, me, isOwnProfile]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const toggleFollow = async () => {
    if (!me) {
      Alert.alert("Sign in required", "Log in to follow this user.");
      return;
    }
    setFollowBusy(true);
    try {
      await apiFetch(`/api/users/${id}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });
      await load();
    } catch {
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setFollowBusy(false);
    }
  };

  const startEditing = () => {
    if (!user) return;
    setEditName(user.name);
    setEditBio(user.bio || "");
    setEditAvatar(null);
    setEditing(true);
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to change your avatar.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setEditAvatar(result.assets[0]);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);

    try {
      // Name uses the JSON endpoint.
      if (editName.trim() && editName.trim() !== user.name) {
        await apiFetch("/api/user", {
          method: "PUT",
          body: {
            name: editName.trim(),
          },
        });
      }

      // Bio and avatar use multipart/form-data; professional identity has its own structured editor.
      const form = new FormData();

      form.append("bio", editBio);

      if (editAvatar) {
        const file = new File(editAvatar.uri);
        form.append("avatar", file);
      }

      const token = await getToken();

      const res = await fetch(`${API_BASE}/api/user/profile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      await refreshMe();
      await load();

      setEditing(false);
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePerception = (perception: Perception) => {
    Alert.alert(
      "Delete perception?",
      "This action is permanent and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/perceptions/${perception.id}`, {
                method: "DELETE",
              });
              setPerceptions((current) =>
                current.filter((item) => item.id !== perception.id),
              );
            } catch (err) {
              Alert.alert(
                "Delete failed",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  if (loading || !user) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ paddingTop: insets.top }}
      >
        <Spinner />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="rounded-control p-1"
          hitSlop={8}
        >
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        {isOwnProfile &&
          !editing &&
          (tab === "posts" || tab === "analytics") && (
            <Pressable
              onPress={startEditing}
              className="rounded-control p-1"
              hitSlop={8}
              accessibilityLabel="Edit profile"
            >
              <Feather name="edit-2" size={19} color="#8b91a0" />
            </Pressable>
          )}
      </View>

      <ScrollView contentContainerClassName="pb-10">
        <View className="items-center px-4 py-4">
          <View className="relative">
            <Avatar uri={editAvatar?.uri ?? user.avatar_url} size="xl" />
            {editing && (
              <Pressable
                onPress={pickAvatar}
                className="absolute -bottom-1 -right-1 rounded-full bg-foreground p-2"
                accessibilityLabel="Change avatar"
              >
                <Feather name="camera" size={14} color="#fcfcfb" />
              </Pressable>
            )}
          </View>

          {editing ? (
            <View className="mt-4 w-full gap-3">
              <View>
                <Text className="mb-1 font-sans-medium text-xs text-foreground-subtle">
                  Name
                </Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  className="rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 text-center font-sans text-foreground"
                />
              </View>
              <Button
                label="Edit professional identity"
                variant="outline"
                onPress={() => router.push("/professional-identity")}
                disabled={saving}
              />
              <View>
                <Text className="mb-1 font-sans-medium text-xs text-foreground-subtle">
                  Bio
                </Text>
                <TextInput
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="A little about you"
                  placeholderTextColor="#8b91a0"
                  multiline
                  className="min-h-[80px] rounded-control border border-border-hairline bg-surface-sunken px-3 py-2.5 text-center font-sans text-foreground"
                />
              </View>
              <View className="mt-1 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label="Cancel"
                    variant="outline"
                    onPress={() => setEditing(false)}
                    disabled={saving}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label={saving ? "Saving…" : "Save"}
                    variant="accent"
                    loading={saving}
                    onPress={saveProfile}
                  />
                </View>
              </View>
            </View>
          ) : (
            <>
              <View className="mt-3 flex-row items-center justify-center">
                <Text className="font-sans-semibold text-xl text-foreground">
                  {user.name}
                </Text>
                {user.primary_professional_role && (
                  <View className="ml-2">
                    <VerifiedBadge
                      roleCode={user.primary_professional_role}
                      label={
                        user.primary_professional_role_label ??
                        user.profession ??
                        "Professional"
                      }
                      verified={user.verification_status === "VERIFIED"}
                    />
                  </View>
                )}
              </View>
              {user.primary_professional_role_label ? (
                <Text className="font-sans text-accent">
                  {user.primary_professional_role_label}
                </Text>
              ) : user.profession ? (
                <Text className="font-sans text-accent">{user.profession}</Text>
              ) : null}
              {isOwnProfile &&
                (user.professional_role_labels?.length ?? 0) > 0 && (
                  <View className="mt-2 flex-row flex-wrap justify-center gap-1.5">
                    {user.professional_role_labels.slice(0, 4).map((label) => (
                      <Pill key={label} label={label} />
                    ))}
                    {user.professional_role_labels.length > 4 && (
                      <Pill
                        label={`+${user.professional_role_labels.length - 4}`}
                      />
                    )}
                  </View>
                )}
              {user.bio && (
                <Text className="mt-2 text-center font-sans text-foreground-muted">
                  {user.bio}
                </Text>
              )}

              {!isOwnProfile && (
                <View className="mt-4 flex-row gap-2">
                  <Button
                    label={isFollowing ? "Following" : "Follow"}
                    variant={isFollowing ? "outline" : "primary"}
                    size="sm"
                    loading={followBusy}
                    onPress={toggleFollow}
                  />
                  <Button
                    label={
                      user.can_message ? "Message" : "Mutual follow required"
                    }
                    variant="outline"
                    size="sm"
                    icon={
                      <Feather
                        name="message-circle"
                        size={14}
                        color="#666c7a"
                      />
                    }
                    disabled={!user.can_message}
                    onPress={() =>
                      guard(() => router.push(`/(tabs)/messages/${user.id}`))
                    }
                  />
                </View>
              )}

              <View className="mt-5 flex-row flex-wrap justify-center gap-2">
                <Pill label={`${user.perceptions_count} perceptions`} />
                <Pressable
                  onPress={() => router.push(`/users/${id}/followers`)}
                >
                  <Pill label={`${user.followers_count} followers`} />
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/users/${id}/following`)}
                >
                  <Pill label={`${user.following_count} following`} />
                </Pressable>
                <Pressable onPress={() => router.push("/topics")}>
                  <Pill label={`${user.topics_count} topics`} tone="accent" />
                </Pressable>
              </View>
            </>
          )}
        </View>

        {isOwnProfile && !editing && (
          <View className="mx-4 mb-2 mt-2 flex-row rounded-control border border-border-hairline bg-surface p-1">
            {(["posts", "analytics", "settings"] as const).map((item) => (
              <Pressable
                key={item}
                onPress={() => setTab(item)}
                className={`flex-1 items-center rounded-control py-2 ${tab === item ? "bg-surface-sunken" : ""}`}
              >
                <Text
                  className={`font-sans-medium text-sm ${tab === item ? "text-foreground" : "text-foreground-subtle"}`}
                >
                  {item === "posts"
                    ? "Posts"
                    : item === "analytics"
                      ? "Analytics"
                      : "Settings"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {isOwnProfile && tab === "analytics" && !editing ? (
          <View className="mx-4 gap-3">
            <View className="rounded-card border border-border-hairline bg-surface p-4">
              <View className="flex-row items-start">
                <View className="flex-1">
                  <Text className="font-sans-semibold text-lg text-foreground">
                    Perception Analytics
                  </Text>
                  <Text className="mt-1 font-sans text-sm leading-5 text-foreground-muted">
                    {subscription?.analytics_enabled
                      ? `Active · ${subscription.plan?.name ?? "subscription"} · ${subscription.max_topics} topic slots`
                      : "Locked until you start a trial or subscribe."}
                  </Text>
                </View>
                <Text className="text-2xl">
                  {user.verification_badge ?? "◌"}
                </Text>
              </View>
              <View className="mt-4 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label={
                      subscription?.analytics_enabled
                        ? "Open analytics"
                        : "Unlock analytics"
                    }
                    variant="accent"
                    size="sm"
                    onPress={() =>
                      router.push(
                        subscription?.analytics_enabled
                          ? "/analytics"
                          : "/subscription",
                      )
                    }
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Manage profile"
                    variant="outline"
                    size="sm"
                    onPress={() => router.push("/analytics-profile")}
                  />
                </View>
              </View>
            </View>

            {me && "role" in me && me.role === "SUPER_ADMIN" && (
              <Button
                label="Open control room"
                variant="outline"
                size="sm"
                onPress={() => router.push("/admin")}
              />
            )}

            <View className="rounded-card border border-border-hairline bg-surface p-4">
              <Text className="font-sans-semibold text-base text-foreground">
                Professional verification
              </Text>
              <Text className="mt-1 font-sans text-sm text-foreground-muted">
                {user.verification_status.replace("_", " ").toLowerCase()}
                {user.verification_badge ? ` · ${user.verification_badge}` : ""}
              </Text>
              <Button
                label={
                  user.verification_status === "VERIFIED"
                    ? "Verified"
                    : "Apply / view application"
                }
                variant="outline"
                size="sm"
                disabled={user.verification_status === "VERIFIED"}
                onPress={() => router.push("/verification")}
              />
            </View>
          </View>
        ) : isOwnProfile && tab === "settings" && !editing ? (
          <SettingsPanel />
        ) : (
          !editing && (
            <View className="px-4">
              <Text className="mb-3 mt-4 font-sans-semibold text-lg text-foreground">
                Recent perceptions
              </Text>
              {perceptions.length === 0 ? (
                <Text className="py-8 text-center font-sans italic text-foreground-subtle">
                  No perceptions yet.
                </Text>
              ) : (
                <View className="gap-4">
                  {perceptions.map((p, i) => (
                    <PerceptionCard
                      key={p.id}
                      perception={p}
                      index={i}
                      isOwner={isOwnProfile}
                      showOwnerActions={isOwnProfile}
                      onEdit={(item) =>
                        guard(() => router.push(`/perceptions/${item.id}/edit`))
                      }
                      onDelete={handleDeletePerception}
                      onAnalytics={(item) =>
                        guard(() =>
                          router.push(`/perceptions/${item.id}/analytics`),
                        )
                      }
                    />
                  ))}
                </View>
              )}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}
