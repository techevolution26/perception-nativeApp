import Spinner from "../../components/ui/Spinner";
// app/perceptions/[id].tsx

import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { AIAnalysisBadge } from "../../components/ui/AIAnalysisBadge";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { File } from "expo-file-system";

import PerceptionCard from "../../components/PerceptionCard";
import PerceiveComposer from "../../components/PerceiveComposer";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import VantageMark from "../../components/ui/VantageMark";

import { usePerceptionDetail } from "../../hooks/usePerceptionDetail";
import useLikeToggle from "../../hooks/useLikeToggle";
import useGuardAction from "../../hooks/useGuardAction";
import useAuthStore from "../../store/useAuthStore";
import { API_BASE, apiFetch, resolveMediaUrl } from "../../lib/api";
import { getToken } from "../../lib/storage";
import { playPostSuccessSound } from "../../lib/sound";

import type { Comment } from "../../types/models";

type MediaAsset = ImagePicker.ImagePickerAsset;

interface CommentItemProps {
  comment: Comment;
  onReplyAdded: (parentId: number, reply: Comment) => void;
  depth?: number;
}

interface CommentComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: (media: MediaAsset | null) => void;
  loading: boolean;
  compact?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}

const MAX_VISUAL_DEPTH = 2;
const INDENT_PER_LEVEL = 18;

/**
 * Pick a photo or video from the device library.
 *
 * This uses the same media picker configuration as the working
 * NewPerception screen.
 */
async function pickCommentMedia(): Promise<MediaAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      "Permission needed",
      "Allow photo or video access to attach media.",
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return result.assets[0];
}

/**
 * Upload a comment/reply using the same native-safe multipart strategy
 * already proven by NewPerceptionScreen.
 *
 * IMPORTANT:
 * Do not construct the file as:
 *
 *   { uri, name, type } as Blob
 *
 * Expo SDK 57's File API gives us a real File object that can be appended
 * directly to FormData.
 */
async function postCommentWithMedia(
  path: string,
  body: string,
  media: MediaAsset | null,
): Promise<Comment> {
  const form = new FormData();

  if (body.trim()) {
    form.append("body", body.trim());
  }

  if (media) {
    const file = new File(media.uri);
    form.append("media", file);
  }

  const token = await getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const text = await res.text();

  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof data.detail === "string"
        ? data.detail
        : typeof data === "string"
          ? data
          : `Request failed with status ${res.status}`;

    throw new Error(detail);
  }

  return data as Comment;
}

/**
 * Comment/reply composer.
 *
 * Uses the same PerceiveComposer text experience while adding a native-safe
 * media attachment path for React Native.
 */
function CommentComposer({
  value,
  onChangeText,
  onSubmit,
  loading,
  compact = false,
  autoFocus = false,
  placeholder = "Write a comment…",
}: CommentComposerProps) {
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [pickingMedia, setPickingMedia] = useState(false);

  const handlePickMedia = async () => {
    if (pickingMedia || loading) return;

    setPickingMedia(true);

    try {
      const picked = await pickCommentMedia();

      if (picked) {
        setMedia(picked);
      }
    } finally {
      setPickingMedia(false);
    }
  };

  const handleSubmit = () => {
    if (!value.trim() && !media) return;

    onSubmit(media);
  };

  const previewUri = media?.uri;
  const isVideo = media?.type === "video";

  return (
    <View>
      {previewUri && (
        <View className="mb-2.5 overflow-hidden rounded-control border border-border-hairline bg-surface">
          <View className="relative">
            {isVideo ? (
              <View className="h-40 w-full items-center justify-center bg-surface-sunken">
                <Feather name="video" size={28} color="#8b91a0" />

                <Text className="mt-1.5 font-sans-medium text-xs text-foreground-muted">
                  Video attached
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: previewUri }}
                style={{
                  width: "100%",
                  height: 160,
                }}
                contentFit="cover"
              />
            )}

            <Pressable
              onPress={() => setMedia(null)}
              className="absolute right-2 top-2 rounded-full bg-foreground p-1.5"
              hitSlop={6}
            >
              <Feather name="x" size={14} color="#fcfcfb" />
            </Pressable>
          </View>
        </View>
      )}

      <PerceiveComposer
        value={value}
        onChangeText={onChangeText}
        onSubmit={handleSubmit}
        loading={loading}
        compact={compact}
        autoFocus={autoFocus}
        placeholder={placeholder}
      />

      <View
        className={
          compact
            ? "mt-1.5 flex-row items-center px-1"
            : "mt-2 flex-row items-center px-1"
        }
      >
        <Pressable
          onPress={handlePickMedia}
          disabled={loading || pickingMedia}
          className="flex-row items-center gap-1.5 rounded-control px-2 py-1.5"
        >
          <Feather
            name={isVideo ? "video" : "image"}
            size={14}
            color="#8b91a0"
          />

          <Text className="font-sans-medium text-xs text-foreground-muted">
            {pickingMedia ? "Opening…" : media ? "Change media" : "Add media"}
          </Text>
        </Pressable>

        {media && (
          <Text
            numberOfLines={1}
            className="ml-2 flex-1 font-sans text-xs text-foreground-subtle"
          >
            {media.fileName || (isVideo ? "Video" : "Image")}
          </Text>
        )}
      </View>
    </View>
  );
}

function CommentMedia({ uri, compact }: { uri: string; compact: boolean }) {
  const isVideo = /\.(mp4|mov|m4v|webm|avi|mkv)(\?.*)?$/i.test(uri);

  if (!isVideo) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: "100%",
          height: compact ? 150 : 180,
          borderRadius: 12,
          marginTop: 8,
        }}
        contentFit="cover"
      />
    );
  }

  return <CommentVideo uri={uri} compact={compact} />;
}

function CommentVideo({ uri, compact }: { uri: string; compact: boolean }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return (
    <View
      className="mt-2 overflow-hidden rounded-control bg-black"
      style={{
        height: compact ? 150 : 180,
      }}
    >
      <VideoView
        player={player}
        style={{
          width: "100%",
          height: "100%",
        }}
        contentFit="cover"
        nativeControls
      />
    </View>
  );
}

/**
 * Recursively fetch descendants.
 *
 * The backend currently returns a comment together with the nested replies
 * it has eagerly loaded. We additionally fetch each reply's descendants so
 * the mobile client does not depend on a fixed backend eager-load depth.
 */
async function hydrateCommentTree(
  comment: Comment,
  visited = new Set<number>(),
): Promise<Comment> {
  if (visited.has(comment.id)) {
    return comment;
  }

  visited.add(comment.id);

  const existingReplies = comment.replies || [];

  try {
    const fetched = await apiFetch<Comment[]>(
      `/api/comments/${comment.id}/replies`,
      {
        auth: false,
      },
    );

    const replyMap = new Map<number, Comment>();

    for (const reply of existingReplies) {
      replyMap.set(reply.id, reply);
    }

    for (const reply of fetched) {
      const existing = replyMap.get(reply.id);

      replyMap.set(reply.id, {
        ...existing,
        ...reply,
        replies: reply.replies || existing?.replies || [],
      });
    }

    const replies = await Promise.all(
      Array.from(replyMap.values()).map((reply) =>
        hydrateCommentTree(reply, visited),
      ),
    );

    return {
      ...comment,
      replies,
    };
  } catch {
    return {
      ...comment,
      replies: existingReplies,
    };
  }
}

async function hydrateCommentList(comments: Comment[]): Promise<Comment[]> {
  const visited = new Set<number>();

  return Promise.all(
    comments.map((comment) => hydrateCommentTree(comment, visited)),
  );
}

/**
 * Comment tree item.
 *
 * UX principles:
 *
 * 1. Root comments are independent discussion entries.
 * 2. Replies are collapsed initially.
 * 3. Typography does not progressively shrink.
 * 4. Indentation is capped so deep threads do not waste the screen width.
 * 5. A vertical rail preserves the relationship between nested replies.
 * 6. Deeper replies become quieter through surface treatment rather than
 *    becoming physically smaller.
 */
function CommentItem({ comment, onReplyAdded, depth = 0 }: CommentItemProps) {
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [showReplies, setShowReplies] = useState(false);
  const [sending, setSending] = useState(false);

  const replies = comment.replies || [];
  const media = resolveMediaUrl(comment.media_url);

  const isRoot = depth === 0;
  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);
  const isDeep = depth >= MAX_VISUAL_DEPTH;

  const submitReply = async (replyMedia: MediaAsset | null) => {
    if (!replyBody.trim() && !replyMedia) return;

    setSending(true);

    try {
      const created = await postCommentWithMedia(
        `/api/comments/${comment.id}/replies`,
        replyBody,
        replyMedia,
      );

      onReplyAdded(comment.id, {
        ...created,
        replies: [],
      });

      playPostSuccessSound();

      setReplyBody("");
      setReplying(false);
      setShowReplies(true);
    } catch (err) {
      Alert.alert(
        "Couldn't reply",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View
      className={isRoot ? "mb-6 border-b border-border-hairline pb-5" : "mb-3"}
      style={
        !isRoot
          ? {
              marginLeft: visualDepth * INDENT_PER_LEVEL,
            }
          : undefined
      }
    >
      <View className="relative">
        {!isRoot && (
          <>
            <View className="absolute bottom-0 left-[-12px] top-0 w-px bg-border-hairline" />

            <View className="absolute left-[-12px] top-5 h-px w-2 bg-border-hairline" />
          </>
        )}

        <View className="flex-row items-start gap-2.5">
          <Avatar uri={comment.user.avatar_url} size={isRoot ? "sm" : "xs"} />

          <View className="min-w-0 flex-1">
            <View
              className={
                isRoot
                  ? "rounded-card border border-border-hairline bg-surface px-3.5 py-3"
                  : isDeep
                    ? "rounded-control border border-border-hairline/60 bg-surface px-3 py-2.5"
                    : "rounded-control bg-surface-sunken/50 px-3 py-2.5"
              }
            >
              <View className="mb-1.5 flex-row items-baseline gap-2">
                <Text
                  numberOfLines={1}
                  className="max-w-[68%] font-sans-semibold text-[15px] text-foreground"
                >
                  {comment.user.name}
                </Text>

                <Text className="font-mono text-[10px] text-foreground-subtle">
                  {new Date(comment.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
                <AIAnalysisBadge status={comment.ai_analysis_status} />
              </View>

              {comment.body && (
                <Text className="font-sans text-[15px] leading-relaxed text-foreground">
                  {comment.body}
                </Text>
              )}

              {media && <CommentMedia uri={media} compact={!isRoot} />}
            </View>

            <View
              className={
                isRoot
                  ? "mt-1.5 flex-row items-center gap-4 px-1"
                  : "mt-1.5 flex-row items-center gap-3 px-1"
              }
            >
              <Pressable
                onPress={() => setReplying((value) => !value)}
                className="flex-row items-center gap-1"
                hitSlop={5}
              >
                <Feather name="corner-up-left" size={13} color="#8b91a0" />

                <Text className="font-sans-medium text-xs text-foreground-muted">
                  {replying ? "Cancel" : "Reply"}
                </Text>
              </Pressable>

              {replies.length > 0 && (
                <Pressable
                  onPress={() => setShowReplies((value) => !value)}
                  className="flex-row items-center gap-1"
                  hitSlop={5}
                >
                  <Feather
                    name={showReplies ? "chevron-up" : "chevron-down"}
                    size={13}
                    color="#8b91a0"
                  />

                  <Text className="font-sans-medium text-xs text-foreground-muted">
                    {showReplies
                      ? "Hide replies"
                      : `${replies.length} ${
                          replies.length === 1 ? "reply" : "replies"
                        }`}
                  </Text>
                </Pressable>
              )}
            </View>

            {replying && (
              <View className="mt-2.5">
                <CommentComposer
                  value={replyBody}
                  onChangeText={setReplyBody}
                  onSubmit={submitReply}
                  loading={sending}
                  compact
                  autoFocus
                  placeholder="Write your reply…"
                />
              </View>
            )}

            {showReplies && replies.length > 0 && (
              <View className="mt-3">
                {replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    onReplyAdded={onReplyAdded}
                    depth={depth + 1}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function PerceptionDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const me = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const guard = useGuardAction();
  const toggleLike = useLikeToggle();

  const { perception, comments, loading, error, setPerception, setComments } =
    usePerceptionDetail(id);

  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [hydratingComments, setHydratingComments] = useState(false);
  const hydratedCommentsRef = useRef<Comment[] | null>(null);

  // Count one authenticated view per perception per day. The backend
  // deduplicates the event, so revisiting a perception does not manufacture
  // an inflated view count.
  useEffect(() => {
    if (!token || !perception) return;
    apiFetch(`/api/analytics/events`, {
      method: "POST",
      body: { perception_id: perception.id, event_type: "VIEW" },
    }).catch(() => {
      // Analytics telemetry must never interrupt the perception experience.
    });
  }, [token, perception]);

  /**
   * Hydrate the complete descendant tree after the root comments arrive.
   */
  useEffect(() => {
    if (
      !comments.length ||
      comments === hydratedCommentsRef.current
    ) {
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      setHydratingComments(true);

      try {
        const hydrated = await hydrateCommentList(comments);

        if (!cancelled) {
          hydratedCommentsRef.current = hydrated;
          setComments(hydrated);
        }
      } finally {
        if (!cancelled) {
          setHydratingComments(false);
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [comments, setComments]);

  const submitComment = async (commentMedia: MediaAsset | null) => {
    if (!commentBody.trim() && !commentMedia) {
      return;
    }

    setPosting(true);

    try {
      const created = await postCommentWithMedia(
        `/api/perceptions/${id}/comments`,
        commentBody,
        commentMedia,
      );

      setComments((current) => [
        {
          ...created,
          replies: [],
        },
        ...current,
      ]);

      playPostSuccessSound();
      setCommentBody("");
    } catch (err) {
      Alert.alert(
        "Couldn't comment",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setPosting(false);
    }
  };

  const addReply = useCallback(
    (parentId: number, reply: Comment) => {
      const insert = (items: Comment[]): Comment[] =>
        items.map((comment) => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [reply, ...(comment.replies || [])],
            };
          }

          return {
            ...comment,
            replies: insert(comment.replies || []),
          };
        });

      setComments((current) => insert(current));
    },
    [setComments],
  );

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ paddingTop: insets.top }}
      >
        <Spinner />
      </View>
    );
  }

  if (error || !perception) {
    return (
      <View
        className="flex-1 items-center justify-center gap-3 bg-background px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="font-sans text-danger">
          {error || "Perception not found."}
        </Text>

        <Button label="Back" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  const isOwner = me?.id === perception.user.id;

  const hasCommented = comments.some((comment) => comment.user.id === me?.id);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-row items-center gap-2 px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="rounded-control p-1"
          hitSlop={8}
        >
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>

        <Text className="font-sans-semibold text-lg text-foreground">
          Perception
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!isOwner && (
          <Pressable
            onPress={() =>
              guard(() => router.push(`/(tabs)/messages/${perception.user.id}`))
            }
            className="mb-3 flex-row items-center gap-1.5"
          >
            <Feather name="message-circle" size={15} color="#f2a33c" />

            <Text className="font-sans-medium text-sm text-accent">
              Message {perception.user.name}
            </Text>
          </Pressable>
        )}

        <PerceptionCard
          perception={perception}
          detailView
          isOwner={isOwner}
          onLike={() =>
            guard(() =>
              toggleLike(perception, (likedId, liked, count) =>
                setPerception((current) =>
                  current && current.id === likedId
                    ? {
                        ...current,
                        liked_by_user: liked,
                        likes_count: count,
                      }
                    : current,
                ),
              ),
            )
          }
        />

        <View className="mb-3 mt-6 flex-row items-center gap-1.5">
          <VantageMark size={16} color="#f2a33c" />

          <Text className="font-sans-semibold text-lg text-foreground">
            Perceive
          </Text>
        </View>

        {token ? (
          <View className="mb-5">
            <CommentComposer
              value={commentBody}
              onChangeText={setCommentBody}
              onSubmit={submitComment}
              loading={posting}
              placeholder="What's your take on this?"
            />
          </View>
        ) : (
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            className="mb-5 items-center rounded-card border border-dashed border-border-hairline bg-surface/50 p-5"
          >
            <Text className="text-center font-sans text-sm text-foreground-muted">
              Have a unique take on this?{" "}
              <Text className="font-sans-semibold text-accent">
                Log in to join the discussion.
              </Text>
            </Text>
          </Pressable>
        )}

        {!token ? (
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            className="mx-auto mb-10 flex-row items-center gap-2 self-center rounded-card border border-accent/25 bg-accent-soft px-5 py-4"
          >
            <VantageMark size={18} color="#c97412" />

            <Text className="max-w-[80%] text-center font-sans text-sm text-accent-strong">
              Sign in and share your perception to unlock others&rsquo;
              perspectives.
            </Text>
          </Pressable>
        ) : isOwner || hasCommented || comments.length === 0 ? (
          <View className="pb-10">
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="font-sans-semibold text-base text-foreground">
                Perspectives
              </Text>

              {hydratingComments && (
                <View className="flex-row items-center gap-1.5">
                  <Spinner size={18} />

                  <Text className="font-sans text-[11px] text-foreground-subtle">
                    Loading replies…
                  </Text>
                </View>
              )}
            </View>

            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReplyAdded={addReply}
              />
            ))}
          </View>
        ) : (
          <View className="mx-auto mb-10 flex-row items-center gap-2 self-center rounded-card border border-accent/25 bg-accent-soft px-5 py-4">
            <VantageMark size={18} color="#c97412" />

            <Text className="max-w-[80%] text-center font-sans text-sm text-accent-strong">
              Share your perception to see others&rsquo; perspectives.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
