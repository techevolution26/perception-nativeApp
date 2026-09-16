// app/new-perception.tsx
//
// Conversation-first composer: a focused writing surface, explicit Topic
// context, optional media, and a transparent intake-quality check before a
// perception becomes public.
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import Button from "../components/ui/Button";
import useTopics from "../hooks/useTopics";
import { API_BASE, resolveMediaUrl } from "../lib/api";
import { getToken } from "../lib/storage";
import usePerceptionsStore from "../store/usePerceptionsStore";
import useAuthStore from "../store/useAuthStore";
import { playPostSuccessSound } from "../lib/sound";
import { useToast } from "../contexts/ToastContext";
import type { Perception } from "../types/models";
import { File } from "expo-file-system";

interface PerceptionPendingReviewResult {
  perception_id: number;
  status: "pending_review";
  message: string;
}

type PerceptionCreateResult = Perception | PerceptionPendingReviewResult;

const MIN_SUGGESTED_LENGTH = 20;

export default function NewPerceptionModal() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) router.replace("/(auth)/login");
  }, [token]);

  const { data: topics = [], isLoading: topicsLoading } = useTopics();
  const [body, setBody] = useState("");
  const [topicId, setTopicId] = useState<number | null>(null);
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [posted, setPosted] = useState(false);
  const [reviewQueued, setReviewQueued] = useState(false);
  const { showToast } = useToast();
  const addPerception = usePerceptionsStore((s) => s.addPerception);

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.id === topicId) ?? null,
    [topics, topicId],
  );

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to attach media.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setMedia(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    const trimmedBody = body.trim();
    if (!trimmedBody || !topicId || loading) return;

    setLoading(true);

    try {
      const form = new FormData();
      form.append("body", trimmedBody);
      form.append("topic_id", String(topicId));

      if (media) {
        form.append("media", new File(media.uri));
      }

      const authToken = await getToken();
      const res = await fetch(`${API_BASE}/api/perceptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: form,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const result: PerceptionCreateResult = await res.json();

      if ("status" in result && result.status === "pending_review") {
        setReviewQueued(true);
        showToast({
          title: "Sent for review",
          message: "A quick quality check is needed before this enters the conversation.",
          tone: "info",
        });
        setTimeout(() => router.back(), 1300);
        return;
      }

      const created = await fetch(
        `${API_BASE}/api/perceptions/${result.id}`,
        { headers: { Authorization: `Bearer ${authToken}` } },
      );
      if (!created.ok) throw new Error("Perception was posted, but could not be loaded back into your feed.");

      const perception: Perception = await created.json();
      addPerception(perception);
      playPostSuccessSound();
      showToast({
        title: "Perception posted",
        message: "Your perspective is now part of the conversation.",
        tone: "success",
      });
      setPosted(true);
      setTimeout(() => router.back(), 900);
    } catch (err) {
      showToast({
        title: "Perception not posted",
        message: err instanceof Error ? err.message : "Please try again.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const suggested = body.trim().length >= MIN_SUGGESTED_LENGTH;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-row items-center justify-between border-b border-border-hairline px-4 py-3.5">
        <View>
          <Text className="font-sans-semibold text-lg text-foreground">
            New perception
          </Text>
          <Text className="mt-0.5 font-sans text-xs text-foreground-muted">
            Add a useful perspective to a conversation.
          </Text>
        </View>
        <Pressable onPress={() => router.back()} className="rounded-control p-1.5">
          <Feather name="x" size={20} color="#8b91a0" />
        </Pressable>
      </View>

      {posted || reviewQueued ? (
        <View className="flex-1 items-center justify-center px-7">
          <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
            <Feather
              name={reviewQueued ? "shield" : "check"}
              size={28}
              color={reviewQueued ? "#f2a33c" : "#2fae6a"}
            />
          </View>
          <Text className="text-center font-sans-semibold text-xl text-foreground">
            {reviewQueued ? "A quick review is underway" : "Perception posted"}
          </Text>
          <Text className="mt-2 max-w-[320px] text-center font-sans text-sm leading-5 text-foreground-muted">
            {reviewQueued
              ? "We check for clear conversation-quality and spam signals before making a perception public. A person remains the final reviewer."
              : "Your perspective is now part of the conversation."}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-6 pt-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-[24px] border border-border-hairline bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-accent-soft">
                  <Feather name="message-circle" size={16} color="#f2a33c" />
                </View>
                <View>
                  <Text className="font-sans-semibold text-sm text-foreground">
                    Start with the thought
                  </Text>
                  <Text className="font-sans text-[11px] text-foreground-muted">
                    What do you see, know, question or believe?
                  </Text>
                </View>
              </View>
              <Text className="font-sans text-[11px] text-foreground-subtle">
                {body.length}/2000
              </Text>
            </View>

            <TextInput
              value={body}
              onChangeText={(value) => setBody(value.slice(0, 2000))}
              placeholder="Write a perspective worth discussing…"
              placeholderTextColor="#8b91a0"
              multiline
              className="mt-4 min-h-[170px] font-sans text-[17px] leading-6 text-foreground"
              textAlignVertical="top"
              autoFocus
            />

            <View className="mt-2 flex-row items-center justify-between">
              <Text className="font-sans text-xs text-foreground-muted">
                {suggested
                  ? "Good — you've given the conversation some context."
                  : "A little context helps others respond meaningfully."}
              </Text>
              {body.trim().length > 0 && (
                <Feather
                  name={suggested ? "check-circle" : "edit-3"}
                  size={15}
                  color={suggested ? "#2fae6a" : "#8b91a0"}
                />
              )}
            </View>
          </View>

          <View className="mt-5">
            <View className="mb-2 flex-row items-end justify-between">
              <View>
                <Text className="font-sans-semibold text-sm text-foreground">
                  Choose the conversation
                </Text>
                <Text className="mt-0.5 font-sans text-xs text-foreground-muted">
                  Every perception belongs to one Topic.
                </Text>
              </View>
              {selectedTopic && (
                <View className="flex-row items-center gap-1.5 rounded-pill bg-accent-soft px-2.5 py-1">
                  <Feather name="check" size={12} color="#f2a33c" />
                  <Text className="max-w-[110px] font-sans-medium text-[11px] text-accent-strong" numberOfLines={1}>
                    {selectedTopic.name}
                  </Text>
                </View>
              )}
            </View>

            {topicsLoading ? (
              <View className="rounded-control border border-border-hairline px-4 py-4">
                <Text className="font-sans text-sm text-foreground-muted">
                  Loading Topics…
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-1">
                {topics.map((topic) => {
                  const selected = topicId === topic.id;
                  return (
                    <Pressable
                      key={topic.id}
                      onPress={() => setTopicId(topic.id)}
                      className={`w-[118px] overflow-hidden rounded-[18px] border ${selected ? "border-accent/60 bg-accent-soft" : "border-border-hairline bg-surface"}`}
                    >
                      <View className="h-16 w-full bg-surface-sunken">
                        {topic.image_url ? (
                          <Image
                            source={{ uri: resolveMediaUrl(topic.image_url) }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                          />
                        ) : (
                          <View className="h-full items-center justify-center px-3">
                            <Feather name="hash" size={18} color="#8b91a0" />
                          </View>
                        )}
                      </View>
                      <View className="min-h-[48px] justify-center px-3 py-2">
                        <Text
                          numberOfLines={2}
                          className={`font-sans-semibold text-xs leading-4 ${selected ? "text-accent-strong" : "text-foreground"}`}
                        >
                          {topic.name}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {media && (
            <View className="relative mt-5 overflow-hidden rounded-[20px] border border-border-hairline">
              <Image
                source={{ uri: media.uri }}
                style={{ width: "100%", height: 190 }}
                contentFit="cover"
              />
              <Pressable
                onPress={() => setMedia(null)}
                className="absolute right-3 top-3 rounded-full bg-black/70 p-2"
              >
                <Feather name="x" size={15} color="#ffffff" />
              </Pressable>
            </View>
          )}

          <View className="mt-5 flex-row gap-2">
            <Pressable
              onPress={pickMedia}
              className="flex-row items-center gap-2 rounded-control border border-border-hairline bg-surface px-3.5 py-2.5"
            >
              <Feather name="image" size={16} color="#666c7a" />
              <Text className="font-sans-medium text-sm text-foreground-muted">
                {media ? "Change media" : "Add media"}
              </Text>
            </Pressable>
          </View>

          <View className="mt-5 flex-row rounded-[18px] border border-border-hairline bg-surface-sunken px-3.5 py-3">
            <Feather name="shield" size={16} color="#8b91a0" />
            <Text className="ml-2.5 flex-1 font-sans text-xs leading-5 text-foreground-muted">
              Before a new perception enters the public conversation, a lightweight quality guard checks for obvious spam and privacy-risk patterns. It does not judge whether your viewpoint is true or valuable; flagged posts go to human review.
            </Text>
          </View>
        </ScrollView>
      )}

      {!posted && !reviewQueued && (
        <View className="border-t border-border-hairline bg-background px-4 py-3">
          <Button
            label={loading ? "Checking…" : "Add to conversation"}
            variant="accent"
            size="lg"
            loading={loading}
            disabled={!body.trim() || !topicId}
            onPress={handleSubmit}
            icon={!loading ? <Feather name="arrow-up-right" size={17} color="#fff" /> : undefined}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
