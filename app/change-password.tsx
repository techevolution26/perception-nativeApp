import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Button from "../components/ui/Button";
import { apiFetch, getValidationErrors } from "../lib/api";
import useAuthStore from "../store/useAuthStore";

export default function ChangePasswordScreen() {
  const logout = useAuthStore((s) => s.logout);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/change-password", {
        method: "POST",
        body: { current_password: currentPassword, password, password_confirmation: confirmation },
      });
      await logout();
      router.replace("/(auth)/login");
    } catch (err) {
      const errors = getValidationErrors(err);
      const first = Object.values(errors).flat()[0];
      setError(first ?? (err instanceof Error ? err.message : "Unable to change password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="px-6 py-12" keyboardShouldPersistTaps="handled">
        <View className="mb-8 flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back"><Feather name="arrow-left" size={20} color="#8b91a0" /></Pressable>
          <Text className="font-sans-semibold text-2xl text-foreground">Change password</Text>
        </View>
        <View className="gap-4">
          <View>
            <Text className="mb-1.5 font-sans-medium text-sm text-foreground-muted">Current password</Text>
            <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" className="rounded-control border border-border-hairline bg-surface-sunken px-3.5 py-3 font-sans text-sm text-foreground" />
          </View>
          <View>
            <Text className="mb-1.5 font-sans-medium text-sm text-foreground-muted">New password</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" className="rounded-control border border-border-hairline bg-surface-sunken px-3.5 py-3 font-sans text-sm text-foreground" />
          </View>
          <View>
            <Text className="mb-1.5 font-sans-medium text-sm text-foreground-muted">Confirm new password</Text>
            <TextInput value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" className="rounded-control border border-border-hairline bg-surface-sunken px-3.5 py-3 font-sans text-sm text-foreground" />
          </View>
          <Text className="font-sans text-xs leading-4 text-foreground-subtle">Use 8–128 characters with uppercase, lowercase, number, and special character. Changing your password signs out other active sessions.</Text>
          {error && <Text className="font-sans text-sm text-danger">{error}</Text>}
          <Button label="Change password" variant="accent" size="lg" loading={loading} disabled={!currentPassword || !password || !confirmation} onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
