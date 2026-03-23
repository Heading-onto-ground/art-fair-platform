import { Text, StyleSheet } from "react-native";
import { colors, typography } from "@/constants/theme";

interface LabelProps {
  children: string;
}

export function Label({ children }: LabelProps) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
});
