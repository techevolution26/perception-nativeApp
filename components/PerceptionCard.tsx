// components/PerceptionCard.tsx

import { useState } from "react";
import { View, Text, Pressable, Share, Alert } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { format, isThisYear } from "date-fns";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useColorScheme } from "nativewind";

import Avatar from "./ui/Avatar";
import Card from "./ui/Card";
import VerifiedBadge from "./ui/VerifiedBadge";
import ActionMenu, { type ActionMenuItem } from "./ui/ActionMenu";

import { resolveMediaUrl } from "../lib/api";
import type { Perception } from "../types/models";

interface PerceptionCardProps {
  perception: Perception;
  onLike?: (id: number) => void;
  onEdit?: (perception: Perception) => void;
  onDelete?: (perception: Perception) => void;
  onAnalytics?: (perception: Perception) => void;
  showOwnerActions?: boolean;
  isOwner?: boolean;
  detailView?: boolean;
  index?: number;
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

// Public web deployment used for canonical share links.
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

function perceptionShareUrl(id: number): string | null {
  if (!WEB_URL) {
    return null;
  }

  return `${WEB_URL.replace(/\/$/, "")}/perceptions/${id}`;
}

function isVideoUrl(uri: string): boolean {
  return /\.(mp4|mov|m4v|webm|ogg|avi|mkv)(?:[?#].*)?$/i.test(uri);
}

/**
 * Native video renderer.
 *
 * Only mounted for actual video URLs. This prevents expo-video from being
 * instantiated for image media.
 */
function VideoMediaPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return (
    <View className="overflow-hidden bg-black">
      <VideoView
        player={player}
        style={{
          width: "100%",
          height: 220,
        }}
        contentFit="cover"
        nativeControls
      />
    </View>
  );
}

/**
 * Native image renderer.
 */
function ImageMediaPreview({ uri }: { uri: string }) {
  return (
    <Image
      source={{ uri }}
      style={{
        width: "100%",
        height: 220,
      }}
      contentFit="cover"
      transition={150}
    />
  );
}

/**
 * Resolve backend-relative media URLs before passing them to native
 * image/video components.
 */
function MediaPreview({ uri: rawUri }: { uri: string }) {
  const uri = resolveMediaUrl(rawUri);

  if (!uri) {
    return null;
  }

  if (isVideoUrl(uri)) {
    return <VideoMediaPreview uri={uri} />;
  }

  return <ImageMediaPreview uri={uri} />;
}

export default function PerceptionCard({
  perception,
  onLike,
  onEdit,
  onDelete,
  onAnalytics,
  showOwnerActions = false,
  isOwner = false,
  detailView = false,
  index = 0,
}: PerceptionCardProps) {
  const {
    id,
    user,
    body,
    media_url,
    likes_count,
    comments_count,
    liked_by_user,
    topic,
    created_at,
  } = perception;

  const { colorScheme } = useColorScheme();

  const surfaceColor = colorScheme === "dark" ? "#14151a" : "#ffffff";

  const [menuOpen, setMenuOpen] = useState(false);

  /*
   * Feed cards clamp long perceptions.
   *
   * Detail pages always display the complete perception.
   */
  const shouldClamp = !detailView && body.length > 140;

  const goToDetail = () => {
    if (detailView) {
      return;
    }

    router.push(`/perceptions/${id}`);
  };

  const handleShare = async () => {
    const url = perceptionShareUrl(id);

    const preview = body.length > 140 ? `${body.slice(0, 140)}…` : body;

    try {
      await Share.share(
        url
          ? {
              message: `"${preview}" — ${user.name} on Perception\n${url}`,
              url,
            }
          : {
              message: `"${preview}" — ${user.name} on Perception`,
            },
      );
    } catch {
      // User dismissed the native share sheet.
    }
  };

  const handleCopyLink = async () => {
    const url = perceptionShareUrl(id);

    await Clipboard.setStringAsync(url ?? body);

    Alert.alert(url ? "Link copied" : "Text copied");
  };

  const handleEdit = () => {
    setMenuOpen(false);
    onEdit?.(perception);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    onDelete?.(perception);
  };

  const menuItems: ActionMenuItem[] = [
    {
      label: "Share",
      icon: "share",
      onPress: handleShare,
    },
    {
      label: perceptionShareUrl(id) ? "Copy link" : "Copy text",
      icon: "link",
      onPress: handleCopyLink,
    },

    ...(showOwnerActions && isOwner
      ? [
          {
            label: "Edit",
            icon: "edit-2" as const,
            onPress: handleEdit,
          },
          ...(onAnalytics ? [{ label: "Perception analytics", icon: "bar-chart-2" as const, onPress: () => onAnalytics(perception) }] : []),
          {
            label: "Delete",
            icon: "trash-2" as const,
            onPress: handleDelete,
            destructive: true,
          },
        ]
      : []),
  ];

  const handleLikePress = (event: { stopPropagation?: () => void }) => {
    event.stopPropagation?.();

    onLike?.(id);
  };

  const handleCommentsPress = (event: { stopPropagation?: () => void }) => {
    event.stopPropagation?.();

    if (!detailView) {
      router.push(`/perceptions/${id}`);
    }
  };

  const handleMorePress = (event: { stopPropagation?: () => void }) => {
    event.stopPropagation?.();

    setMenuOpen(true);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(320)}
    >
      <Card className="overflow-hidden">
        {/* ------------------------------------------------------------- */}
        {/* Main navigation area                                         */}
        {/* ------------------------------------------------------------- */}

        <Pressable
          onPress={goToDetail}
          disabled={detailView}
          accessibilityRole={detailView ? undefined : "button"}
        >
          {/* ----------------------------------------------------------- */}
          {/* Header                                                      */}
          {/* ----------------------------------------------------------- */}

          <View className="flex-row items-start px-3.5 pt-3.5">
            {/* Avatar */}
            <Pressable className="mr-3" onPress={(event) => { event.stopPropagation?.(); router.push(`/users/${user.id}`); }} accessibilityRole="button" accessibilityLabel={`Open ${user.name}'s profile`}>
              <Avatar uri={user.avatar_url} size="md" />
            </Pressable>

            {/* Flexible identity column */}
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center min-w-0">
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="max-w-[80%] font-sans-medium text-[15px] text-foreground"
                >
                  {user.name}
                </Text>
                {user.primary_professional_role && (
                  <View className="ml-1.5">
                    <VerifiedBadge roleCode={user.primary_professional_role} compact verified={user.verification_status === "VERIFIED"} />
                  </View>
                )}
              </View>

              {topic?.name && (
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="mt-0.5 font-sans text-xs text-foreground-subtle"
                >
                  a view on{" "}
                  <Text className="font-sans-medium text-foreground-muted">
                    {topic.name}
                  </Text>
                </Text>
              )}
            </View>

            {/* --------------------------------------------------------- */}
            {/* Timestamp + More                                         */}
            {/* --------------------------------------------------------- */}

            <View className="ml-2 flex-row items-center">
              <Text className="mr-1.5 font-mono text-[10px] text-foreground-subtle">
                {formatRelativeTime(created_at)}
              </Text>

              <Pressable
                onPress={handleMorePress}
                className="rounded-control p-1.5"
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="More actions"
              >
                <Feather name="more-horizontal" size={19} color="#8b91a0" />
              </Pressable>
            </View>
          </View>

          {/* ----------------------------------------------------------- */}
          {/* Body                                                        */}
          {/* ----------------------------------------------------------- */}

          <View className="relative px-3.5 pb-2 pt-2.5">
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
                style={{
                  position: "absolute",
                  bottom: 8,
                  left: 0,
                  right: 0,
                  height: 28,
                }}
              />
            )}
          </View>

          {/* ----------------------------------------------------------- */}
          {/* Media                                                       */}
          {/* ----------------------------------------------------------- */}

          {media_url && <MediaPreview uri={media_url} />}
        </Pressable>

        {/* ------------------------------------------------------------- */}
        {/* Action bar                                                    */}
        {/* ------------------------------------------------------------- */}

        <View className="mt-auto flex-row items-center gap-1 border-t border-border-hairline px-2 py-1.5">
          <Pressable
            onPress={handleLikePress}
            className="flex-row items-center gap-1.5 rounded-control px-2.5 py-2"
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={
              liked_by_user ? "Unlike perception" : "Like perception"
            }
            accessibilityState={{
              selected: liked_by_user,
            }}
          >
            <Feather
              name="heart"
              size={17}
              color={liked_by_user ? "#f2a33c" : "#666c7a"}
            />

            <Text className="font-mono text-xs text-foreground-muted">
              {likes_count}
            </Text>
          </Pressable>

          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              router.push("/analytics");
            }}
            className="flex-row items-center gap-1.5 rounded-control px-2.5 py-2"
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="View analytics"
          >
            <Feather name="bar-chart-2" size={17} color="#666c7a" />
          </Pressable>

          <Pressable
            onPress={handleCommentsPress}
            disabled={detailView}
            className={`flex-row items-center gap-1.5 rounded-control px-2.5 py-2 ${
              detailView ? "opacity-40" : ""
            }`}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="View comments"
          >
            <Feather name="message-circle" size={17} color="#666c7a" />

            <Text className="font-mono text-xs text-foreground-muted">
              {comments_count}
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* --------------------------------------------------------------- */}
      {/* Action menu                                                     */}
      {/* --------------------------------------------------------------- */}

      <ActionMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
      />
    </Animated.View>
  );
}
