import type { ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Pressable with a subtle press-opacity, used for POS controls. */
export function PressableScale({ onPress, disabled, style, children }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [style, pressed && !disabled ? { opacity: 0.7 } : null]}
    >
      {children}
    </Pressable>
  );
}
