import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Button from "../../components/ui/Button";
import VantageMark from "../../components/ui/VantageMark";
import { apiFetch, getAuthErrorMessage } from "../../lib/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/forgot-password", {
        method: "POST",
        auth: false,
        body: { email: email.trim().toLowerCase() },
      });
      setSent(true);
    } catch (err) {
      setError(
        getAuthErrorMessage(
          err,
          "We couldn't start password recovery. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-6 py-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent-soft">
            <VantageMark size={30} strokeWidth={1.7} />
          </View>
          <Text className="font-sans-semibold text-2xl text-foreground">
            Forgot password?
          </Text>
          <Text className="mt-1.5 text-center font-sans text-sm text-foreground-subtle">
            Enter your email and we’ll send a secure reset link.
          </Text>
        </View>

        {sent ? (
          <View className="gap-4">
            <View className="rounded-card border border-border-hairline bg-surface p-4">
              <View className="mb-2 flex-row items-center gap-2">
                <Feather name="mail" size={18} color="#c97412" />
                <Text className="font-sans-semibold text-base text-foreground">
                  Check your email
                </Text>
              </View>
              <Text className="font-sans text-sm leading-5 text-foreground-muted">
                If an account exists for that email, password-reset instructions
                have been sent. The link expires shortly for your security.
              </Text>
            </View>
            <Button
              label="Back to sign in"
              variant="accent"
              size="lg"
              onPress={() => router.replace("/(auth)/login")}
            />
          </View>
        ) : (
          <View className="gap-4">
            <View>
              <Text className="mb-1.5 font-sans-medium text-sm text-foreground-muted">
                Email
              </Text>
              <View className="flex-row items-center rounded-control border border-border-hairline bg-surface-sunken px-3.5">
                <Feather name="mail" size={17} color="#8b91a0" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#8b91a0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="ml-2.5 flex-1 py-3 font-sans text-sm text-foreground"
                />
              </View>
            </View>
            {error && (
              <Text className="font-sans text-sm text-danger">{error}</Text>
            )}
            <Button
              label="Send reset link"
              variant="accent"
              size="lg"
              loading={loading}
              disabled={!email.trim()}
              onPress={submit}
            />
            <Link href="/(auth)/login" asChild>
              <Text className="py-2 text-center font-sans-medium text-sm text-accent">
                Back to sign in
              </Text>
            </Link>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
