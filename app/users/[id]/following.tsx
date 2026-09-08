import Spinner from "../../../components/ui/Spinner";
// app/users/[id]/following.tsx
import { useEffect, useState } from "react";
import { Text, FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import ProfileListItem from "../../../components/ui/ProfileListItem";
import { apiFetch } from "../../../lib/api";
import type { UserSlim } from "../../../types/models";

export default function FollowingScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [following, setFollowing] = useState<UserSlim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<UserSlim[] | { data: UserSlim[] }>(`/api/users/${id}/following`, {
      auth: false,
    })
      .then((data) =>
        setFollowing(Array.isArray(data) ? data : data.data || []),
      )
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="rounded-control p-1"
        >
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <Text className="font-sans-semibold text-lg text-foreground">
          Following
        </Text>
      </View>

      {loading ? (
        <Spinner className="mt-8" />
      ) : (
        <FlatList
          data={following}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-3 px-4 pb-10"
          ListEmptyComponent={
            <Text className="mt-6 text-center font-sans text-foreground-subtle">
              Not following anyone yet.
            </Text>
          }
          renderItem={({ item }) => (
            <ProfileListItem
              user={item}
              onPress={() => router.push(`/users/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}
