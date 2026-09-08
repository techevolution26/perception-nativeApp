import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { ComponentProps } from "react";
import VantageMark from "./VantageMark";
import Spinner from "./Spinner";

interface StateViewProps {
  kind: "loading" | "empty" | "error";
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ComponentProps<typeof Feather>["name"];
}

export default function StateView({
  kind,
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: StateViewProps) {
  if (kind === "loading") return <Spinner className="py-12" size={28} />;

  const defaultIcon = kind === "error" ? "wifi-off" : "inbox";
  return (
    <View className="items-center px-8 py-14">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full border border-border-hairline bg-surface-sunken">
        {kind === "error" ? (
          <Feather name={icon ?? defaultIcon} size={22} color="#8b91a0" />
        ) : (
          <VantageMark size={28} color="#8b91a0" />
        )}
      </View>
      <Text className="text-center font-sans-semibold text-base text-foreground">
        {title ??
          (kind === "error" ? "Something went wrong" : "Nothing here yet")}
      </Text>
      <Text className="mt-1.5 max-w-sm text-center font-sans text-sm leading-5 text-foreground-subtle">
        {message ??
          (kind === "error"
            ? "Check your connection and try again."
            : "Your next contribution will appear here.")}
      </Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          className="mt-4 rounded-control bg-accent px-4 py-2.5 active:opacity-80"
        >
          <Text className="font-sans-semibold text-sm text-accent-on">
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
