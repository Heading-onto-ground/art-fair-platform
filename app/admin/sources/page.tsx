"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

type SourceRow = {
  name: string;
  country: string;
  city: string;
  website?: string;
  sourcePortal?: string;
  sourceUrl?: string;
  bio?: string;
  externalEmail?: string;
};

export default function AdminSourcesPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;

  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const meData = await me.json();
        if (!meData?.authenticated) {
          setAuthenticated(false);
          router.replace("/admin/login");
          return;
        }
        setAuthenticated(true);
      } catch {
        setAuthenticated(false);
        router.replace("/admin/login");
      }
    })();
  }, [router]);

  async function loadSources() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/gallery-sources", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (!data?.ok) {
        setStatus(data?.error || tr("Failed to load", "불러오기 실패", "読み込み失敗", "Echec du chargement"));
        return;
      }
      const nextRows = Array.isArray(data.sources) ? data.sources : [];
      setRows(nextRows);
      setText(`${JSON.stringify(nextRows, null, 2)}\n`);
      setStatus(
        `${tr("Loaded", "불러옴", "読み込み", "Charge")} ${nextRows.length} ${tr("sources", "개 소스", "件ソース", "sources")} (${data.source})`
      );
    } catch {
      setStatus(tr("Server error", "서버 오류", "サーバーエラー", "Erreur serveur"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated) loadSources();
  }, [authenticated]);

  async function saveSources() {
    setSaving(true);
    setStatus(null);
    try {
      const parsed = JSON.parse(text);
      const res = await fetch("/api/admin/gallery-sources", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: parsed }),
      });
      const data = await res.json();
      if (!data?.ok) {
        setStatus(data?.error || tr("Save failed", "저장 실패", "保存失敗", "Echec de sauvegarde"));
        return;
      }
      setStatus(`${tr("Saved", "저장 완료", "保存完了", "Sauvegarde")} (${data.count})`);
      await loadSources();
    } catch {
      setStatus(tr("Invalid JSON format", "JSON 형식 오류", "JSON形式エラー", "Format JSON invalide"));
    } finally {
      setSaving(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setStatus(null);
    try {
      const res = await fetch("/api/cron/sync-gallery-directory?run=1", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data?.ok) {
        setStatus(data?.error || tr("Sync failed", "동기화 실패", "同期失敗", "Echec de synchro"));
        return;
      }
      setStatus(
        `${tr("Sync complete", "동기화 완료", "同期完了", "Synchronisation terminee")} - ${data.synced}/${data.rawInput}`
      );
    } catch {
      setStatus(tr("Server error", "서버 오류", "サーバーエラー", "Erreur serveur"));
    } finally {
      setSyncing(false);
    }
  }

  const byCountry = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const c = String(r.country || "").trim();
      if (!c) continue;
      map[c] = (map[c] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  if (authenticated === null) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FDFBF7" }}>
        <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>
          {tr("Authenticating...", "인증 중...", "認証中...", "Authentification...")}
        </p>
      </main>
    );
  }
  if (!authenticated) return null;

  const btn = (disabled: boolean): React.CSSProperties => ({
    padding: "10px 18px",
    border: "1px solid #1A1A1A",
    background: disabled ? "#E8E3DB" : "#1A1A1A",
    color: disabled ? "#8A8580" : "#FDFBF7",
    fontFamily: F,
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "56px 40px" }}>
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            {tr("Admin", "관리자", "管理者", "Admin")}
          </span>
          <h1 style={{ fontFamily: S, fontSize: 38, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
            {tr("Gallery Sources", "갤러리 소스", "ギャラリーソース", "Sources galerie")}
          </h1>
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 8 }}>
            {tr(
              "Edit source catalog in JSON and sync directory without code changes.",
              "코드 수정 없이 JSON으로 소스 목록을 편집하고 디렉토리를 동기화하세요.",
              "コード変更なしでJSONソースを編集し、ディレクトリを同期できます。",
              "Editez le catalogue JSON et synchronisez sans modifier le code."
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button onClick={loadSources} disabled={loading} style={btn(loading)}>
            {loading ? "..." : tr("Reload", "다시 불러오기", "再読み込み", "Recharger")}
          </button>
          <button onClick={saveSources} disabled={saving || loading} style={btn(saving || loading)}>
            {saving ? "..." : tr("Save JSON", "JSON 저장", "JSON保存", "Sauver JSON")}
          </button>
          <button onClick={syncNow} disabled={syncing || loading} style={btn(syncing || loading)}>
            {syncing ? "..." : tr("Sync now", "지금 동기화", "今すぐ同期", "Sync maintenant")}
          </button>
        </div>

        {status && (
          <div style={{ marginBottom: 18, border: "1px solid #E8E3DB", background: "#FAF8F4", padding: "10px 12px", fontFamily: F, fontSize: 12, color: "#4A4A4A" }}>
            {status}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 560,
              border: "1px solid #E8E3DB",
              background: "#FFFFFF",
              padding: 14,
              outline: "none",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: 12,
              lineHeight: 1.5,
              color: "#1A1A1A",
            }}
          />
          <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: 14 }}>
            <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8580", marginBottom: 10 }}>
              {tr("Overview", "개요", "概要", "Apercu")}
            </div>
            <div style={{ fontFamily: S, fontSize: 30, fontWeight: 300, color: "#1A1A1A" }}>{rows.length}</div>
            <div style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginBottom: 16 }}>
              {tr("total source rows", "전체 소스 행", "総ソース行", "lignes source")}
            </div>
            <div style={{ borderTop: "1px solid #EEEAE5", paddingTop: 10 }}>
              {byCountry.map(([country, count]) => (
                <div key={country} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontFamily: F, fontSize: 11, color: "#4A4A4A" }}>
                  <span>{country}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

