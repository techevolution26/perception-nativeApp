import { Pressable, Text, View } from "react-native";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import type { UserSlim } from "../../types/models";

interface ProfileListItemProps {
  user: UserSlim;
  onPress: () => void;
}

export default function ProfileListItem({ user, onPress }: ProfileListItemProps) {
  const roleLabel = user.primary_professional_role_label ?? user.professional_role_labels?.[0] ?? user.profession;
  const industryCode = user.professional_industries?.[0] ?? null;
  const verified = user.verification_status === "VERIFIED" && (user.verified_professional_roles?.length ?? 0) > 0;

  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 rounded-card border border-border-hairline bg-surface px-3.5 py-3">
      <Avatar uri={user.avatar_url} size="md" />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center">
          <Text numberOfLines={1} className="min-w-0 max-w-[82%] font-sans-medium text-foreground">
            {user.name}
          </Text>
          {roleLabel && (
            <View className="ml-1.5">
              <VerifiedBadge
                roleCode={user.primary_professional_role}
                industryCode={industryCode}
                compact
                verified={verified}
              />
            </View>
          )}
        </View>
        {roleLabel ? (
          <Text numberOfLines={1} className="mt-0.5 font-sans text-xs text-foreground-subtle">
            {roleLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
