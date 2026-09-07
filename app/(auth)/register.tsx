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
import { getValidationErrors, getAuthErrorMessage } from "../../lib/api";

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
  const [passwordError, setPasswordError] = useState<string | null>(null);
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
        .then(() => {
          const needsTopics = useAuthStore.getState().needsTopicOnboarding;
          router.replace(needsTopics ? "/topics?onboarding=1" : "/(tabs)");
        })
        .catch((err: unknown) => setError(getAuthErrorMessage(err, "Google sign-up failed.")))
        .finally(() => setGoogleLoading(false));
    });
  }, [loginWithGoogle, response]);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      await promptAsync();
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, "Google sign-up failed."));
    } finally {
      if (response?.type !== "success") setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setPasswordError(null);
    setConfirmError(null);

    const passwordRequirements = [
      [password.length >= 8, "Password must be at least 8 characters."],
      [password.length <= 128, "Password must be 128 characters or fewer."],
      [/[A-Z]/.test(password), "Password must contain an uppercase letter."],
    ] as const;
    const invalidRequirement = passwordRequirements.find(([valid]) => !valid);
    if (invalidRequirement) {
      setPasswordError(invalidRequirement[1]);
      return;
    }
    if (!/[a-z]/.test(password)) { setPasswordError("Password must contain a lowercase letter."); return; }
    if (!/[0-9]/.test(password)) { setPasswordError("Password must contain a number."); return; }
    if (!/[^A-Za-z0-9]/.test(password)) { setPasswordError("Password must contain a special character."); return; }

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
      router.replace("/topics?onboarding=1");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const validation = getValidationErrors(err);
        const passwordError = validation.password?.[0];
        const confirmationError = validation.password_confirmation?.[0];
        const emailError = validation.email?.[0];
        const nameError = validation.name?.[0];

        if (passwordError) setPasswordError(passwordError);
        else if (confirmationError) setConfirmError(confirmationError);
        else if (emailError) setError(emailError);
        else if (nameError) setError(nameError);
        else setError(err.message || "Registration failed. Please check your details.");
      } else {
        setError("Registration failed. Please try again.");
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
          <View>
            <Field icon="lock" value={password} onChangeText={(value) => { setPassword(value); setPasswordError(null); }} placeholder="Password" secureTextEntry iconColor={iconColor} error={Boolean(passwordError)} />
            {passwordError && (
              <Text className="mt-1.5 px-1 font-sans text-xs text-danger">{passwordError}</Text>
            )}
            <Text className="mt-1.5 px-1 font-sans text-xs text-foreground-subtle">
              Use 8–128 characters with uppercase, lowercase, a number, and a special character.
            </Text>
          </View>
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
