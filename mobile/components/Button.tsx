import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  fullWidth,
}: ButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles] as TextStyle]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.bgDark,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    backgroundColor: colors.border,
    opacity: 0.7,
  },
  fullWidth: {
    width: "100%",
  },
  pressed: {
    opacity: 0.9,
  },
  text: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  primaryText: {
    color: colors.textOnDark,
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  ghostText: {
    color: colors.accent,
  },
});
