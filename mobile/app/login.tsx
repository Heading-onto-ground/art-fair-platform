import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/i18n";
import { colors, spacing, typography } from "@/constants/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useAuth((s) => s.login);
  const lang = useLanguage((s) => s.lang);
  const setLang = useLanguage((s) => s.setLang);

  const onLogin = async () => {
    setError(null);
    const e = email.trim();
    const p = password.trim();
    if (!e) {
      setError(t("emailRequired", lang));
      return;
    }
    if (!p) {
      setError(t("passwordRequired", lang));
      return;
    }
    setLoading(true);
    const ok = await login(e, p);
    setLoading(false);
    if (ok) {
      router.replace("/(tabs)");
    } else {
      setError(t("loginFailed", lang));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.overline}>Artist Ritual</Text>
          <Text style={styles.title}>{t("signInTitle", lang)}</Text>
          <Text style={styles.subtitle}>
            {t("signInToRecord", lang)}
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>{t("email", lang)}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="artist@example.com"
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>{t("password", lang)}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textLight}
            secureTextEntry
            autoComplete="password"
          />

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={onLogin}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? "..." : t("signIn", lang)}</Text>
          </Pressable>

          <Text style={styles.hint}>
            {t("betaLoginHint", lang)}
          </Text>

          <View style={styles.langRow}>
            <Pressable onPress={() => setLang("en")} style={[styles.langBtn, lang === "en" && styles.langBtnActive]}>
              <Text style={[styles.langBtnText, lang === "en" && styles.langBtnTextActive]}>English</Text>
            </Pressable>
            <Pressable onPress={() => setLang("ko")} style={[styles.langBtn, lang === "ko" && styles.langBtnActive]}>
              <Text style={[styles.langBtnText, lang === "ko" && styles.langBtnTextActive]}>한국어</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Link href="/" asChild>
        <Pressable style={styles.back}>
          <Text style={styles.backText}>{t("backText", lang)}</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  content: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  overline: {
    fontSize: typography.overline.fontSize,
    fontWeight: typography.overline.fontWeight,
    letterSpacing: 2,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.titleLarge.fontSize,
    fontWeight: typography.titleLarge.fontWeight,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.label.fontSize,
    fontWeight: "500",
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    color: colors.textPrimary,
    fontSize: 14,
  },
  errorBox: {
    padding: 14,
    backgroundColor: "rgba(139,74,74,0.08)",
    borderWidth: 1,
    borderColor: "rgba(139,74,74,0.2)",
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
  },
  btn: {
    marginTop: spacing.xl,
    paddingVertical: 18,
    backgroundColor: colors.bgDark,
    alignItems: "center",
    borderRadius: 4,
  },
  btnDisabled: {
    backgroundColor: colors.border,
    opacity: 0.7,
  },
  btnText: {
    color: colors.textOnDark,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  hint: {
    marginTop: spacing.lg,
    fontSize: 11,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  langRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  langBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  langBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  langBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  langBtnTextActive: {
    color: colors.accent,
    fontWeight: "500",
  },
  back: {
    position: "absolute",
    top: 56,
    left: spacing.lg,
  },
  backText: {
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 0.5,
  },
});
