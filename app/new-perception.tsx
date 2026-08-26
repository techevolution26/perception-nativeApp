// app/new-perception.tsx
import { useState } from "react";
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
import { apiFetch, API_BASE } from "../lib/api";
import { getToken } from "../lib/storage";
import usePerceptionsStore from "../store/usePerceptionsStore";
import type { Perception } from "../types/models";

export default function NewPerceptionModal() {
  const { data: topics = [] } = useTopics();
  const [body, setBody] = useState("");
  const [topicId, setTopicId] = useState<number | null>(null);
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const addPerception = usePerceptionsStore((s) => s.addPerception);

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to attach media.");
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
    if (!body.trim() || !topicId) return;
    setLoading(true);

    try {
      const form = new FormData();
      form.append("body", body.trim());
      form.append("topic_id", String(topicId));
      if (media) {
        form.append("media", {
          uri: media.uri,
          name: media.fileName || `upload.${media.uri.split(".").pop()}`,
          type: media.mimeType || (media.type === "video" ? "video/mp4" : "image/jpeg"),
        } as unknown as Blob);
      }

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/perceptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const created: Perception = await res.json();
      addPerception(created);
      router.back();
    } catch (err) {
      Alert.alert("Couldn't post", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-row items-center justify-between border-b border-border-hairline px-4 py-3.5">
        <Text className="font-sans-semibold text-lg text-foreground">New Perception</Text>
        <Pressable onPress={() => router.back()} className="rounded-control p-1.5">
          <Feather name="x" size={20} color="#8b91a0" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="What's your take on this?"
          placeholderTextColor="#8b91a0"
          multiline
          className="min-h-[110px] rounded-control border border-border-hairline bg-surface-sunken p-3 font-sans text-[15px] text-foreground"
          textAlignVertical="top"
        />

        {media && (
          <View className="relative mt-3">
            <Image source={{ uri: media.uri }} style={{ width: "100%", height: 180, borderRadius: 10 }} contentFit="cover" />
            <Pressable
              onPress={() => setMedia(null)}
              className="absolute -right-2 -top-2 rounded-full bg-foreground p-1.5"
            >
              <Feather name="x" size={14} color="#fcfcfb" />
            </Pressable>
          </View>
        )}

        <Text className="mb-2 mt-5 font-sans-medium text-xs uppercase tracking-wide text-foreground-subtle">
          Topic
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {topics.map((topic) => {
            const selected = topicId === topic.id;
            return (
              <Pressable
                key={topic.id}
                onPress={() => setTopicId(topic.id)}
                className={`rounded-control border px-3 py-2 ${selected ? "border-accent/60 bg-accent-soft" : "border-border-hairline"}`}
              >
                <Text className={`font-sans text-sm ${selected ? "text-accent-strong" : "text-foreground-muted"}`}>
                  {topic.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={pickMedia} className="mt-5 flex-row items-center gap-2 self-start rounded-control border border-border-hairline px-3.5 py-2.5">
          <Feather name="image" size={16} color="#666c7a" />
          <Text className="font-sans text-sm text-foreground-muted">{media ? "Change media" : "Add photo or video"}</Text>
        </Pressable>
      </ScrollView>

      <View className="border-t border-border-hairline px-4 py-3">
        <Button
          label={loading ? "Posting…" : "Post perception"}
          variant="accent"
          size="lg"
          loading={loading}
          disabled={!body.trim() || !topicId}
          onPress={handleSubmit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
