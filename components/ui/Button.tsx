// components/ui/Button.tsx
//
// Unlike the web Button, this takes an explicit `label` + optional `icon`
// prop pair rather than freeform children. React Native throws at runtime
// if a bare text string ends up as a sibling of another element outside a
// <Text> — a pattern the web version relied on constantly (icon + "Post
// perception" as mixed children). Explicit props sidestep that entirely.
import { Pressable, Text, View, type PressableProps } from "react-native";
import type { ReactNode } from "react";
import Spinner from "./Spinner";

const VARIANT_CLASSES = {
  primary: "bg-foreground border-transparent",
  accent: "bg-accent border-transparent",
  outline: "bg-transparent border-border-strong",
  ghost: "bg-transparent border-transparent",
  danger: "bg-transparent border-danger/30",
} as const;

const TEXT_CLASSES = {
  primary: "text-background",
  accent: "text-accent-on",
  outline: "text-foreground",
  ghost: "text-foreground-muted",
  danger: "text-danger",
} as const;

const SIZE_CLASSES = {
  sm: "px-3 py-2 gap-1.5",
  md: "px-4 py-2.5 gap-2",
  lg: "px-5 py-3.5 gap-2",
} as const;

const TEXT_SIZE_CLASSES = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
} as const;

interface ButtonProps extends PressableProps {
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
  loading?: boolean;
  className?: string;
  label: string;
  icon?: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  label,
  icon,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      disabled={disabled || loading}
      className={`flex-row items-center justify-center rounded-control border active:opacity-80 disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Spinner size={18} />
      ) : (
        icon && <View>{icon}</View>
      )}
      <Text className={`font-sans-medium ${TEXT_CLASSES[variant]} ${TEXT_SIZE_CLASSES[size]}`}>{label}</Text>
    </Pressable>
  );
}
