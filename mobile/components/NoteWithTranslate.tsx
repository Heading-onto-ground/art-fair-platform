/**
 * Artist note with optional translate button.
 */

import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { translateNote } from "@/services/translation";
import { showError } from "@/utils/toast";
import { t, type Lang } from "@/lib/i18n";
import { colors, spacing, typography } from "@/constants/theme";

interface NoteWithTranslateProps {
  note: string | undefined;
  lang: Lang;
  numberOfLines?: number;
}

export function NoteWithTranslate({
  note,
  lang,
  numberOfLines = 1,
}: NoteWithTranslateProps) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayText = translated ?? (note?.trim() || t("noArtistNote", lang));
  const hasNote = note?.trim();
  const isTranslated = translated !== null;

  const handleTranslate = async () => {
    if (!hasNote || loading) return;
    setLoading(true);
    setTranslated(null);
    try {
      const res = await translateNote(note!.trim(), lang);
      if (res.ok && res.translated) {
        setTranslated(res.translated);
      } else {
        showError(res.error === "ALREADY_IN_LANG" ? t("alreadyInYourLang", lang) : (res.error || "Translation failed"));
      }
    } catch {
      showError("Translation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTranslated(null);
  };

  return (
    <View style={styles.wrap}>
      <Text
        style={styles.note}
        numberOfLines={numberOfLines}
        ellipsizeMode="tail"
        selectable
      >
        {displayText}
      </Text>
      {hasNote && (
        <Pressable
          onPress={isTranslated ? handleReset : handleTranslate}
          style={styles.btn}
          disabled={loading}
          accessibilityLabel={t("translate", lang)}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.btnText}>{isTranslated ? "↩" : "🌐"}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 22,
    alignSelf: "stretch",
  },
  note: {
    flex: 1,
    flexShrink: 1,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    lineHeight: 1.5,
    minWidth: 0,
  },
  btn: {
    padding: spacing.xs,
  },
  btnText: {
    fontSize: 14,
  },
});
