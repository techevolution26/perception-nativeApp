// app/perceptions/[id]/edit.tsx

import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { File } from "expo-file-system";

import Button from "../../../components/ui/Button";
import useTopics from "../../../hooks/useTopics";
import { apiFetch, resolveMediaUrl } from "../../../lib/api";
import usePerceptionsStore from "../../../store/usePerceptionsStore";
import type { Perception } from "../../../types/models";

type MediaAsset = ImagePicker.ImagePickerAsset;

async function pickMedia(): Promise<MediaAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      "Permission needed",
      "Allow photo library access to attach a photo or video.",
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

function isVideoUrl(uri: string) {
  return /\.(mp4|mov|m4v|webm|avi|mkv)(\?.*)?$/i.test(uri);
}

export default function EditPerceptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: topics = [] } = useTopics();

  const updatePerception = usePerceptionsStore(
    (state) => state.updatePerception,
  );

  const [perception, setPerception] = useState<Perception | null>(null);
  const [body, setBody] = useState("");
  const [topicId, setTopicId] = useState<number | null>(null);

  // Existing media returned by the backend.
  const [existingMedia, setExistingMedia] = useState<string | null>(null);

  // Newly selected local media.
  const [newMedia, setNewMedia] = useState<MediaAsset | null>(null);

  // Explicitly remove the existing media on save.
  const [removeMedia, setRemoveMedia] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickingMedia, setPickingMedia] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadPerception = async () => {
      try {
        const result = await apiFetch<Perception>(`/api/perceptions/${id}`);

        if (!mounted) return;

        setPerception(result);
        setBody(result.body);
        setTopicId(result.topic?.id ?? null);

        // media_url is optional.
        // Normalize undefined -> null for local state.
        setExistingMedia(result.media_url ?? null);
      } catch (err) {
        if (!mounted) return;

        Alert.alert(
          "Couldn't load perception",
          err instanceof Error ? err.message : "Please try again.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPerception();

    return () => {
      mounted = false;
    };
  }, [id]);

  const handlePickMedia = async () => {
    if (pickingMedia || saving) return;

    setPickingMedia(true);

    try {
      const media = await pickMedia();

      if (!media) return;

      setNewMedia(media);
      setRemoveMedia(false);
    } finally {
      setPickingMedia(false);
    }
  };

  const handleRemoveMedia = () => {
    /*
     * If the user is looking at newly selected media, simply discard
     * that selection. The original backend media remains untouched.
     */
    if (newMedia) {
      setNewMedia(null);
      return;
    }

    /*
     * If there is existing backend media, mark it for deletion.
     * Nothing is actually deleted until Save is pressed.
     */
    if (existingMedia) {
      setRemoveMedia(true);
    }
  };

  const handleUndoRemove = () => {
    setRemoveMedia(false);
  };

  const handleSave = async () => {
    if (!topicId) {
      Alert.alert("Topic required", "Please select a topic.");
      return;
    }

    if (!body.trim()) {
      Alert.alert(
        "Perception required",
        "Please write something before saving.",
      );
      return;
    }

    setSaving(true);

    try {
      const form = new FormData();

      form.append("body", body.trim());
      form.append("topic_id", String(topicId));

      /*
       * IMPORTANT:
       *
       * Do NOT append:
       *
       * {
       *   uri,
       *   name,
       *   type,
       * }
       *
       * as a fake Blob.
       *
       * That is what caused:
       *
       * "Unsupported FormDataPart implementation"
       *
       * in this Expo environment.
       *
       * The working new-perception screen uses Expo's File API,
       * so edit uses exactly the same mechanism.
       */
      if (newMedia) {
        const file = new File(newMedia.uri);

        form.append("media", file);
      }

      /*
       * Only tell the backend to remove media when there is no
       * replacement being uploaded.
       *
       * If newMedia exists, replacement takes precedence.
       */
      if (removeMedia && !newMedia) {
        form.append("remove_media", "true");
      }

      const updated = await apiFetch<Perception>(`/api/perceptions/${id}`, {
        method: "PUT",
        body: form,
        json: false,
      });

      updatePerception(updated.id, updated);

      router.back();
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !perception) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  /*
   * Display priority:
   *
   * 1. Newly selected media
   * 2. Existing backend media
   * 3. Nothing
   *
   * If removeMedia is true and there is no replacement,
   * don't display the existing media.
   */
  const currentMedia =
    newMedia?.uri || (!removeMedia ? resolveMediaUrl(existingMedia) : null);

  const currentMediaIsVideo = newMedia
    ? newMedia.type === "video"
    : currentMedia
      ? isVideoUrl(currentMedia)
      : false;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border-hairline px-4 py-3.5">
        <Text className="font-sans-semibold text-lg text-foreground">
          Edit perception
        </Text>

        <Pressable
          onPress={() => router.back()}
          className="rounded-control p-1.5"
          hitSlop={8}
          disabled={saving}
        >
          <Feather name="x" size={20} color="#8b91a0" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Body */}
        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          placeholder="What's your take on this?"
          placeholderTextColor="#8b91a0"
          className="min-h-[130px] rounded-control border border-border-hairline bg-surface-sunken p-3 font-sans text-[15px] leading-6 text-foreground"
          textAlignVertical="top"
          editable={!saving}
        />

        {/* Media */}
        <Text className="mb-2 mt-5 font-sans-medium text-xs uppercase tracking-wide text-foreground-subtle">
          Media
        </Text>

        {currentMedia ? (
          <View className="overflow-hidden rounded-card border border-border-hairline bg-surface">
            <View className="relative">
              {currentMediaIsVideo ? (
                <View className="h-48 w-full items-center justify-center bg-surface-sunken">
                  <Feather name="video" size={32} color="#8b91a0" />

                  <Text className="mt-2 font-sans-medium text-xs text-foreground-muted">
                    {newMedia ? "New video selected" : "Current video"}
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: currentMedia }}
                  style={{
                    width: "100%",
                    height: 200,
                  }}
                  contentFit="cover"
                />
              )}

              <Pressable
                onPress={handleRemoveMedia}
                disabled={saving}
                className="absolute right-2.5 top-2.5 rounded-full bg-foreground p-2"
                hitSlop={6}
              >
                <Feather name="x" size={15} color="#fcfcfb" />
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between px-3 py-2.5">
              <Text
                numberOfLines={1}
                className="flex-1 font-sans text-xs text-foreground-muted"
              >
                {newMedia?.fileName ||
                  (currentMediaIsVideo ? "Video attached" : "Image attached")}
              </Text>

              <Pressable
                onPress={handlePickMedia}
                disabled={saving || pickingMedia}
                className="ml-3 rounded-control px-2 py-1"
              >
                <Text className="font-sans-medium text-xs text-accent">
                  {pickingMedia ? "Opening…" : "Change"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={handlePickMedia}
            disabled={saving || pickingMedia}
            className="items-center rounded-card border border-dashed border-border-hairline bg-surface/50 px-5 py-7"
          >
            <View className="mb-2 rounded-full bg-accent-soft p-3">
              <Feather name="image" size={21} color="#c97412" />
            </View>

            <Text className="font-sans-medium text-sm text-foreground">
              {pickingMedia ? "Opening media library…" : "Add photo or video"}
            </Text>

            <Text className="mt-1 text-center font-sans text-xs text-foreground-subtle">
              Attach an image or video to your perception.
            </Text>
          </Pressable>
        )}

        {/* Media removal state */}
        {removeMedia && !newMedia && (
          <View className="mt-4 flex-row items-center justify-between rounded-control border border-danger/20 bg-danger/5 px-3 py-2.5">
            <View className="flex-1 flex-row items-center gap-2">
              <Feather name="trash-2" size={14} color="#b94a48" />

              <Text className="font-sans text-xs text-danger">
                Media will be removed when you save.
              </Text>
            </View>

            <Pressable
              onPress={handleUndoRemove}
              disabled={saving}
              className="ml-3 rounded-control px-2 py-1"
            >
              <Text className="font-sans-medium text-xs text-accent">Undo</Text>
            </Pressable>
          </View>
        )}

        {/* Topic */}
        <Text className="mb-2 mt-6 font-sans-medium text-xs uppercase tracking-wide text-foreground-subtle">
          Topic
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {topics.map((topic) => {
            const selected = topicId === topic.id;

            return (
              <Pressable
                key={topic.id}
                onPress={() => setTopicId(topic.id)}
                disabled={saving}
                className={`rounded-control border px-3 py-2 ${
                  selected
                    ? "border-accent/60 bg-accent-soft"
                    : "border-border-hairline"
                }`}
              >
                <Text
                  className={`font-sans text-sm ${
                    selected ? "text-accent-strong" : "text-foreground-muted"
                  }`}
                >
                  {topic.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="flex-row gap-2 border-t border-border-hairline px-4 py-3">
        <Button
          label="Cancel"
          variant="outline"
          onPress={() => router.back()}
          disabled={saving}
        />

        <View className="flex-1">
          <Button
            label={saving ? "Saving…" : "Save changes"}
            variant="accent"
            loading={saving}
            disabled={!body.trim() || !topicId}
            onPress={handleSave}
          />
        </View>
      </View>
    </View>
  );
}
