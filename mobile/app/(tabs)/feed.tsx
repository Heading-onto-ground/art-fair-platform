import { useEffect, useState, useCallback, memo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, StyleSheet, FlatList, Image, ScrollView, RefreshControl, Dimensions, Pressable, Linking, Alert, Platform } from "react-native";
import { useMomentsStore } from "@/lib/momentsStore";
import { hasRecordedToday } from "@/utils/streak";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/i18n";
import { fetchRecentMoments } from "@/services/api/momentService";
import { getReactions, setReaction } from "@/services/storage/reactions";
import { ReactionBar } from "@/components/ReactionBar";
import { getArtistProfileUrl } from "@/constants/api";
import { MOCK_MOMENTS } from "@/constants/mockData";
import { colors, spacing, typography } from "@/constants/theme";
import type { ArtistMoment, ReactionType } from "@/types";
import { Link } from "expo-router";

const MomentCard = memo(function MomentCard({
  item,
  lang,
  onReactionUpdate,
  onRefresh,
}: {
  item: ArtistMoment;
  lang: "en" | "ko";
  onReactionUpdate?: (momentId: string, reactions: Record<string, number>, myReaction: ReactionType | null) => void;
  onRefresh?: () => void;
}) {
  const date = new Date(item.createdAt).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
  });

  const openProfile = () => {
    if (!item.artistId) return;
    const url = getArtistProfileUrl(item.artistId);
    Alert.alert(
      t("openWebProfileTitleOther", lang, { name: item.artistName }),
      t("openWebProfileMessageOther", lang, { name: item.artistName }),
      [
        { text: t("openWebProfileCancel", lang), style: "cancel" as const },
        { text: t("openWebProfileConfirm", lang), onPress: () => Linking.openURL(url) },
      ]
    );
  };

  const noteText = item.note?.trim() || t("noArtistNote", lang);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.artistName}>{item.artistName}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <View style={styles.noteBox} collapsable={false}>
        <Text style={styles.note} numberOfLines={2} ellipsizeMode="tail" {...(Platform.OS === "android" && { includeFontPadding: false })}>
          {noteText}
        </Text>
      </View>
      {item.artistId ? (
        <Pressable onPress={openProfile} accessibilityLabel={`${item.artistName} profile`}>
          <Image source={{ uri: item.imageUri }} style={styles.image} />
        </Pressable>
      ) : (
        <Image source={{ uri: item.imageUri }} style={styles.image} />
      )}
      <View style={styles.tags}>
        <Text style={styles.tag}>{item.state}</Text>
        <Text style={styles.tagDot}>·</Text>
        <Text style={styles.tag}>{item.medium}</Text>
      </View>
      <ReactionBar
        moment={{ ...item, reactions: item.reactions ?? {}, myReaction: item.myReaction ?? null }}
        onReactionUpdate={(id, reactions, myReaction) => {
          onReactionUpdate?.(id, reactions, myReaction);
          onRefresh?.();
        }}
      />
    </View>
  );
});

function EmptyFeed({ lang }: { lang: "en" | "ko" }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{t("noMomentsYet", lang)}</Text>
      <Text style={styles.emptyDesc}>{t("messyStudioWelcome", lang)}</Text>
    </View>
  );
}

export default function FeedScreen() {
  const loadMoments = useMomentsStore((s) => s.load);
  const lang = useLanguage((s) => s.lang);
  const userMoments = useMomentsStore((s) => s.moments);
  const postedToday = hasRecordedToday(userMoments);
  const [recentMoments, setRecentMoments] = useState<ArtistMoment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [localReactions, setLocalReactions] = useState<
    Record<string, { reactions: Record<string, number>; myReaction: ReactionType | null }>
  >({});

  const onRefresh = async () => {
    setRefreshing(true);
    const safetyTimeout = setTimeout(() => setRefreshing(false), 15000);
    try {
      await loadMoments();
      await fetchRecent();
    } finally {
      clearTimeout(safetyTimeout);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMoments();
  }, [loadMoments]);

  useEffect(() => {
    let cancelled = false;
    getReactions().then((stored) => {
      if (!cancelled) setLocalReactions(stored);
    });
    return () => { cancelled = true; };
  }, []);

  const fetchRecent = async () => {
    const res = await fetchRecentMoments();
    if (res.ok && res.moments) setRecentMoments(res.moments);
  };
  useEffect(() => {
    fetchRecent();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const res = await fetchRecentMoments();
        if (!cancelled && res.ok && res.moments) setRecentMoments(res.moments);
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const allMoments = [...userMoments, ...MOCK_MOMENTS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleReactionUpdate = useCallback(
    (momentId: string, reactions: Record<string, number>, myReaction: ReactionType | null) => {
      setLocalReactions((prev) => ({
        ...prev,
        [momentId]: { reactions, myReaction },
      }));
      setReaction(momentId, reactions, myReaction);
    },
    []
  );

  const mediumsFromRecent = [...new Set(recentMoments.map((m) => m.medium))];
  const hasRecent = recentMoments.length > 0;

  const minHeight = Dimensions.get("window").height + 1;
  const byMedium = hasRecent
    ? mediumsFromRecent.reduce<Record<string, ArtistMoment[]>>((acc, m) => {
        acc[m] = recentMoments.filter((x) => x.medium === m);
        return acc;
      }, {})
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <Text style={styles.overline}>
              {hasRecent ? t("practiceSession", lang) : t("practiceFeed", lang)}
            </Text>
            {hasRecent ? (
              <>
                <Text style={styles.title}>🔥 {t("artistsWorkingNow", lang)}</Text>
                <Text style={styles.subtitle}>
                  {t("artistCountRecording", lang, { n: String(recentMoments.length) })}
                </Text>
                {mediumsFromRecent.length > 0 && (
                  <View style={styles.mediumChips}>
                    {mediumsFromRecent.slice(0, 5).map((m) => (
                      <Text key={m} style={styles.mediumChip}>
                        {m}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.title}>{t("otherArtistsMoments", lang)}</Text>
                <Text style={styles.subtitle}>{t("processOverProduct", lang)}</Text>
              </>
            )}
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={onRefresh} style={styles.refreshBtn} accessibilityLabel={t("refresh", lang)}>
              <Text style={styles.refreshIcon}>{refreshing ? "⋯" : "↻"}</Text>
            </Pressable>
            <Link href="/(tabs)/moment" asChild>
              <Pressable style={styles.refreshBtn} accessibilityLabel={t("recordPractice", lang)}>
                <Text style={styles.refreshIcon}>◉</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
      {!postedToday && hasRecent ? (
        <View style={styles.conditionalLock}>
          <Text style={styles.conditionalLockTitle}>{t("ritualRequiredToView", lang)}</Text>
          <Text style={styles.conditionalLockDesc}>{t("lockCtaPrimary", lang)}</Text>
          <Text style={styles.conditionalLockHint}>{t("lockCtaSecondary", lang)}</Text>
          <Link href="/(tabs)/moment" asChild>
            <Pressable style={styles.conditionalCta}>
              <Text style={styles.conditionalCtaText}>{t("recordPractice", lang)}</Text>
            </Pressable>
          </Link>
        </View>
      ) : byMedium ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.studioList, { flexGrow: 1, minHeight }]}
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
          {Object.entries(byMedium).map(([medium, moments]) => (
            <View key={medium} style={styles.studioSection}>
              <Text style={styles.studioTitle}>🎨 {medium}</Text>
              {moments.map((m, idx) => {
                const openProfile = () => {
                  if (!m.artistId) return;
                  const url = getArtistProfileUrl(m.artistId);
                  Alert.alert(
                    t("openWebProfileTitleOther", lang, { name: m.artistName }),
                    t("openWebProfileMessageOther", lang, { name: m.artistName }),
                    [
                      { text: t("openWebProfileCancel", lang), style: "cancel" as const },
                      { text: t("openWebProfileConfirm", lang), onPress: () => Linking.openURL(url) },
                    ]
                  );
                };
                const updateReaction = (momentId: string, newReactions: Record<string, number>, newMyReaction: ReactionType | null) => {
                  setRecentMoments((prev) =>
                    prev.map((x) =>
                      x.id === momentId
                        ? { ...x, reactions: newReactions, myReaction: newMyReaction }
                        : x
                    )
                  );
                  setReaction(momentId, newReactions, newMyReaction);
                };
                const cardStyle = [styles.card, idx < moments.length - 1 && { marginBottom: spacing.md }];
                return (
                  <View key={m.id} style={cardStyle}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.artistName}>{m.artistName}</Text>
                      <Text style={styles.date}>
                        {new Date(m.createdAt).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                    <View style={styles.noteBox} collapsable={false}>
                      <Text style={styles.note} numberOfLines={2} ellipsizeMode="tail" {...(Platform.OS === "android" && { includeFontPadding: false })}>
                        {m.note?.trim() || t("noArtistNote", lang)}
                      </Text>
                    </View>
                    {m.artistId ? (
                      <Pressable onPress={openProfile} accessibilityLabel={`${m.artistName} profile`}>
                        <Image source={{ uri: m.imageUri }} style={styles.image} />
                      </Pressable>
                    ) : (
                      <Image source={{ uri: m.imageUri }} style={styles.image} />
                    )}
                    <View style={styles.tags}>
                      <Text style={styles.tag}>{m.state}</Text>
                      <Text style={styles.tagDot}>·</Text>
                      <Text style={styles.tag}>{m.medium}</Text>
                    </View>
                    <ReactionBar
                      moment={{
                        ...m,
                        reactions: localReactions[m.id]?.reactions ?? m.reactions ?? {},
                        myReaction: localReactions[m.id]?.myReaction ?? m.myReaction ?? null,
                      }}
                      onReactionUpdate={updateReaction}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      ) : (
      <FlatList
        data={allMoments}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS !== "ios"}
        renderItem={({ item }) => {
          const local = localReactions[item.id];
          const mergedItem: ArtistMoment = local
            ? { ...item, reactions: local.reactions, myReaction: local.myReaction }
            : item;
          return (
            <MomentCard
              item={mergedItem}
              lang={lang}
              onReactionUpdate={handleReactionUpdate}
              onRefresh={onRefresh}
            />
          );
        }}
        contentContainerStyle={[
          styles.list,
          allMoments.length === 0 && styles.listEmpty,
          allMoments.length === 0 && { minHeight },
        ]}
        ItemSeparatorComponent={() =>
          allMoments.length > 0 ? <View style={styles.separator} /> : null
        }
        ListEmptyComponent={<EmptyFeed lang={lang} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  headerContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  refreshBtn: {
    padding: spacing.sm,
  },
  refreshIcon: {
    fontSize: 18,
    color: colors.textMuted,
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
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textMuted,
  },
  mediumChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  mediumChip: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.8,
    color: colors.textMuted,
    textTransform: "capitalize",
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.bgSecondary,
    borderRadius: 4,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 140,
  },
  listEmpty: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.title.fontSize,
    fontWeight: "300",
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    fontSize: typography.body.fontSize,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 1.6,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  artistName: {
    fontSize: typography.body.fontSize,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  date: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textMuted,
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: 4,
  },
  noteBox: {
    backgroundColor: colors.bgSecondary,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 4,
    marginBottom: spacing.sm,
    minHeight: 28,
  },
  note: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
    lineHeight: 18,
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tag: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.8,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  tagDot: {
    fontSize: 10,
    color: colors.textMuted,
  },
  separator: {
    height: spacing.lg,
  },
  conditionalLock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  conditionalLockTitle: {
    fontSize: typography.title.fontSize,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  conditionalLockDesc: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center",
    lineHeight: 1.5,
    fontWeight: "500",
  },
  conditionalLockHint: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    textAlign: "center",
    lineHeight: 1.5,
  },
  conditionalCta: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: colors.bgDark,
    borderRadius: 4,
  },
  conditionalCtaText: {
    color: colors.textOnDark,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  scroll: { flex: 1 },
  studioList: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 140,
  },
  studioSection: {
    marginBottom: spacing.xl,
  },
  studioTitle: {
    fontSize: typography.label.fontSize,
    fontWeight: "600",
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: "capitalize",
    marginBottom: spacing.md,
  },
});
