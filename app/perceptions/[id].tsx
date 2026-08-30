// app/perceptions/[id].tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import PerceptionCard from "../../components/PerceptionCard";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import { usePerceptionDetail } from "../../hooks/usePerceptionDetail";
import useLikeToggle from "../../hooks/useLikeToggle";
import useGuardAction from "../../hooks/useGuardAction";
import VantageMark from "../../components/ui/VantageMark";
import useAuthStore from "../../store/useAuthStore";
import { apiFetch } from "../../lib/api";
import type { Comment } from "../../types/models";

function CommentItem({ comment, onReplyAdded, depth = 0 }: { comment: Comment; onReplyAdded: (parentId: number, reply: Comment) => void; depth?: number }) {
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [showReplies, setShowReplies] = useState(false);
  const [sending, setSending] = useState(false);
  const replies = comment.replies || [];

  const submitReply = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append("body", replyBody.trim());
      const created = await apiFetch<Comment>(`/api/comments/${comment.id}/replies`, { method: "POST", body: form, json: false });
      onReplyAdded(comment.id, { ...created, replies: [] });
      setReplyBody("");
      setReplying(false);
      setShowReplies(true);
    } catch {
      // best-effort — leave draft in place so the user can retry
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ marginLeft: depth > 0 ? 16 : 0 }} className="mb-3">
      <View className="rounded-card border border-border-hairline bg-surface p-3.5">
        <View className="mb-2.5 flex-row items-center gap-2.5">
          <Avatar uri={comment.user.avatar_url} size="sm" />
          <View>
            <Text className="font-sans-semibold text-foreground">{comment.user.name}</Text>
            <Text className="font-mono text-xs text-foreground-subtle">
              {new Date(comment.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
            </Text>
          </View>
        </View>

        <Text className="mb-2.5 font-sans text-[15px] text-foreground">{comment.body}</Text>

        <View className="flex-row items-center gap-4 border-t border-border-hairline pt-2.5">
          <Pressable onPress={() => setReplying((r) => !r)}>
            <Text className="font-sans-medium text-sm text-foreground-muted">{replying ? "Cancel" : "Reply"}</Text>
          </Pressable>
          {replies.length > 0 && (
            <Pressable onPress={() => setShowReplies((s) => !s)}>
              <Text className="font-sans-medium text-sm text-foreground-muted">
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {replying && (
        <View className="ml-3 mt-2 rounded-control border border-border-hairline bg-surface-sunken p-3">
          <TextInput
            value={replyBody}
            onChangeText={setReplyBody}
            placeholder="Write your reply…"
            placeholderTextColor="#8b91a0"
            multiline
            className="min-h-[60px] rounded-control border border-border-hairline bg-surface p-2.5 font-sans text-sm text-foreground"
          />
          <View className="mt-2 flex-row justify-end">
            <Button label={sending ? "Posting…" : "Post reply"} size="sm" variant="accent" loading={sending} onPress={submitReply} />
          </View>
        </View>
      )}

      {showReplies && replies.map((r) => <CommentItem key={r.id} comment={r} onReplyAdded={onReplyAdded} depth={depth + 1} />)}
    </View>
  );
}

export default function PerceptionDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const guard = useGuardAction();
  const toggleLike = useLikeToggle();
  const { perception, comments, loading, error, setPerception, setComments } = usePerceptionDetail(id);

  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);

  const submitComment = async () => {
    if (!commentBody.trim()) return;
    setPosting(true);
    try {
      const form = new FormData();
      form.append("body", commentBody.trim());
      const created = await apiFetch<Comment>(`/api/perceptions/${id}/comments`, { method: "POST", body: form, json: false });
      setComments((curr) => [{ ...created, replies: [] }, ...curr]);
      setCommentBody("");
    } finally {
      setPosting(false);
    }
  };

  const addReply = (parentId: number, reply: Comment) => {
    const insert = (arr: Comment[]): Comment[] =>
      arr.map((c) =>
        c.id === parentId ? { ...c, replies: [reply, ...(c.replies || [])] } : { ...c, replies: insert(c.replies || []) }
      );
    setComments((cs) => insert(cs));
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" style={{ paddingTop: insets.top }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !perception) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6" style={{ paddingTop: insets.top }}>
        <Text className="font-sans text-danger">{error || "Perception not found."}</Text>
        <Button label="Back" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  const isOwner = me?.id === perception.user.id;
  const hasCommented = comments.some((c) => c.user.id === me?.id);

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" style={{ paddingTop: insets.top }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-row items-center gap-2 px-4 py-3">
        <Pressable onPress={() => router.back()} className="rounded-control p-1">
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        <Text className="font-sans-semibold text-lg text-foreground">Perception</Text>
      </View>

      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        {!isOwner && (
          <Pressable
            onPress={() => guard(() => router.push(`/(tabs)/messages/${perception.user.id}`))}
            className="mb-3 flex-row items-center gap-1.5"
          >
            <Feather name="message-circle" size={15} color="#f2a33c" />
            <Text className="font-sans-medium text-sm text-accent">Message {perception.user.name}</Text>
          </Pressable>
        )}

        <PerceptionCard
          perception={perception}
          detailView
          isOwner={isOwner}
          onLike={() =>
            guard(() =>
              toggleLike(perception, (likedId, liked, count) =>
                setPerception((p) => (p && p.id === likedId ? { ...p, liked_by_user: liked, likes_count: count } : p))
              )
            )
          }
        />

        <Text className="mb-3 mt-6 font-sans-semibold text-lg text-foreground">Perceive</Text>

        {token ? (
          <View className="mb-5 rounded-card border border-border-hairline bg-surface p-3.5">
            <TextInput
              value={commentBody}
              onChangeText={setCommentBody}
              placeholder="What's your take on this?"
              placeholderTextColor="#8b91a0"
              multiline
              className="min-h-[80px] rounded-control border border-border-hairline bg-surface-sunken p-2.5 font-sans text-sm text-foreground"
            />
            <View className="mt-2.5 flex-row justify-end">
              <Button label={posting ? "Posting…" : "Share perception"} variant="accent" size="sm" loading={posting} onPress={submitComment} />
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            className="mb-5 items-center rounded-card border border-dashed border-border-hairline bg-surface/50 p-5"
          >
            <Text className="text-center font-sans text-sm text-foreground-muted">
              Have a unique take on this?{" "}
              <Text className="font-sans-semibold text-accent">Log in to join the discussion.</Text>
            </Text>
          </Pressable>
        )}

        {/* Guests always see the "unlock others' perspectives" nudge — same as
            a logged-in user who hasn't commented yet. */}
        {!token ? (
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            className="mx-auto mb-10 flex-row items-center gap-2 self-center rounded-card border border-accent/25 bg-accent-soft px-5 py-4"
          >
            <VantageMark size={18} color="#c97412" />
            <Text className="max-w-[80%] text-center font-sans text-sm text-accent-strong">
              Sign in and share your perception to unlock others&rsquo; perspectives.
            </Text>
          </Pressable>
        ) : isOwner || hasCommented || comments.length === 0 ? (
          <View className="pb-10">
            {comments.map((c) => (
              <CommentItem key={c.id} comment={c} onReplyAdded={addReply} />
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
