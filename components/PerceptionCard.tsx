// components/PerceptionCard.tsx
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { format, isThisYear } from "date-fns";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useColorScheme } from "nativewind";
import Avatar from "./ui/Avatar";
import Card from "./ui/Card";
import type { Perception } from "../types/models";

interface PerceptionCardProps {
  perception: Perception;
  onLike?: (id: number) => void;
  onEdit?: (perception: Perception) => void;
  onDelete?: (perception: Perception) => void;
  showOwnerActions?: boolean;
  isOwner?: boolean;
  detailView?: boolean;
  index?: number; // for staggered entrance animation in a list
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d`;
  return isThisYear(date) ? format(date, "d MMM") : format(date, "d MMM yy");
}

function MediaPreview({ uri }: { uri: string }) {
  const isVideo = /\.(mp4|webm|ogg)$/i.test(uri);
  const player = useVideoPlayer(isVideo ? uri : "", (p) => {
    p.loop = false;
  });

  if (isVideo) {
    return <VideoView player={player} style={{ width: "100%", height: 220 }} nativeControls contentFit="cover" />;
  }
  return <Image source={{ uri }} style={{ width: "100%", height: 220 }} contentFit="cover" transition={150} />;
}

export default function PerceptionCard({
  perception,
  onLike,
  onEdit,
  onDelete,
  showOwnerActions = false,
  isOwner = false,
  detailView = false,
  index = 0,
}: PerceptionCardProps) {
  const { id, user, body, media_url, likes_count, comments_count, liked_by_user, topic, created_at } = perception;
  const { colorScheme } = useColorScheme();
  const surfaceColor = colorScheme === "dark" ? "#14151a" : "#ffffff";

  // Long posts get clamped in the feed (not on the detail page) so one huge
  // perception can't dominate the whole scroll — matches the web app's
  // line-clamp-10 + fade-mask treatment for anything over 140 characters.
  const shouldClamp = !detailView && body.length > 140;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(320)}>
      <Card className="overflow-hidden">
        <View className="flex-row items-start gap-3 px-3.5 pt-3.5">
          <Avatar uri={user.avatar_url} size="md" />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-start justify-between gap-2">
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-sans-medium text-[15px] text-foreground">
                  {user.name}
                </Text>
                {topic?.name && (
                  <Text numberOfLines={1} className="font-sans text-xs text-foreground-subtle">
                    a view on <Text className="font-sans-medium text-foreground-muted">{topic.name}</Text>
                  </Text>
                )}
              </View>
              <Text className="ml-2 font-mono text-[11px] text-foreground-subtle">{formatRelativeTime(created_at)}</Text>
            </View>
          </View>

          {showOwnerActions && isOwner && (
            <View className="flex-row gap-1">
              <Pressable onPress={() => onEdit?.(perception)} className="rounded-control p-1.5">
                <Feather name="edit-2" size={15} color="#8b91a0" />
              </Pressable>
              <Pressable onPress={() => onDelete?.(perception)} className="rounded-control p-1.5">
                <Feather name="trash-2" size={15} color="#e5484d" />
              </Pressable>
            </View>
          )}
        </View>

        <View className="relative px-3.5 pb-2 pt-2">
          <Text
            numberOfLines={shouldClamp ? 10 : undefined}
            className="font-sans text-[15px] leading-relaxed text-foreground"
          >
            {body}
          </Text>
          {shouldClamp && (
            <LinearGradient
              colors={["transparent", surfaceColor]}
              pointerEvents="none"
              style={{ position: "absolute", bottom: 8, left: 0, right: 0, height: 24 }}
            />
          )}
        </View>

        {media_url && <MediaPreview uri={media_url} />}

        <View className="mt-auto flex-row items-center gap-1 border-t border-border-hairline px-2 py-1.5">
          <Pressable onPress={() => onLike?.(id)} className="flex-row items-center gap-1.5 rounded-control px-2.5 py-2">
            <Feather name="heart" size={17} color={liked_by_user ? "#f2a33c" : "#666c7a"} />
            <Text className="font-mono text-xs text-foreground-muted">{likes_count}</Text>
          </Pressable>

          {!detailView ? (
            <Link href={`/perceptions/${id}`} asChild>
              <Pressable className="flex-row items-center gap-1.5 rounded-control px-2.5 py-2">
                <Feather name="message-circle" size={17} color="#666c7a" />
                <Text className="font-mono text-xs text-foreground-muted">{comments_count}</Text>
              </Pressable>
            </Link>
          ) : (
            <View className="flex-row items-center gap-1.5 rounded-control px-2.5 py-2 opacity-40">
              <Feather name="message-circle" size={17} color="#666c7a" />
              <Text className="font-mono text-xs text-foreground-muted">{comments_count}</Text>
            </View>
          )}
        </View>
      </Card>
    </Animated.View>
  );
}
