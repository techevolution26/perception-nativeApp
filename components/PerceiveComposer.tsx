import Spinner from "./ui/Spinner";
// components/PerceiveComposer.tsx
//
// The comment/reply input, redesigned around the same "avatar + growing
// input + circular send" language as the chat MessageInput, so composing
// feels consistent everywhere in the app rather than like a plain bordered
// textarea. Purely presentational — callers own all the submission logic.
import { useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Avatar from "./ui/Avatar";
import useAuthStore from "../store/useAuthStore";

interface PerceiveComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  loading?: boolean;
  compact?: boolean; // smaller avatar/padding, used for nested replies
  autoFocus?: boolean;
}

export default function PerceiveComposer({
  value,
  onChangeText,
  onSubmit,
  placeholder = "What's your take on this?",
  loading = false,
  compact = false,
  autoFocus = false,
}: PerceiveComposerProps) {
  const me = useAuthStore((s) => s.user);
  const [focused, setFocused] = useState(false);
  const canSend = value.trim().length > 0 && !loading;

  return (
    <View
      className={`flex-row items-end gap-2.5 rounded-card border bg-surface p-2.5 ${
        focused ? "border-accent/50" : "border-border-hairline"
      }`}
    >
      <View className="pb-0.5">
        <Avatar uri={me?.avatar_url} size={compact ? 26 : 32} />
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8b91a0"
        multiline
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`max-h-28 flex-1 py-1.5 font-sans text-foreground ${compact ? "text-sm" : "text-[15px]"}`}
      />

      <Pressable
        onPress={onSubmit}
        disabled={!canSend}
        accessibilityLabel="Post"
        className={`items-center justify-center rounded-full ${compact ? "h-8 w-8" : "h-9 w-9"} ${
          canSend ? "bg-accent" : "bg-surface-sunken"
        }`}
      >
        {loading ? (
          <Spinner size={18} />
        ) : (
          <Feather name="arrow-up" size={compact ? 14 : 16} color={canSend ? "#201203" : "#8b91a0"} />
        )}
      </Pressable>
    </View>
  );
}
