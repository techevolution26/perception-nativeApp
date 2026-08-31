// components/TopicsCarousel.tsx
//
// Was missing entirely from the first mobile build — the web app's home
// feed always shows a horizontal rail of topic avatars above the feed
// itself; this ports that over.
import { ScrollView, View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { resolveMediaUrl } from "../lib/api";
import type { Topic } from "../types/models";

export default function TopicsCarousel({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-b border-border-hairline"
      contentContainerClassName="gap-4 px-4 py-3"
    >
      {topics.map((topic) => (
        <Pressable key={topic.id} onPress={() => router.push(`/topics/${topic.id}`)} className="w-16 items-center gap-1.5">
          <View className="h-16 w-16 overflow-hidden rounded-full border border-border-hairline bg-surface-sunken">
            {topic.image_url ? (
              <Image source={{ uri: resolveMediaUrl(topic.image_url) }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center px-1">
                <Text numberOfLines={2} className="text-center font-sans-medium text-[10px] text-foreground-muted">
                  {topic.name}
                </Text>
              </View>
            )}
          </View>
          <Text numberOfLines={1} className="w-full text-center font-sans text-xs text-foreground-muted">
            {topic.name}
          </Text>
        </Pressable>
      ))}

      {/* The web app doesn't have an obvious "browse all topics" entry
          point either — this is a deliberate small addition, since
          otherwise the only way to reach /topics on mobile is via the
          profile page's topic-count pill. */}
      <Pressable onPress={() => router.push("/topics")} className="w-16 items-center gap-1.5">
        <View className="h-16 w-16 items-center justify-center rounded-full border border-dashed border-border-strong bg-surface-sunken">
          <Feather name="grid" size={18} color="#8b91a0" />
        </View>
        <Text numberOfLines={1} className="w-full text-center font-sans text-xs text-foreground-muted">
          Browse
        </Text>
      </Pressable>
    </ScrollView>
  );
}
