// app/perceptions/[id]/edit.tsx
import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Button from "../../../components/ui/Button";
import useTopics from "../../../hooks/useTopics";
import { apiFetch } from "../../../lib/api";
import usePerceptionsStore from "../../../store/usePerceptionsStore";
import type { Perception } from "../../../types/models";

export default function EditPerceptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: topics = [] } = useTopics();
  const updatePerception = usePerceptionsStore((s) => s.updatePerception);

  const [perception, setPerception] = useState<Perception | null>(null);
  const [body, setBody] = useState("");
  const [topicId, setTopicId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<Perception>(`/api/perceptions/${id}`)
      .then((p) => {
        setPerception(p);
        setBody(p.body);
        setTopicId(p.topic?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!topicId) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append("body", body);
      form.append("topic_id", String(topicId));
      const updated = await apiFetch<Perception>(`/api/perceptions/${id}`, { method: "PUT", body: form, json: false });
      updatePerception(updated.id, updated);
      router.back();
    } catch (err) {
      Alert.alert("Save failed", err instanceof Error ? err.message : "Please try again.");
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

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border-hairline px-4 py-3.5">
        <Text className="font-sans-semibold text-lg text-foreground">Edit perception</Text>
        <Pressable onPress={() => router.back()} className="rounded-control p-1.5">
          <Feather name="x" size={20} color="#8b91a0" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          className="min-h-[110px] rounded-control border border-border-hairline bg-surface-sunken p-3 font-sans text-[15px] text-foreground"
          textAlignVertical="top"
        />

        <Text className="mb-2 mt-5 font-sans-medium text-xs uppercase tracking-wide text-foreground-subtle">Topic</Text>
        <View className="flex-row flex-wrap gap-2">
          {topics.map((topic) => {
            const selected = topicId === topic.id;
            return (
              <Pressable
                key={topic.id}
                onPress={() => setTopicId(topic.id)}
                className={`rounded-control border px-3 py-2 ${selected ? "border-accent/60 bg-accent-soft" : "border-border-hairline"}`}
              >
                <Text className={`font-sans text-sm ${selected ? "text-accent-strong" : "text-foreground-muted"}`}>{topic.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="flex-row gap-2 border-t border-border-hairline px-4 py-3">
        <Button label="Cancel" variant="outline" onPress={() => router.back()} />
        <View className="flex-1">
          <Button label={saving ? "Saving…" : "Save changes"} variant="accent" loading={saving} onPress={handleSave} />
        </View>
      </View>
    </View>
  );
}
