// components/ui/Card.tsx
import { View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  className?: string;
}

export default function Card({ className = "", ...props }: CardProps) {
  return (
    <View
      className={`rounded-card border border-border-hairline bg-surface ${className}`}
      {...props}
    />
  );
}
