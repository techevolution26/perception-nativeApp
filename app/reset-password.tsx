import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Button from "../components/ui/Button";
import VantageMark from "../components/ui/VantageMark";
import { apiFetch, getValidationErrors } from "../lib/api";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "This reset link is missing its token.");

  const submit = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/reset-password", {
        method: "POST",
        auth: false,
        body: { token, password, password_confirmation: confirmation },
      });
      router.replace("/(auth)/login");
    } catch (err) {
      const errors = getValidationErrors(err);
      const first = Object.values(errors).flat()[0];
      setError(first ?? (err instanceof Error ? err.message : "This reset link is invalid or has expired."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="flex-1 justify-center px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="mb-8 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent-soft">
            <VantageMark size={30} strokeWidth={1.7} />
          </View>
          <Text className="font-sans-semibold text-2xl text-foreground">Set a new password</Text>
          <Text className="mt-1.5 text-center font-sans text-sm text-foreground-subtle">Choose a strong password you have not used before.</Text>
        </View>
        <View className="gap-4">
          <View>
            <Text className="mb-1.5 font-sans-medium text-sm text-foreground-muted">New password</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" className="rounded-control border border-border-hairline bg-surface-sunken px-3.5 py-3 font-sans text-sm text-foreground" placeholder="••••••••" placeholderTextColor="#8b91a0" />
          </View>
          <View>
            <Text className="mb-1.5 font-sans-medium text-sm text-foreground-muted">Confirm password</Text>
            <TextInput value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" className="rounded-control border border-border-hairline bg-surface-sunken px-3.5 py-3 font-sans text-sm text-foreground" placeholder="••••••••" placeholderTextColor="#8b91a0" />
          </View>
          <Text className="font-sans text-xs leading-4 text-foreground-subtle">Use 8–128 characters with uppercase, lowercase, number, and special character.</Text>
          {error && <View className="rounded-control bg-danger/10 p-3"><Text className="font-sans text-sm text-danger">{error}</Text></View>}
          <Button label="Reset password" variant="accent" size="lg" loading={loading} disabled={!token || !password || !confirmation} onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
