// components/ui/ActionMenu.tsx
import { Modal, View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";

export interface ActionMenuItem {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  items: ActionMenuItem[];
  title?: string;
}

export default function ActionMenu({
  visible,
  onClose,
  items,
  title,
}: ActionMenuProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(150)}
        className="flex-1 justify-end bg-overlay"
      >
        <Pressable className="absolute inset-0" onPress={onClose} />
        <Animated.View
          entering={SlideInDown.duration(220).damping(18)}
          className="rounded-t-card border border-b-0 border-border-hairline bg-surface"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <View className="items-center py-2.5">
            <View className="h-1 w-9 rounded-full bg-border-strong" />
          </View>

          {title && (
            <Text className="border-b border-border-hairline px-4 pb-3 pt-1 text-center font-sans text-xs text-foreground-subtle">
              {title}
            </Text>
          )}

          {items.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              className={`flex-row items-center gap-3 px-5 py-3.5 ${i > 0 ? "border-t border-border-hairline" : ""}`}
            >
              <Feather
                name={item.icon}
                size={18}
                color={item.destructive ? "#e5484d" : "#666c7a"}
              />
              <Text
                className={`font-sans text-[15px] ${item.destructive ? "text-danger" : "text-foreground"}`}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={onClose}
            className="mx-4 mt-2 items-center rounded-control bg-surface-sunken py-3.5"
          >
            <Text className="font-sans-medium text-[15px] text-foreground-muted">
              Cancel
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
