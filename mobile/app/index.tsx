import { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/i18n";
import { colors, spacing, typography } from "@/constants/theme";

export default function SplashScreen() {
  const isLoggedIn = useAuth((s) => s.isLoggedIn);
  const lang = useLanguage((s) => s.lang);

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/(tabs)");
    }
  }, [isLoggedIn]);

  if (isLoggedIn) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ROB</Text>
      <Text style={styles.subtitle}>Role of Bridge</Text>
      <Text style={styles.tagline}>Artist Ritual</Text>
      <Text style={styles.desc}>{t("recordPracticeToday", lang)}</Text>
      <Link href="/login" asChild>
        <Pressable style={styles.cta}>
          <Text style={styles.ctaText}>{t("enter", lang)}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  logo: {
    fontSize: typography.display.fontSize,
    fontWeight: typography.display.fontWeight,
    color: colors.textPrimary,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.overline.fontSize,
    fontWeight: typography.overline.fontWeight,
    letterSpacing: 4,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.xxl,
  },
  tagline: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  desc: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
    marginBottom: spacing.xxl,
  },
  cta: {
    paddingVertical: 18,
    paddingHorizontal: 52,
    backgroundColor: colors.bgDark,
  },
  ctaText: {
    color: colors.textOnDark,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
