// app/(tabs)/messages/index.tsx
import { useEffect } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Avatar from "../../../components/ui/Avatar";
import VantageMark from "../../../components/ui/VantageMark";
import { useConversations } from "../../../hooks/useConversations";
import useCurrentUser from "../../../hooks/useCurrentUser";

export default function ConversationsScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading } = useCurrentUser();
  const { data: conversations = [], isLoading } = useConversations(Boolean(user));

  // Defense in depth — the tab bar already blocks guests from reaching this
  // via the tab press, but it's still a directly-addressable route. Waits
  // for auth hydration to actually finish (not a guessed timeout) before
  // deciding there's no session — otherwise a genuinely logged-in user
  // could get bounced to login while their token is still being restored.
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/(auth)/login");
    }
  }, [loading, user]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3">
        <Text className="font-sans-semibold text-xl text-foreground">Messages</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="px-2 pb-10"
          ListEmptyComponent={
            <View className="mt-16 items-center gap-3">
              <VantageMark size={30} color="#8b91a0" />
              <Text className="font-sans text-sm text-foreground-subtle">No conversations yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(tabs)/messages/${item.id}`)}
              className="flex-row items-center gap-3 rounded-control px-2.5 py-2.5 active:bg-surface-hover"
            >
              <View className="relative">
                <Avatar uri={item.avatar_url} size="md" />
                {item.unread > 0 && (
                  <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-accent">
                    <Text className="font-mono text-[11px] font-bold text-accent-on">{item.unread}</Text>
                  </View>
                )}
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-baseline justify-between gap-2">
                  <Text numberOfLines={1} className="font-sans-medium text-foreground">
                    {item.name}
                  </Text>
                  {item.lastMessage && (
                    <Text className="font-mono text-[11px] text-foreground-subtle">
                      {new Date(item.lastMessage).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  )}
                </View>
                {item.lastMessagePreview && (
                  <Text numberOfLines={1} className="mt-0.5 font-sans text-sm text-foreground-subtle">
                    {item.lastMessagePreview}
                  </Text>
                )}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
