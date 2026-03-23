import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/i18n";
import { useMomentsStore } from "@/lib/momentsStore";
import { calculateStreak } from "@/utils/streak";
import { MOCK_PROFILE } from "@/constants/mockData";
import {
  getNotificationPreference,
  saveNotificationPreference,
  requestNotificationPermission,
  scheduleDailyRitualNotification,
  cancelDailyRitualNotification,
  scheduleTestNotification,
} from "@/services/notifications";
import Constants from "expo-constants";
import { colors, spacing, typography } from "@/constants/theme";
import { getArtistProfileUrl } from "@/constants/api";

export default function ProfileScreen() {
  const logout = useAuth((s) => s.logout);
  const userId = useAuth((s) => s.userId);
  const lang = useLanguage((s) => s.lang);
  const setLang = useLanguage((s) => s.setLang);
  const loadMoments = useMomentsStore((s) => s.load);
  const moments = useMomentsStore((s) => s.moments);

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [testScheduled, setTestScheduled] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadMoments();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMoments();
  }, [loadMoments]);

  useEffect(() => {
    getNotificationPreference().then(async (v) => {
      setNotifEnabled(v);
      setNotifLoaded(true);
      if (v) {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleDailyRitualNotification();
        }
      }
    });
  }, []);

  const ritualCount = moments.length;
  const displayRitualPosts = ritualCount > 0 ? ritualCount : MOCK_PROFILE.ritualPosts;
  const displayStreak = ritualCount > 0 ? calculateStreak(moments) : 0;

  const onTestNotification = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
        t("permissionNeeded", lang),
        t("enableNotifications", lang)
      );
      return;
    }
    try {
      await scheduleTestNotification();
      setTestScheduled(true);
      Alert.alert("", t("testScheduled", lang));
      setTimeout(() => setTestScheduled(false), 3000);
    } catch {
      Alert.alert(t("error", lang), t("enableNotifications", lang));
    }
  };

  const toggleNotification = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          t("permissionNeeded", lang),
          t("itsPracticeTime", lang)
        );
        return;
      }
      await scheduleDailyRitualNotification();
    } else {
      await cancelDailyRitualNotification();
    }
    await saveNotificationPreference(value);
    setNotifEnabled(value);
  };

  const recentMoments = moments.slice(0, 5);
  const minHeight = Dimensions.get("window").height + 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { flexGrow: 1, minHeight }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <View style={styles.header}>
        <Pressable onPress={onRefresh} style={styles.refreshBtn} accessibilityLabel={t("refresh", lang)}>
          <Text style={styles.refreshIcon}>{refreshing ? "⋯" : "↻"}</Text>
        </Pressable>
        <View style={styles.headerTop}>
          <View style={styles.avatar} />
        </View>
        <Text style={styles.name}>{MOCK_PROFILE.name}</Text>
        {MOCK_PROFILE.bio && (
          <Text style={styles.bio}>{MOCK_PROFILE.bio}</Text>
        )}
      </View>

      <View style={styles.stats} collapsable={false}>
        <Link href="/(tabs)/moment" asChild>
          <TouchableOpacity
            style={styles.stat}
            activeOpacity={0.6}
            accessibilityLabel={t("practiceSessions", lang)}
            accessibilityRole="button"
          >
            <Text style={styles.statValue}>{displayRitualPosts}</Text>
            <Text style={styles.statLabel}>{t("practiceSessions", lang)}</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(tabs)/moment" asChild>
          <TouchableOpacity
            style={styles.stat}
            activeOpacity={0.6}
            accessibilityLabel={t("currentStreak", lang)}
            accessibilityRole="button"
          >
            <Text style={styles.statValue}>{displayStreak > 0 ? displayStreak : "—"}</Text>
            <Text style={styles.statLabel}>{t("currentStreak", lang)}</Text>
          </TouchableOpacity>
        </Link>
        <TouchableOpacity
          style={styles.stat}
          activeOpacity={0.6}
          onPress={() => {
            if (userId) {
              const url = getArtistProfileUrl(userId);
              Alert.alert(
                t("openWebProfileTitle", lang),
                t("openWebProfileMessage", lang),
                [
                  { text: t("openWebProfileCancel", lang), style: "cancel" },
                  { text: t("openWebProfileConfirm", lang), onPress: () => Linking.openURL(url) },
                ]
              );
            }
          }}
          accessibilityLabel={t("exhibitions", lang)}
          accessibilityRole="button"
        >
          <Text style={styles.statValue}>{MOCK_PROFILE.exhibitions}</Text>
          <Text style={styles.statLabel}>{t("exhibitions", lang)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.stat}
          activeOpacity={0.6}
          onPress={() => {
            if (userId) {
              const url = getArtistProfileUrl(userId);
              Alert.alert(
                t("openWebProfileTitle", lang),
                t("openWebProfileMessage", lang),
                [
                  { text: t("openWebProfileCancel", lang), style: "cancel" },
                  { text: t("openWebProfileConfirm", lang), onPress: () => Linking.openURL(url) },
                ]
              );
            }
          }}
          accessibilityLabel={t("activityLogs", lang)}
          accessibilityRole="button"
        >
          <Text style={styles.statValue}>{moments.length + MOCK_PROFILE.activityLogs}</Text>
          <Text style={styles.statLabel}>{t("activityLogs", lang)}</Text>
        </TouchableOpacity>
      </View>

      {userId && (
        <Pressable
          style={styles.fullProfileBtn}
          onPress={() => {
            const url = getArtistProfileUrl(userId);
            Alert.alert(
              t("openWebProfileTitle", lang),
              t("openWebProfileMessage", lang),
              [
                { text: t("openWebProfileCancel", lang), style: "cancel" },
                { text: t("openWebProfileConfirm", lang), onPress: () => Linking.openURL(url) },
              ]
            );
          }}
        >
          <Text style={styles.fullProfileBtnText}>{t("viewFullProfile", lang)}</Text>
          <Text style={styles.fullProfileBtnDesc}>{t("viewFullProfileDesc", lang)}</Text>
        </Pressable>
      )}

      <View style={styles.settings}>
        <Text style={styles.settingsTitle}>{t("language", lang)}</Text>
        <View style={styles.langRow}>
          <Pressable onPress={() => setLang("en")} style={[styles.langBtn, lang === "en" && styles.langBtnActive]}>
            <Text style={[styles.langBtnText, lang === "en" && styles.langBtnTextActive]}>English</Text>
          </Pressable>
          <Pressable onPress={() => setLang("ko")} style={[styles.langBtn, lang === "ko" && styles.langBtnActive]}>
            <Text style={[styles.langBtnText, lang === "ko" && styles.langBtnTextActive]}>한국어</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.settings}>
        <Text style={styles.settingsTitle}>{t("notifications", lang)}</Text>
        <Text style={styles.settingsDesc}>
          {t("itsPracticeTime", lang)}
        </Text>
        {notifLoaded && (
          <>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t("dailyPracticePrompt", lang)}</Text>
              <Switch
                value={notifEnabled}
                onValueChange={toggleNotification}
                trackColor={{ false: "#D1D5DB", true: colors.success }}
                thumbColor={notifEnabled ? "#FFFFFF" : "#9CA3AF"}
              />
            </View>
            {/* DEV: Test notification in 1 minute. Remove or hide in production. */}
            <Pressable
              style={styles.testBtn}
              onPress={onTestNotification}
              disabled={testScheduled}
            >
              <Text style={styles.testBtnText}>
                {testScheduled ? t("testScheduled", lang) : t("testNotification", lang)}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <Pressable
        style={styles.feedbackBtn}
        onPress={() => {
          Linking.openURL(
            "mailto:contact@rob-roleofbridge.com?subject=Artist%20Ritual%20Beta%20Feedback"
          );
        }}
      >
        <Text style={styles.feedbackBtnText}>{t("sendBetaFeedback", lang)}</Text>
      </Pressable>

      <View style={styles.timeline}>
        <Text style={styles.timelineTitle}>{t("recentTimeline", lang)}</Text>
        {recentMoments.length > 0 ? (
          recentMoments.map((m) => (
            <Link key={m.id} href="/(tabs)/moment" asChild>
              <Pressable
                style={({ pressed }) => [styles.timelineItem, pressed && styles.timelineItemPressed]}
              >
              <Text style={styles.timelineDate}>
                {new Date(m.createdAt).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
              <Text style={styles.timelineDetail}>
                {m.state} · {m.medium}
              </Text>
            </Pressable>
            </Link>
          ))
        ) : (
          <Link href="/(tabs)/moment" asChild>
            <Pressable
              style={({ pressed }) => [styles.emptyTimeline, pressed && styles.timelineItemPressed]}
            >
            <Text style={styles.emptyTimelineText}>
              {t("thisSpaceWillFill", lang)}
            </Text>
          </Pressable>
          </Link>
        )}
      </View>

      {__DEV__ && (
        <Pressable
          style={styles.devVerifyBtn}
          onPress={() => router.push("/verify-day1")}
        >
          <Text style={styles.devVerifyBtnText}>Day 1 검증 (개발용)</Text>
        </Pressable>
      )}

      <Text style={styles.versionLabel}>
        Artist Ritual v{Constants.expoConfig?.version ?? "0.1.0"} · Beta
        {__DEV__ ? " · dev" : ""}
      </Text>

      <Pressable
        style={styles.logout}
        onPress={async () => {
          await logout();
          router.replace("/");
        }}
      >
        <Text style={styles.logoutText}>{t("signOut", lang)}</Text>
      </Pressable>
    </ScrollView>
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
  header: {
    position: "relative",
    alignSelf: "stretch",
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  refreshBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: spacing.sm,
  },
  refreshIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.border,
  },
  name: {
    fontSize: typography.titleLarge.fontSize,
    fontWeight: "400",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  bio: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: 280,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  stat: {
    flex: 1,
    minWidth: "45%",
    padding: spacing.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "300",
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: typography.label.fontSize,
    fontWeight: "500",
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
  settings: {
    marginBottom: spacing.xxl,
    padding: spacing.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  settingsTitle: {
    fontSize: typography.label.fontSize,
    fontWeight: "500",
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  settingsDesc: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
    lineHeight: 1.5,
    marginBottom: spacing.md,
  },
  langRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  testBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  testBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  timeline: {
    marginBottom: spacing.xxl,
  },
  timelineTitle: {
    fontSize: typography.label.fontSize,
    fontWeight: "500",
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  timelineItem: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  timelineItemPressed: {
    backgroundColor: colors.bgCardHover,
  },
  emptyTimeline: {
    paddingVertical: spacing.lg,
  },
  emptyTimelineText: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  timelineDate: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
    width: 52,
  },
  timelineDetail: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textMuted,
  },
  fullProfileBtn: {
    marginBottom: spacing.xxl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  fullProfileBtnText: {
    fontSize: typography.body.fontSize,
    fontWeight: "600",
    color: colors.textOnDark,
    letterSpacing: 0.5,
  },
  fullProfileBtnDesc: {
    fontSize: typography.bodySmall.fontSize,
    color: "rgba(253, 251, 247, 0.9)",
    marginTop: spacing.xs,
    lineHeight: 1.4,
  },
  feedbackBtn: {
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  feedbackBtnText: {
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  devVerifyBtn: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  devVerifyBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  versionLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    letterSpacing: 0.5,
  },
  logout: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
});
