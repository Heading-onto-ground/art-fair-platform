/**
 * Day 1 verification screen.
 * Tests: api/auth/me, profile.artistId, credentials: "include"
 * Access: Profile tab → "Day 1 검증" (dev only)
 */

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import {
  runDay1Verification,
  fetchSelfExhibitions,
  type Day1VerificationResult,
  type SelfExhibitionsResult,
} from "@/services/api/authMeService";
import { API_BASE_URL } from "@/constants/api";
import { colors, spacing, typography } from "@/constants/theme";

type StepStatus = "pending" | "success" | "fail" | "skip";

function StatusBadge({
  status,
  label,
}: {
  status: StepStatus;
  label: string;
}) {
  const config = {
    pending: { bg: colors.border, text: "대기", color: colors.textMuted },
    success: { bg: colors.success, text: "성공", color: "#fff" },
    fail: { bg: colors.error, text: "실패", color: "#fff" },
    skip: { bg: colors.textLight, text: "스킵", color: colors.textPrimary },
  }[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
}

export default function VerifyDay1Screen() {
  const [result, setResult] = useState<Day1VerificationResult | null>(null);
  const [selfExhibitions, setSelfExhibitions] = useState<SelfExhibitionsResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runVerification = async () => {
    setLoading(true);
    setResult(null);
    setSelfExhibitions(null);
    try {
      // Step 1: auth/me
      const r = await runDay1Verification();
      setResult(r);

      // Step 2: self-exhibitions (credentials test)
      if (r.hasSession) {
        const se = await fetchSelfExhibitions();
        setSelfExhibitions(se);
      } else {
        setSelfExhibitions({
          status: 0,
          ok: false,
          count: 0,
          error: "세션 없음 — 스킵",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const authMeStatus: StepStatus = result
    ? result.hasSession
      ? result.hasArtistId
        ? "success"
        : "fail"
      : "fail"
    : "pending";

  const artistIdStatus: StepStatus = result
    ? result.hasArtistId
      ? "success"
      : "fail"
    : "pending";

  const credentialsStatus: StepStatus =
    selfExhibitions === null
      ? "pending"
      : !result?.hasSession
        ? "skip"
        : selfExhibitions.ok
          ? "success"
          : "fail";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← 뒤로</Text>
      </Pressable>

      <Text style={styles.title}>Day 1 검증</Text>
      <Text style={styles.subtitle}>
        api/auth/me · profile.artistId · credentials 확인
      </Text>

      {/* 실행 방법 */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>실행 방법</Text>
        <Text style={styles.instructionsText}>
          1. 로그아웃 후 다시 로그인 (실제 API 사용 시)
          {"\n"}2. 베타 모드 OFF: EXPO_PUBLIC_BETA=0 또는 .env 수정
          {"\n"}3. "검증 실행" 버튼 탭
          {"\n"}4. Metro/Expo 콘솔에서 [Day1] 로그 확인
        </Text>
        <Text style={styles.instructionsNote}>
          API: {API_BASE_URL}{"\n"}
          credentials: "include" 적용됨{"\n"}
          상세: docs/DAY1_VERIFY_RUN.md
        </Text>
      </View>

      <Pressable
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={runVerification}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnDark} size="small" />
        ) : (
          <Text style={styles.btnText}>검증 실행</Text>
        )}
      </Pressable>

      {/* Step별 결과 */}
      {result && (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>검증 결과</Text>

          {/* Step 1: auth/me */}
          <View style={styles.step}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepLabel}>1. GET /api/auth/me?lite=1</Text>
              <StatusBadge status={authMeStatus} label="" />
            </View>
            <Text style={styles.stepDetail}>
              HTTP {result.authMeStatus ?? "—"} · credentials: "include"
            </Text>
            <Text style={styles.stepDetail}>
              session: {result.hasSession ? "있음" : "없음"} · profile: {result.authMe.profile ? "있음" : "없음"}
            </Text>
          </View>

          {/* Step 2: artistId */}
          <View style={styles.step}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepLabel}>2. profile.artistId</Text>
              <StatusBadge status={artistIdStatus} label="" />
            </View>
            <Text style={styles.stepDetail}>
              {result.hasArtistId
                ? `artistId: ${(result.authMe.profile as { artistId: string })?.artistId ?? "—"}`
                : "없음 (또는 빈 문자열)"}
            </Text>
          </View>

          {/* Step 3: self-exhibitions */}
          <View style={styles.step}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepLabel}>3. GET /api/artist/self-exhibitions</Text>
              <StatusBadge status={credentialsStatus} label="" />
            </View>
            {selfExhibitions !== null && (
              <>
                <Text style={styles.stepDetail}>
                  HTTP {selfExhibitions.status} · credentials: "include"
                </Text>
                <Text style={styles.stepDetail}>
                  {selfExhibitions.ok
                    ? `전시 ${selfExhibitions.count}개 (쿠키 전달 OK)`
                    : `실패: ${selfExhibitions.error ?? "인증 필요"}`}
                </Text>
              </>
            )}
          </View>

          {/* 전체 요약 */}
          {(() => {
            const credentialsOk = selfExhibitions === null ? false : selfExhibitions.ok || !result.hasSession;
            const allPass = result.ok && credentialsOk;
            return (
              <View style={[styles.summaryBox, allPass ? styles.summaryOk : styles.summaryFail]}>
                <Text style={styles.summaryText}>
                  {allPass
                    ? "✅ Day 1 검증 통과"
                    : "❌ Day 1 검증 실패 — docs/DAY1_FALLBACK_STRATEGY.md 참고"}
                </Text>
              </View>
            );
          })()}

          {/* Raw 응답 */}
          <Text style={styles.section}>auth/me raw 응답</Text>
          <Text style={styles.json} selectable>
            {JSON.stringify(
              {
                session: result.authMe.session,
                profile: result.authMe.profile
                  ? {
                      artistId: (result.authMe.profile as { artistId?: string }).artistId,
                      userId: result.authMe.profile.userId,
                      name: result.authMe.profile.name,
                      role: result.authMe.profile.role,
                    }
                  : null,
                error: result.authMe.error,
              },
              null,
              2
            )}
          </Text>

          {selfExhibitions?.raw !== undefined && (
            <>
              <Text style={styles.section}>self-exhibitions raw 응답</Text>
              <Text style={styles.json} selectable>
                {JSON.stringify(selfExhibitions.raw, null, 2)}
              </Text>
            </>
          )}
        </View>
      )}

      <Text style={styles.footer}>
        디버깅: Metro/Expo 콘솔에서 [Day1] 로그 확인
      </Text>
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
  back: {
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: 14,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.titleLarge.fontSize,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  instructions: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  instructionsTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 1.6,
  },
  instructionsNote: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontFamily: "monospace",
  },
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.bgDark,
    borderRadius: 4,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: colors.textOnDark,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  result: {
    padding: spacing.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.xl,
  },
  resultTitle: {
    fontSize: typography.label.fontSize,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  step: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
    flex: 1,
  },
  stepDetail: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: "monospace",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  summaryBox: {
    padding: spacing.md,
    borderRadius: 4,
    marginBottom: spacing.lg,
  },
  summaryOk: {
    backgroundColor: "rgba(90, 122, 90, 0.15)",
    borderWidth: 1,
    borderColor: colors.success,
  },
  summaryFail: {
    backgroundColor: "rgba(139, 74, 74, 0.08)",
    borderWidth: 1,
    borderColor: colors.error,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  section: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  json: {
    fontSize: 10,
    fontFamily: "monospace",
    color: colors.textSecondary,
    lineHeight: 1.5,
  },
  footer: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
});
