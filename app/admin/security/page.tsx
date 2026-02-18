"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { CardSkeleton } from "@/app/components/Skeleton";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

type Status = {
  rlsDisabledTables: number;
  rlsEnabledNoPolicyTables: number;
  apiTableGrants: number;
  schemaUsageGrants: number;
  functionExecuteGrants: number;
};

export default function AdminSecurityPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;

  async function loadStatus() {
    const res = await fetch("/api/admin/security-fix", {
      cache: "no-store",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      throw new Error(
        data?.error ||
          tr(
            "Failed to load security status",
            "보안 상태를 불러오지 못했습니다",
            "セキュリティ状態の読み込みに失敗しました",
            "Echec du chargement de l'etat securite"
          )
      );
    }
    setStatus(data.status as Status);
  }

  useEffect(() => {
    (async () => {
      try {
        const authRes = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const authData = await authRes.json().catch(() => null);
        if (!authData?.authenticated) {
          setAuthenticated(false);
          router.replace("/admin/login");
          return;
        }
        setAuthenticated(true);
        await loadStatus();
      } catch (e: any) {
        setErr(
          e?.message ||
            tr(
              "Failed to load",
              "로딩에 실패했습니다",
              "読み込みに失敗しました",
              "Echec du chargement"
            )
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function runFix() {
    setRunning(true);
    setErr(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/security-fix", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            tr(
              "Failed to apply security fix",
              "보안 수정을 적용하지 못했습니다",
              "セキュリティ修正を適用できませんでした",
              "Echec de l'application du correctif securite"
            )
        );
      }
      setMessage(
        tr(
          `Applied. RLS disabled: ${data.before.rlsDisabledTables} -> ${data.after.rlsDisabledTables}, no-policy tables: ${data.before.rlsEnabledNoPolicyTables} -> ${data.after.rlsEnabledNoPolicyTables}, API table grants: ${data.before.apiTableGrants} -> ${data.after.apiTableGrants}, schema usage grants: ${data.before.schemaUsageGrants} -> ${data.after.schemaUsageGrants}, function execute grants: ${data.before.functionExecuteGrants} -> ${data.after.functionExecuteGrants}`,
          `적용 완료. RLS 비활성 테이블: ${data.before.rlsDisabledTables} -> ${data.after.rlsDisabledTables}, 정책 없는 테이블: ${data.before.rlsEnabledNoPolicyTables} -> ${data.after.rlsEnabledNoPolicyTables}, API 테이블 권한: ${data.before.apiTableGrants} -> ${data.after.apiTableGrants}, 스키마 사용 권한: ${data.before.schemaUsageGrants} -> ${data.after.schemaUsageGrants}, 함수 실행 권한: ${data.before.functionExecuteGrants} -> ${data.after.functionExecuteGrants}`,
          `適用完了。RLS無効テーブル: ${data.before.rlsDisabledTables} -> ${data.after.rlsDisabledTables}、ポリシーなしテーブル: ${data.before.rlsEnabledNoPolicyTables} -> ${data.after.rlsEnabledNoPolicyTables}、APIテーブル権限: ${data.before.apiTableGrants} -> ${data.after.apiTableGrants}、スキーマ使用権限: ${data.before.schemaUsageGrants} -> ${data.after.schemaUsageGrants}、関数実行権限: ${data.before.functionExecuteGrants} -> ${data.after.functionExecuteGrants}`,
          `Applique. Tables RLS desactivees : ${data.before.rlsDisabledTables} -> ${data.after.rlsDisabledTables}, tables sans politique : ${data.before.rlsEnabledNoPolicyTables} -> ${data.after.rlsEnabledNoPolicyTables}, droits table API : ${data.before.apiTableGrants} -> ${data.after.apiTableGrants}, droits d'usage schema : ${data.before.schemaUsageGrants} -> ${data.after.schemaUsageGrants}, droits d'execution fonction : ${data.before.functionExecuteGrants} -> ${data.after.functionExecuteGrants}`
        )
      );
      await loadStatus();
    } catch (e: any) {
      setErr(
        e?.message ||
          tr(
            "Failed to apply security fix",
            "보안 수정을 적용하지 못했습니다",
            "セキュリティ修正を適用できませんでした",
            "Echec de l'application du correctif securite"
          )
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "40px" }}>
        <div style={{ marginBottom: 22 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8B7355",
            }}
          >
            {tr("Admin", "관리자", "管理者", "Admin")}
          </span>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
            {tr("Security Hardening", "보안 강화", "セキュリティ強化", "Renforcement de securite")}
          </h1>
        </div>

        {authenticated === null || loading ? (
          <CardSkeleton count={3} />
        ) : (
          <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: "22px 24px" }}>
            <p style={{ fontFamily: F, fontSize: 13, color: "#4A4A4A", lineHeight: 1.7, marginTop: 0 }}>
              {tr(
                "Enable RLS on all public tables and revoke broad table grants from API roles (`anon`, `authenticated`). This addresses the common Supabase Security Advisor warnings shown in your screenshot.",
                "public 테이블 전체에 RLS를 활성화하고 API 역할(`anon`, `authenticated`)의 광범위한 테이블 권한을 회수합니다. 스크린샷에 보인 Supabase Security Advisor 경고를 해결하는 데 사용됩니다.",
                "publicテーブル全体でRLSを有効化し、APIロール（`anon`, `authenticated`）の広範なテーブル権限を取り消します。スクリーンショットのSupabase Security Advisor警告を解消するための機能です。",
                "Activez le RLS sur toutes les tables public et revoquez les droits de table trop larges pour les roles API (`anon`, `authenticated`). Cela corrige les alertes Supabase Security Advisor vues dans votre capture."
              )}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginTop: 14,
                marginBottom: 16,
              }}
            >
              <Metric label={tr("RLS Disabled Tables", "RLS 비활성 테이블", "RLS無効テーブル", "Tables RLS desactivees")} value={status?.rlsDisabledTables ?? 0} />
              <Metric
                label={tr("RLS Enabled (No Policy)", "RLS 활성(정책 없음)", "RLS有効（ポリシーなし）", "RLS actif (sans politique)")}
                value={status?.rlsEnabledNoPolicyTables ?? 0}
              />
              <Metric label={tr("API Table Grants (anon/authenticated)", "API 테이블 권한(anon/authenticated)", "APIテーブル権限（anon/authenticated）", "Droits table API (anon/authenticated)")} value={status?.apiTableGrants ?? 0} />
              <Metric label={tr("Schema Usage Grants", "스키마 사용 권한", "スキーマ使用権限", "Droits d'usage schema")} value={status?.schemaUsageGrants ?? 0} />
              <Metric label={tr("Function Execute Grants", "함수 실행 권한", "関数実行権限", "Droits d'execution fonction")} value={status?.functionExecuteGrants ?? 0} />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={runFix}
                disabled={running}
                style={{
                  padding: "11px 18px",
                  border: "1px solid #1A1A1A",
                  background: "#1A1A1A",
                  color: "#FFFFFF",
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: running ? "wait" : "pointer",
                  opacity: running ? 0.7 : 1,
                }}
              >
                {running
                  ? tr("Applying...", "적용 중...", "適用中...", "Application...")
                  : tr("Apply Security Fix", "보안 수정 적용", "セキュリティ修正を適用", "Appliquer le correctif securite")}
              </button>

              <button
                onClick={loadStatus}
                disabled={running}
                style={{
                  padding: "11px 18px",
                  border: "1px solid #E8E3DB",
                  background: "transparent",
                  color: "#4A4A4A",
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: running ? "not-allowed" : "pointer",
                }}
              >
                {tr("Refresh Status", "상태 새로고침", "状態を更新", "Actualiser l'etat")}
              </button>
            </div>

            {err ? (
              <div
                style={{
                  marginTop: 14,
                  border: "1px solid #E7C7C7",
                  background: "#FFF7F7",
                  color: "#8B3A3A",
                  fontFamily: F,
                  fontSize: 12,
                  padding: "10px 12px",
                }}
              >
                {err}
              </div>
            ) : null}

            {message ? (
              <div
                style={{
                  marginTop: 14,
                  border: "1px solid #D5E6CF",
                  background: "#F7FCF5",
                  color: "#48633E",
                  fontFamily: F,
                  fontSize: 12,
                  padding: "10px 12px",
                }}
              >
                {message}
              </div>
            ) : null}
          </div>
        )}
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid #E8E3DB", background: "#FDFBF7", padding: "12px 14px" }}>
      <div
        style={{
          fontFamily: F,
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#8A8580",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: S, fontSize: 28, color: "#1A1A1A", fontWeight: 300 }}>{value}</div>
    </div>
  );
}

