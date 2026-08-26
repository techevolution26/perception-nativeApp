// app/(auth)/login.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import VantageMark from "../../components/ui/VantageMark";
import Button from "../../components/ui/Button";
import useAuthStore, { ApiError } from "../../store/useAuthStore";

export default function LoginScreen() {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#4a4f5c" : "#8b91a0";
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    // SANITIZE USER INPUT: Remove spaces and convert to lowercase
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password; // Passwords shouldn't be trimmed/altered

    try {
      // Send sanitized inputs to your auth store
      await login(sanitizedEmail, sanitizedPassword);
      router.replace("/(tabs)");
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { errors?: Record<string, string[]> } | null;
        const firstError = body?.errors
          ? Object.values(body.errors)[0]?.[0]
          : undefined;
        setError(firstError || err.message);
      } else {
        setError("Login failed");
      }
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
            Welcome back
          </Text>
          <Text className="mt-1.5 text-center font-sans text-sm text-foreground-subtle">
            Sign in to continue seeing every side of it.
          </Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="mb-1.5 font-sans-medium text-sm text-foreground-muted">
              Email
            </Text>
            <View className="flex-row items-center rounded-control border border-border-hairline bg-surface-sunken px-3.5">
              <Feather name="mail" size={17} color={iconColor} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={iconColor}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="ml-2.5 flex-1 py-3 font-sans text-sm text-foreground"
              />
            </View>
          </View>

          <View>
            <Text className="mb-1.5 font-sans-medium text-sm text-foreground-muted">
              Password
            </Text>
            <View className="flex-row items-center rounded-control border border-border-hairline bg-surface-sunken px-3.5">
              <Feather name="lock" size={17} color={iconColor} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={iconColor}
                secureTextEntry
                autoCapitalize="none"
                className="ml-2.5 flex-1 py-3 font-sans text-sm text-foreground"
              />
            </View>
          </View>

          {error && (
            <View className="flex-row items-start gap-2 rounded-control bg-danger/10 p-2.5">
              <Feather
                name="alert-circle"
                size={16}
                color="#e5484d"
                style={{ marginTop: 2 }}
              />
              <Text className="flex-1 font-sans text-sm text-danger">
                {error}
              </Text>
            </View>
          )}

          <Button
            label={loading ? "Signing in…" : "Sign in"}
            variant="accent"
            size="lg"
            loading={loading}
            disabled={!email || !password}
            onPress={handleSubmit}
          />
        </View>

        <View className="mt-6 flex-row justify-center">
          <Text className="font-sans text-sm text-foreground-subtle">
            Don&rsquo;t have an account?{" "}
          </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text className="font-sans-medium text-sm text-accent">
                Sign up
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
