import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, Dimensions, Platform } from "react-native";
import { QuickRecordFAB } from "@/components/QuickRecordFAB";
import { Link, router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/i18n";
import { useMomentsStore } from "@/lib/momentsStore";
import { MOCK_PROFILE } from "@/constants/mockData";
import { Card } from "@/components/Card";
import {
  calculateStreak,
  hasRecordedToday,
  getStreakMilestoneMessage,
  getMicroMilestone,
  getRitualStatus,
} from "@/utils/streak";
import { colors, spacing, typography } from "@/constants/theme";

export default function HomeScreen() {
  const logout = useAuth((s) => s.logout);
  const lang = useLanguage((s) => s.lang);
  const setLang = useLanguage((s) => s.setLang);
  const loadMoments = useMomentsStore((s) => s.load);
  const moments = useMomentsStore((s) => s.moments);
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

  const formatDate = () => {
    const d = new Date();
    return d.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { month: "long", day: "numeric" });
  };

  const myMoments = moments;
  const streak = calculateStreak(myMoments);
  const recordedToday = hasRecordedToday(myMoments);
  const ritualStatus = getRitualStatus(myMoments);
  const thisWeek = myMoments.filter((m) => {
    const created = new Date(m.createdAt).getTime();
    const weekAgo = Date.now() - 7 * 86400000;
    return created >= weekAgo;
  }).length;

  const recentMoments = myMoments.slice(0, 2);
  const minHeight = Dimensions.get("window").height + 1;

  return (
    <View style={styles.wrapper}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { flexGrow: 1, minHeight }]}
      showsVerticalScrollIndicator={false}
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
        <Text style={styles.logo}>ROB</Text>
        <View style={styles.headerRow}>
          <Text style={styles.date}>{formatDate()}</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={onRefresh} style={styles.refreshBtn} accessibilityLabel={t("refresh", lang)}>
              <Text style={styles.refreshIcon}>{refreshing ? "⋯" : "↻"}</Text>
            </Pressable>
            <View style={styles.langRow}>
            <Pressable onPress={() => setLang("en")} style={[styles.langBtn, lang === "en" && styles.langBtnActive]}>
              <Text style={[styles.langBtnText, lang === "en" && styles.langBtnTextActive]}>EN</Text>
            </Pressable>
            <Pressable onPress={() => setLang("ko")} style={[styles.langBtn, lang === "ko" && styles.langBtnActive]}>
              <Text style={[styles.langBtnText, lang === "ko" && styles.langBtnTextActive]}>한</Text>
            </Pressable>
            </View>
          </View>
        </View>
      </View>

      <Card style={styles.ritualCard}>
        <Text style={styles.overline}>Artist Ritual</Text>
        <Text style={styles.valueProp}>{t("proofOfPractice", lang)}</Text>
        <Text style={styles.cardTitle}>{t("recordPracticeToday", lang)}</Text>
        <View collapsable={false} style={styles.cardDescWrap}>
          <Text style={styles.cardDesc} {...(Platform.OS === "android" && { includeFontPadding: false })}>
            {t("captureMoment", lang)}
          </Text>
        </View>
        {recordedToday ? (
          <View style={styles.todayRecorded}>
            <Text style={styles.todayBadge}>
              {ritualStatus === "active"
                ? `🔥 ${t("activeArtist", lang)}`
                : ritualStatus === "late"
                  ? `🕒 ${t("lateArtist", lang)}`
                  : t("youShoweUpToday", lang)}
            </Text>
          </View>
        ) : (
          <View style={styles.todayRecorded}>
            <Text style={styles.missedBadge}>❌ {t("missedRitual", lang)}</Text>
          </View>
        )}
        {!recordedToday && (streak > 0 ? (
          <Text style={styles.streakPrompt}>{t("recordTodayToKeep", lang)}</Text>
        ) : myMoments.length > 0 ? (
          <Text style={styles.streakPrompt}>{t("startNewStreak", lang)}</Text>
        ) : null)}
        {(() => {
          const msg = getStreakMilestoneMessage(streak);
          const key = msg ? (msg.includes("30") ? "streak30" : msg.includes("7") ? "streak7" : "streak3") : streak >= 30 ? "monthOfShowingUp" : streak >= 7 ? "oneWeekPractice" : streak >= 3 ? "buildingRitual" : streak >= 1 ? "youStarted" : null;
          return key ? (
            <Text style={styles.milestoneText}>{t(key, lang)}</Text>
          ) : null;
        })()}
        <Link href="/(tabs)/moment" asChild>
          <Pressable style={styles.cta}>
            <Text style={styles.ctaText}>{t("recordPractice", lang)}</Text>
          </Pressable>
        </Link>
      </Card>

      <View style={styles.stats}>
        <View style={[styles.stat, recordedToday && styles.statHighlight]}>
          <Text style={styles.statValue}>
            {streak > 0 ? streak : "—"}
          </Text>
          <Text style={styles.statLabel}>{t("currentStreak", lang)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{thisWeek}</Text>
          <Text style={styles.statLabel}>{t("thisWeek", lang)}</Text>
        </View>
      </View>

      {recentMoments.length > 0 && (
        <View style={styles.recent}>
          <Text style={styles.recentTitle}>{t("recent", lang)}</Text>
          {recentMoments.map((m) => (
            <View key={m.id} style={styles.recentItem}>
              <Text style={styles.recentState}>{m.state}</Text>
              <Text style={styles.recentMedium}> · {m.medium}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Link href="/(tabs)/feed" asChild>
          <Pressable style={styles.link}>
            <Text style={styles.linkText}>{t("viewFeed", lang)}</Text>
          </Pressable>
        </Link>
        <Link href="/(tabs)/profile" asChild>
          <Pressable style={styles.link}>
            <Text style={styles.linkText}>{t("myTimeline", lang)}</Text>
          </Pressable>
        </Link>
      </View>

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
    <QuickRecordFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  refreshBtn: {
    padding: spacing.sm,
  },
  refreshIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  langRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  langBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  langBtnText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  langBtnTextActive: {
    color: colors.accent,
    fontWeight: "500",
  },
  logo: {
    fontSize: typography.display.fontSize,
    fontWeight: typography.display.fontWeight,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  date: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textMuted,
  },
  ritualCard: {
    marginBottom: spacing.xl,
  },
  overline: {
    fontSize: typography.overline.fontSize,
    fontWeight: typography.overline.fontWeight,
    letterSpacing: 2,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  valueProp: {
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    lineHeight: 14,
  },
  cardTitle: {
    fontSize: typography.titleLarge.fontSize,
    fontWeight: typography.titleLarge.fontWeight,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  cardDescWrap: {
    marginBottom: spacing.lg,
    minHeight: 44,
  },
  cardDesc: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  todayRecorded: {
    marginBottom: spacing.sm,
  },
  todayBadge: {
    fontSize: typography.body.fontSize,
    fontWeight: "500",
    color: colors.success,
  },
  missedBadge: {
    fontSize: typography.body.fontSize,
    fontWeight: "500",
    color: colors.error,
  },
  streakPrompt: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    fontStyle: "italic",
  },
  milestoneText: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.accent,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  statHighlight: {
    borderColor: colors.success,
    backgroundColor: "rgba(90, 122, 90, 0.06)",
  },
  cta: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    backgroundColor: colors.bgDark,
    alignSelf: "flex-start",
  },
  ctaText: {
    color: colors.textOnDark,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  stats: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  stat: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 32,
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
  recent: {
    marginBottom: spacing.xl,
  },
  recentTitle: {
    fontSize: typography.label.fontSize,
    fontWeight: "500",
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  recentItem: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  recentState: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
  },
  recentMedium: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  link: {
    paddingVertical: spacing.sm,
  },
  linkText: {
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  logout: {
    paddingVertical: spacing.lg,
  },
  logoutText: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
});
