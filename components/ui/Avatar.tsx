// components/ui/Avatar.tsx
import { Image } from "expo-image";
import { View } from "react-native";

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 88 } as const;
type AvatarSize = keyof typeof SIZES | number;

const DEFAULT_AVATAR = require("../../assets/default-avatar.png");

interface AvatarProps {
  uri?: string | null;
  size?: AvatarSize;
  className?: string;
}

export default function Avatar({ uri, size = "md", className = "" }: AvatarProps) {
  const px = typeof size === "number" ? size : SIZES[size];
  return (
    <View
      className={`overflow-hidden rounded-full bg-surface-sunken ${className}`}
      style={{ width: px, height: px }}
    >
      <Image
        source={uri ? { uri } : DEFAULT_AVATAR}
        style={{ width: px, height: px }}
        contentFit="cover"
        transition={150}
      />
    </View>
  );
}
