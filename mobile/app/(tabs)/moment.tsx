import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useMomentsStore } from "@/lib/momentsStore";
import { useAuth } from "@/lib/auth";
import { createMoment } from "@/services/api/momentService";
import { compressAndToBase64 } from "@/utils/image";
import { isExpoGo } from "@/lib/env";
import { MOCK_PROFILE } from "@/constants/mockData";
import { showError, showSuccess } from "@/utils/toast";
import { logError } from "@/utils/logger";
import { calculateStreak } from "@/utils/streak";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/i18n";
import { colors, spacing, typography } from "@/constants/theme";
import type { ArtistState, ArtistMedium } from "@/types";

const STATES: ArtistState[] = [
  "working",
  "thinking",
  "stuck",
  "experimenting",
  "exploring",
  "refining",
  "destroying",
  "restarting",
];
const MEDIA: ArtistMedium[] = [
  "painting",
  "drawing",
  "sculpture",
  "writing",
  "photography",
  "mixed media",
];

function resetForm(
  setImageUri: (v: string | null) => void,
  setNote: (v: string) => void,
  setState: (v: ArtistState) => void,
  setMedium: (v: ArtistMedium) => void
) {
  setImageUri(null);
  setNote("");
  setState("working");
  setMedium("painting");
}

export default function MomentScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<ArtistState>("working");
  const [medium, setMedium] = useState<ArtistMedium>("painting");
  const [saving, setSaving] = useState(false);

  const addMoment = useMomentsStore((s) => s.addMoment);
  const replaceMoment = useMomentsStore((s) => s.replaceMoment);
  const lang = useLanguage((s) => s.lang);
  const getMilestoneKey = (s: number) => s >= 30 ? "monthOfShowingUp" : s >= 7 ? "oneWeekPractice" : s >= 3 ? "buildingRitual" : "youStarted";
  const userId = useAuth((s) => s.userId);
  const userEmail = useAuth((s) => s.userEmail);

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("permissionNeeded", lang), t("cameraRequired", lang));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      showError(t("failedToTakePhoto", lang));
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("permissionNeeded", lang), t("galleryRequired", lang));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      showError(t("failedToTakePhoto", lang));
    }
  };

  const saveMoment = async () => {
    if (!imageUri || saving) return;

    setSaving(true);
    Keyboard.dismiss();

    const momentForLocal = {
      id: `moment-${Date.now()}`,
      artistId: userId || MOCK_PROFILE.id,
      artistName: MOCK_PROFILE.name,
      imageUri,
      note: note.trim() || undefined,
      state,
      medium,
      createdAt: new Date().toISOString(),
    };

    // Save locally first so data survives if app crashes during upload
    await addMoment(momentForLocal);

    try {
      let imageUrl = imageUri;
      if (!isExpoGo() && imageUri.startsWith("file://")) {
        try {
          imageUrl = await compressAndToBase64(imageUri);
        } catch {
          // Keep original URI; local already saved
        }
      }

      const apiResult = isExpoGo()
        ? { ok: false as const }
        : await createMoment({
            note: note.trim() || undefined,
            state,
            medium,
            imageUrl,
          });

      if (apiResult.ok && apiResult.moment) {
        await replaceMoment(momentForLocal.id, apiResult.moment);
      }
      // If API failed, local moment already saved above
      resetForm(setImageUri, setNote, setState, setMedium);
      const newStreak = calculateStreak(useMomentsStore.getState().moments);
      showSuccess(
        `🔥 ${t("dayRecorded", lang, { n: String(newStreak) })}\n\n${t(getMilestoneKey(newStreak), lang)}\n\n${t("seeYouTomorrow", lang)}`,
        () => router.replace("/(tabs)")
      );
    } catch (e) {
      logError(e, "saveMoment");
      // Local already saved; just show success
      resetForm(setImageUri, setNote, setState, setMedium);
      const newStreak = calculateStreak(useMomentsStore.getState().moments);
      showSuccess(
        `🔥 ${t("dayRecorded", lang, { n: String(newStreak) })}\n\n${t(getMilestoneKey(newStreak), lang)}\n\n${t("seeYouTomorrow", lang)}`,
        () => router.replace("/(tabs)")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.overline}>{t("record", lang)}</Text>
        <Text style={styles.title}>{t("recordTodaysPractice", lang)}</Text>
        <Text style={styles.subtitle}>{t("whatWorkingOn", lang)}</Text>

        <View style={styles.imageArea}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderHint}>{t("workInProgressWelcome", lang)}</Text>
              <Text style={styles.placeholderHint}>{t("sketchesExperiments", lang)}</Text>
            </View>
          )}
          <View style={styles.imageActions}>
            <Pressable
              style={({ pressed }) => [styles.imageBtn, pressed && styles.imageBtnPressed]}
              onPress={takePhoto}
            >
              <Text style={styles.imageBtnText}>{t("takePhoto", lang)}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.imageBtn, pressed && styles.imageBtnPressed]}
              onPress={pickImage}
            >
              <Text style={styles.imageBtnText}>{t("addFromGallery", lang)}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.label}>Note</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder={t("notePlaceholder", lang)}
          placeholderTextColor={colors.textLight}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>State</Text>
        <View style={styles.chips}>
          {STATES.map((s) => (
            <Pressable
              key={s}
              style={({ pressed }) => [
                styles.chip,
                state === s && styles.chipActive,
                pressed && styles.chipPressed,
              ]}
              onPress={() => setState(s)}
            >
              <Text style={[styles.chipText, state === s && styles.chipTextActive]}>
                {t(`state_${s}`, lang)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Medium</Text>
        <View style={styles.chips}>
          {MEDIA.map((m) => (
            <Pressable
              key={m}
              style={({ pressed }) => [
                styles.chip,
                medium === m && styles.chipActive,
                pressed && styles.chipPressed,
              ]}
              onPress={() => setMedium(m)}
            >
              <Text style={[styles.chipText, medium === m && styles.chipTextActive]}>
                {m}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            !imageUri && styles.saveBtnDisabled,
            saving && styles.saveBtnDisabled,
            pressed && !saving && imageUri && styles.saveBtnPressed,
          ]}
          onPress={saveMoment}
          disabled={!imageUri || saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? t("recording", lang) : t("recordPractice", lang)}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  overline: {
    fontSize: typography.overline.fontSize,
    fontWeight: typography.overline.fontWeight,
    letterSpacing: 2,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.titleLarge.fontSize,
    fontWeight: typography.titleLarge.fontWeight,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  imageArea: {
    marginBottom: spacing.xl,
  },
  preview: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: 4,
  },
  placeholder: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  placeholderHint: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textMuted,
  },
  imageActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  imageBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: "center",
  },
  imageBtnPressed: {
    opacity: 0.8,
  },
  imageBtnText: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  label: {
    fontSize: typography.label.fontSize,
    fontWeight: "500",
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
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
    minHeight: 88,
    textAlignVertical: "top",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    borderRadius: 4,
  },
  chipActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.bgDark,
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipText: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  chipTextActive: {
    color: colors.textOnDark,
  },
  saveBtn: {
    marginTop: spacing.xxl,
    paddingVertical: 18,
    backgroundColor: colors.bgDark,
    alignItems: "center",
    borderRadius: 4,
  },
  saveBtnDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  saveBtnPressed: {
    opacity: 0.9,
  },
  saveBtnText: {
    color: colors.textOnDark,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
