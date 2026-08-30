// app/(tabs)/messages/[peerId].tsx
import { useContext, useEffect, useRef, useState, Fragment } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import Avatar from "../../../components/ui/Avatar";
import { useMessages } from "../../../hooks/useMessages";
import { apiFetch } from "../../../lib/api";
import { EchoContext } from "../../../contexts/EchoContext";
import useAuthStore from "../../../store/useAuthStore";
import type { DisplayMessage, MessagesPage, UserPublic } from "../../../types/models";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { peerId: peerIdParam } = useLocalSearchParams<{ peerId: string }>();
  const peerId = Number(peerIdParam);
  const me = useAuthStore((s) => s.user);

  // Defense in depth — see (tabs)/messages/index.tsx for why this doesn't
  // need a timeout: the root layout already blocks all rendering until
  // auth hydration finishes, so `me` is reliably known by the time this runs.
  useEffect(() => {
    if (!me) router.replace("/(auth)/login");
  }, [me]);
  const echo = useContext(EchoContext);
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);

  const [peer, setPeer] = useState<UserPublic | null>(null);
  const [input, setInput] = useState("");

  const messagesQuery = useMessages(peerId, true);

  useEffect(() => {
    apiFetch<UserPublic>(`/api/users/${peerId}`, { auth: false })
      .then(setPeer)
      .catch(() => {});
  }, [peerId]);

  // Real-time — same public channel/event contract as the web app.
  useEffect(() => {
    if (!echo || !peerId) return;
    const channel = echo.channel(`conversations.${peerId}`);
    channel.listen(".NewMessage", ({ message }: { message: DisplayMessage }) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(["messages", peerId], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: [{ ...old.pages[0], data: [...old.pages[0].data, message] }, ...old.pages.slice(1)],
        };
      });
    });
    return () => {
      channel.stopListening(".NewMessage");
    };
  }, [echo, peerId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => apiFetch<DisplayMessage>(`/api/conversations/${peerId}`, { method: "POST", body: { body } }),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["messages", peerId] });
      const prev = queryClient.getQueryData<InfiniteData<MessagesPage>>(["messages", peerId]);
      queryClient.setQueryData<InfiniteData<MessagesPage>>(["messages", peerId], (old) => {
        if (!old) return old;
        const fake: DisplayMessage = {
          id: -Date.now(),
          body,
          from_user_id: me?.id ?? -1,
          to_user_id: peerId,
          read_at: null,
          sending: true,
          created_at: new Date().toISOString(),
        };
        return { ...old, pages: [{ ...old.pages[0], data: [...old.pages[0].data, fake] }, ...old.pages.slice(1)] };
      });
      return { prev };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["messages", peerId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", peerId] });
    },
  });

  const flat: DisplayMessage[] = (messagesQuery.data?.pages || []).flatMap((p) => p.data);

  useEffect(() => {
    if (flat.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [flat.length]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    sendMutation.mutate(trimmed);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View className="flex-row items-center border-b border-border-hairline px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3 rounded-control p-1">
          <Feather name="chevron-left" size={22} color="#8b91a0" />
        </Pressable>
        {peer ? (
          <View className="flex-row items-center gap-3">
            <Avatar uri={peer.avatar_url} size="sm" />
            <Text className="font-sans-semibold text-foreground">{peer.name}</Text>
          </View>
        ) : (
          <ActivityIndicator size="small" />
        )}
      </View>

      {messagesQuery.isLoading ? (
        <ActivityIndicator className="flex-1" />
      ) : (
        <FlatList
          ref={listRef}
          data={flat}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-2 px-4 py-4"
          renderItem={({ item }) => {
            const isMe = item.from_user_id !== peerId;
            return (
              <View className={`flex-row ${isMe ? "justify-end" : "justify-start"}`}>
                <View
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isMe ? "rounded-br-md bg-foreground" : "rounded-bl-md border border-border-hairline bg-surface"
                  } ${item.sending ? "opacity-70" : ""}`}
                >
                  <Text className={`font-sans text-[15px] ${isMe ? "text-background" : "text-foreground"}`}>
                    {item.body}
                  </Text>
                  <Text className={`mt-1 font-mono text-[11px] ${isMe ? "text-background/60" : "text-foreground-subtle"}`}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {isMe && item.sending ? " · Sending…" : ""}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View className="flex-row items-end gap-2 border-t border-border-hairline px-3 py-2.5" style={{ paddingBottom: insets.bottom + 10 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message…"
          placeholderTextColor="#8b91a0"
          multiline
          className="max-h-28 flex-1 rounded-control border border-border-hairline bg-surface-sunken px-3.5 py-2.5 font-sans text-sm text-foreground"
        />
        <Pressable
          onPress={send}
          disabled={sendMutation.isPending || !input.trim()}
          className={`h-10 w-10 items-center justify-center rounded-full ${input.trim() ? "bg-accent" : "bg-surface-sunken"}`}
        >
          <Feather name="send" size={17} color={input.trim() ? "#201203" : "#8b91a0"} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
