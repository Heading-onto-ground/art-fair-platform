import { useState } from "react";
import { Pressable, Text, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { quickRecordAndSave } from "@/lib/quickRecord";
import { showError, showSuccess } from "@/utils/toast";
import { calculateStreak } from "@/utils/streak";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/i18n";
import { useMomentsStore } from "@/lib/momentsStore";
import { colors } from "@/constants/theme";

const getMilestoneKey = (s: number) => s >= 30 ? "monthOfShowingUp" : s >= 7 ? "oneWeekPractice" : s >= 3 ? "buildingRitual" : "youStarted";

export function QuickRecordFAB() {
  const [loading, setLoading] = useState(false);
  const lang = useLanguage((s) => s.lang);

  const onPress = async () => {
    if (loading) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("permissionNeeded", lang), t("cameraRequired", lang));
        return;
      }
      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled) {
        const ok = await quickRecordAndSave(result.assets[0].uri);
        if (ok) {
          const streak = calculateStreak(useMomentsStore.getState().moments);
          showSuccess(
            `🔥 ${t("dayRecorded", lang, { n: String(streak) })}\n\n${t(getMilestoneKey(streak), lang)}\n\n${t("seeYouTomorrow", lang)}`,
            () => router.replace("/(tabs)")
          );
        } else {
          showError(t("failedToSave", lang));
        }
      }
    } catch {
      showError(t("failedToTakePhoto", lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      onPress={onPress}
      disabled={loading}
    >
      <Text style={styles.fabIcon}>◉</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 72,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.bgDark,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabPressed: { opacity: 0.9 },
  fabIcon: {
    fontSize: 24,
    color: colors.textOnDark,
  },
});
