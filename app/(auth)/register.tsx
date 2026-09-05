// app/(auth)/register.tsx
import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import VantageMark from "../../components/ui/VantageMark";
import Button from "../../components/ui/Button";
import useAuthStore, { ApiError } from "../../store/useAuthStore";

export default function RegisterScreen() {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#4a4f5c" : "#8b91a0";
  const register = useAuthStore((s) => s.register);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const loading = useAuthStore((s) => s.loading);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== "success") return;

    const idToken = response.params?.id_token ?? response.authentication?.idToken;
    if (!idToken) {
      void Promise.resolve().then(() => setError("Failed to get ID token from Google"));
      return;
    }

    void Promise.resolve().then(() => {
      setGoogleLoading(true);
      return loginWithGoogle(idToken)
        .then(() => router.replace("/(tabs)"))
        .catch((err: any) => setError(err.message || "Google sign-up failed"))
        .finally(() => setGoogleLoading(false));
    });
  }, [loginWithGoogle, response]);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      await promptAsync();
    } catch (err: any) {
      setError(err.message || "Google sign-up failed");
    } finally {
      if (response?.type !== "success") setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setConfirmError(null);

    if (password !== confirm) {
      setConfirmError("Passwords do not match");
      return;
    }

    try {
      // SANITIZE USER INPUT: same fix as login.tsx — trim/lowercase email,
      // leave the password untouched.
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedName = name.trim();
      await register(sanitizedName, sanitizedEmail, password, confirm);
      router.replace("/(tabs)");
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { errors?: Record<string, string[]> } | null;
        const firstError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;
        setError(firstError || err.message);
      } else {
        setError("Registration failed");
      }
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="flex-1 justify-center px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="mb-8 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent-soft">
            <VantageMark size={30} strokeWidth={1.7} />
          </View>
          <Text className="font-sans-semibold text-2xl text-foreground">Join Perception</Text>
          <Text className="mt-1.5 text-center font-sans text-sm text-foreground-subtle">
            Every topic looks different from where you stand.
          </Text>
        </View>

        <View className="gap-4">
          <Button
            label="Continue with Google"
            variant="outline"
            size="lg"
            icon={<Text className="font-sans-semibold text-base text-foreground">G</Text>}
            disabled={!request || loading || googleLoading}
            loading={googleLoading}
            onPress={handleGoogleSignIn}
          />

          <View className="flex-row items-center gap-3 py-1"><View className="h-px flex-1 bg-border-hairline" /><Text className="font-sans text-xs text-foreground-subtle">or email</Text><View className="h-px flex-1 bg-border-hairline" /></View>

          <Field icon="user" value={name} onChangeText={setName} placeholder="Full name" iconColor={iconColor} />
          <Field
            icon="mail"
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            iconColor={iconColor}
          />
          <Field icon="lock" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry iconColor={iconColor} />
          <View>
            <Field
              icon="lock"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Confirm password"
              secureTextEntry
              iconColor={iconColor}
              error={Boolean(confirmError)}
            />
            {confirmError && <Text className="mt-1 font-sans text-xs text-danger">{confirmError}</Text>}
          </View>

          {error && <Text className="font-sans text-sm text-danger">{error}</Text>}

          <Button
            label={loading ? "Creating account…" : "Create account"}
            variant="accent"
            size="lg"
            loading={loading}
            disabled={!name || !email || !password || !confirm}
            onPress={handleSubmit}
          />
        </View>

        <View className="mt-6 flex-row justify-center">
          <Text className="font-sans text-sm text-foreground-subtle">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="font-sans-medium text-sm text-accent">Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FieldProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  iconColor: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
  error?: boolean;
}

function Field({ icon, value, onChangeText, placeholder, iconColor, secureTextEntry, keyboardType, autoCapitalize, error }: FieldProps) {
  return (
    <View
      className={`flex-row items-center rounded-control border bg-surface-sunken px-3.5 ${error ? "border-danger/50" : "border-border-hairline"}`}
    >
      <Feather name={icon} size={17} color={iconColor} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={iconColor}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        className="ml-2.5 flex-1 py-3 font-sans text-sm text-foreground"
      />
    </View>
  );
}
