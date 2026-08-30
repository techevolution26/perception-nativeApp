// app/users/[id].tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Avatar from "../../components/ui/Avatar";
import Pill from "../../components/ui/Pill";
import Button from "../../components/ui/Button";
import PerceptionCard from "../../components/PerceptionCard";
import { apiFetch } from "../../lib/api";
import useCurrentUser from "../../hooks/useCurrentUser";
import useGuardAction from "../../hooks/useGuardAction";
import type { UserProfile, Perception } from "../../types/models";

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useCurrentUser();
  const guard = useGuardAction();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [perceptions, setPerceptions] = useState<Perception[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  const isOwnProfile = me?.id === Number(id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, p] = await Promise.all([
        apiFetch<UserProfile>(`/api/users/${id}`, { auth: false }),
        apiFetch<Perception[]>(`/api/users/${id}/perceptions`, { auth: false }),
      ]);
      setUser(u);
      setPerceptions(p);

      if (me && !isOwnProfile) {
        const followers = await apiFetch<{ id: number }[]>(`/api/users/${id}/followers`, { auth: false });
        setIsFollowing(followers.some((f) => f.id === me.id));
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }, [id, me, isOwnProfile]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = async () => {
    if (!me) {
      Alert.alert("Sign in required", "Log in to follow this user.");
      return;
    }
    setFollowBusy(true);
    try {
      await apiFetch(`/api/users/${id}/follow`, { method: isFollowing ? "DELETE" : "POST" });
      setIsFollowing((f) => !f);
    } catch {
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-background" style={{ paddingTop: insets.top }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="rounded-control p-1">
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-10">
        <View className="items-center py-4">
          <Avatar uri={user.avatar_url} size="xl" />
          <Text className="mt-3 font-sans-semibold text-xl text-foreground">{user.name}</Text>
          {user.profession && <Text className="font-sans text-accent">{user.profession}</Text>}
          {user.bio && <Text className="mt-2 text-center font-sans text-foreground-muted">{user.bio}</Text>}

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
                label="Message"
                variant="outline"
                size="sm"
                icon={<Feather name="message-circle" size={14} color="#666c7a" />}
                onPress={() => guard(() => router.push(`/(tabs)/messages/${user.id}`))}
              />
            </View>
          )}

          <View className="mt-5 flex-row flex-wrap justify-center gap-2">
            <Pill label={`${user.perceptions_count} perceptions`} />
            <Pressable onPress={() => router.push(`/users/${id}/followers`)}>
              <Pill label={`${user.followers_count} followers`} />
            </Pressable>
            <Pressable onPress={() => router.push(`/users/${id}/following`)}>
              <Pill label={`${user.following_count} following`} />
            </Pressable>
            <Pill label={`${user.topics_count} topics`} tone="accent" />
          </View>
        </View>

        <Text className="mb-3 mt-4 font-sans-semibold text-lg text-foreground">Recent perceptions</Text>
        {perceptions.length === 0 ? (
          <Text className="py-8 text-center font-sans italic text-foreground-subtle">No perceptions yet.</Text>
        ) : (
          <View className="gap-4">
            {perceptions.map((p, i) => (
              <PerceptionCard key={p.id} perception={p} index={i} isOwner={isOwnProfile} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
