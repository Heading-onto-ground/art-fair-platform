"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

type ExternalApp = {
  id: string;
  artistName: string;
  artistEmail: string;
  artistCountry: string;
  artistCity: string;
  artistPortfolioUrl?: string;
  message?: string;
  galleryName: string;
  galleryEmail: string;
  galleryCity: string;
  galleryCountry: string;
  galleryWebsite: string;
  openCallTheme: string;
  openCallDeadline: string;
  outreachSent?: boolean;
  outreachSentAt?: number;
  createdAt: number;
};

type ExternalStats = {
  total: number;
  pending: number;
  sent: number;
};

type OutreachRecord = {
  id: string;
  to: string;
  galleryName: string;
  country: string;
  language: string;
  status: string;
  sentAt: number;
};

type OutreachStats = {
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  signedUp: number;
  failed: number;
  conversionRate: string;
};

type EmailCountryCount = {
  country: string;
  count: number;
};

type GalleryEmailStats = {
  total: number;
  active: number;
  blocked: number;
  countries: EmailCountryCount[];
};

export default function OutreachPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [syncingEmails, setSyncingEmails] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("ALL");
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);
  const [remindResult, setRemindResult] = useState<string | null>(null);

  // External applications
  const [extApps, setExtApps] = useState<ExternalApp[]>([]);
  const [extStats, setExtStats] = useState<ExternalStats | null>(null);
  const [sendingOutreach, setSendingOutreach] = useState<string | null>(null);
  const [outreachResults, setOutreachResults] = useState<Record<string, string>>({});
  const [emailStats, setEmailStats] = useState<GalleryEmailStats | null>(null);

  // Single send form
  const [singleForm, setSingleForm] = useState({ to: "", galleryName: "", country: "한국", language: "en" });
  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;

  // Check admin auth
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        if (data.authenticated) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
          router.replace("/admin/login");
        }
      } catch {
        setAuthenticated(false);
        router.replace("/admin/login");
      }
    })();
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const [outreachRes, extRes, emailRes] = await Promise.all([
        fetch("/api/outreach", { cache: "no-store" }),
        fetch("/api/admin/external-apps", { cache: "no-store" }),
        fetch("/api/admin/gallery-emails", { cache: "no-store", credentials: "include" }),
      ]);
      const outreachData = await outreachRes.json();
      const extData = await extRes.json();
      const emailData = await emailRes.json();
      setStats(outreachData.stats || null);
      setRecords(outreachData.records || []);
      setExtApps(extData.applications || []);
      setExtStats(extData.stats || null);
      setEmailStats(emailData?.stats || null);
    } catch { }
    finally { setLoading(false); }
  }

  useEffect(() => { if (authenticated) loadData(); }, [authenticated]);

  async function sendOutreachToGallery(applicationId: string) {
    setSendingOutreach(applicationId);
    try {
      const res = await fetch("/api/admin/external-apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const data = await res.json();
      if (data.ok) {
        setOutreachResults((prev) => ({ ...prev, [applicationId]: `${tr("Sent to", "발송 완료:", "送信先:", "Envoyé à")} ${data.email?.to}` }));
        loadData();
      } else {
        setOutreachResults((prev) => ({ ...prev, [applicationId]: `${tr("Failed", "실패", "失敗", "Échec")}: ${data.error}` }));
      }
    } catch {
      setOutreachResults((prev) => ({ ...prev, [applicationId]: tr("Server error", "서버 오류", "サーバーエラー", "Erreur serveur") }));
    }
    setSendingOutreach(null);
  }

  async function sendSingle() {
    if (!singleForm.to || !singleForm.galleryName) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_single", ...singleForm }),
      });
      const data = await res.json();
      setSendResult(data.ok ? tr("Email sent successfully", "이메일 발송 완료", "メール送信完了", "Email envoyé") : `${tr("Failed", "실패", "失敗", "Échec")}: ${data.error}`);
      loadData();
    } catch { setSendResult(tr("Server error", "서버 오류", "サーバーエラー", "Erreur serveur")); }
    finally { setSending(false); }
  }

  async function sendBatch(country: string) {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/gallery-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "send_batch",
          country,
          limit: 500,
        }),
      });
      const data = await res.json();
      if (!data?.ok) {
        setSendResult(`${tr("Failed", "실패", "失敗", "Échec")}: ${data?.error || "unknown error"}`);
      } else {
        setSendResult(
          `${tr("Batch complete", "배치 완료", "一括完了", "Lot terminé")}: ${data.sent} ${tr("sent", "발송", "送信", "envoyé")}, ${data.failed} ${tr("failed", "실패", "失敗", "échoué")}`
        );
      }
      loadData();
    } catch { setSendResult(tr("Server error", "서버 오류", "サーバーエラー", "Erreur serveur")); }
    finally { setSending(false); }
  }

  async function syncEmailDirectory() {
    setSyncingEmails(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/gallery-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "sync" }),
      });
      const data = await res.json();
      if (!data?.ok) {
        setSendResult(`${tr("Sync failed", "동기화 실패", "同期失敗", "Echec synchro")}: ${data?.error || "unknown error"}`);
      } else {
        setSendResult(
          `${tr("Email directory synced", "이메일 디렉토리 동기화 완료", "メールディレクトリ同期完了", "Synchronisation email terminee")}: ${data.collected}`
        );
      }
      loadData();
    } catch {
      setSendResult(tr("Server error", "서버 오류", "サーバーエラー", "Erreur serveur"));
    } finally {
      setSyncingEmails(false);
    }
  }

  async function runCrawler() {
    setCrawling(true);
    setCrawlResult(null);
    try {
      const res = await fetch("/api/cron/crawl-opencalls", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data?.error) {
        const detail = data?.error || `HTTP ${res.status}`;
        setCrawlResult(
          `${tr("Crawler failed", "크롤러 실패", "クローラー失敗", "Échec du crawler")}: ${detail}`
        );
        return;
      }
      const importedCount = Array.isArray(data?.imported) ? data.imported.length : null;
      setCrawlResult(
        importedCount !== null
          ? `${data?.message || tr("Crawler completed", "크롤러 완료", "クローラー完了", "Crawler terminé")} (${tr("imported", "신규 반영", "新規反映", "importés")}: ${importedCount})`
          : data?.message || tr("Crawler completed", "크롤러 완료", "クローラー完了", "Crawler terminé")
      );
      loadData();
    } catch {
      setCrawlResult(tr("Crawler failed", "크롤러 실패", "クローラー失敗", "Échec du crawler"));
    }
    finally { setCrawling(false); }
  }

  async function triggerDeadlineReminders() {
    setReminding(true);
    setRemindResult(null);
    try {
      const res = await fetch("/api/cron/deadline-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withinDays: 30 }),
      });
      const data = await res.json();
      setRemindResult(data.message || tr("Reminders created", "리마인더 생성 완료", "リマインダー作成完了", "Rappels créés"));
    } catch { setRemindResult(tr("Failed", "실패", "失敗", "Échec")); }
    finally { setReminding(false); }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "14px 16px", background: "#FFFFFF", border: "1px solid #E8E3DB", color: "#1A1A1A", fontFamily: F, fontSize: 13, fontWeight: 400, outline: "none" };
  const btn = (disabled: boolean): React.CSSProperties => ({ padding: "12px 24px", border: "none", background: disabled ? "#E8E3DB" : "#1A1A1A", color: disabled ? "#8A8580" : "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer" });

  const countries = ["ALL", ...(emailStats?.countries || []).map((c) => c.country).filter(Boolean)];

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

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "56px 40px" }}>
        <div style={{ marginBottom: 48 }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>{tr("Admin", "관리자", "管理者", "Admin")}</span>
          <h1 style={{ fontFamily: S, fontSize: 42, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>{tr("Growth Automation", "성장 자동화", "成長自動化", "Automatisation Growth")}</h1>
          <p style={{ fontFamily: F, fontSize: 12, fontWeight: 300, color: "#8A8580", marginTop: 8 }}>
            {tr("Manage outreach, crawlers, and automated notifications", "아웃리치, 크롤러, 자동 알림을 관리하세요", "アウトリーチ・クローラー・自動通知を管理", "Gérez outreach, crawler et notifications automatiques")}
          </p>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <Section number="01" title={tr("Outreach Stats", "아웃리치 통계", "アウトリーチ統計", "Statistiques outreach")}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#E8E3DB" }}>
              <Stat value={stats.total} label={tr("Total Sent", "총 발송", "総送信", "Total envoyé")} />
              <Stat value={stats.sent} label={tr("Delivered", "도달", "配信済み", "Délivré")} />
              <Stat value={stats.signedUp} label={tr("Signed Up", "가입", "登録", "Inscrits")} />
              <Stat value={`${stats.conversionRate}%`} label={tr("Conversion", "전환율", "コンバージョン", "Conversion")} />
            </div>
          </Section>
        )}

        {/* External Applications — Artist interest in crawled open calls */}
        <Section number="02" title={tr("External Applications", "외부 지원서", "外部応募", "Candidatures externes")}>
          {extStats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "#E8E3DB", marginBottom: 24 }}>
              <Stat value={extStats.total} label={tr("Total", "전체", "合計", "Total")} />
              <Stat value={extStats.pending} label={tr("Pending Outreach", "대기 중", "未送信", "Outreach en attente")} />
              <Stat value={extStats.sent} label={tr("Outreach Sent", "발송 완료", "送信済み", "Outreach envoyé")} />
            </div>
          )}
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 20 }}>
            {tr("Artists interested in external open calls. Send outreach emails to invite galleries to ROB.", "외부 오픈콜 지원 작가 목록입니다. 갤러리에 ROB 초대 메일을 보낼 수 있습니다.", "外部オープンコール応募アーティスト一覧です。ROB招待メールを送信できます。", "Liste des artistes intéressés par des appels externes. Envoyez des emails d'invitation ROB.")}
          </p>

          {extApps.length === 0 ? (
            <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2", textAlign: "center", padding: 24 }}>
              {tr("No external applications yet. Artists will appear here when they apply to crawled open calls.", "아직 외부 지원서가 없습니다. 크롤링된 오픈콜에 지원하면 여기에 표시됩니다.", "外部応募はまだありません。クロールしたオープンコールに応募すると表示されます。", "Aucune candidature externe pour le moment. Elles apparaîtront ici après candidature.")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {extApps.map((app) => (
                <div key={app.id} style={{
                  border: app.outreachSent ? "1px solid #E8E3DB" : "1px solid #8B7355",
                  padding: 24,
                  background: app.outreachSent ? "#FAF8F4" : "#FFFFFF",
                }}>
                  {/* Header — Gallery info */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: app.outreachSent ? "#5A7A5A" : "#8B7355", marginBottom: 6 }}>
                        {app.outreachSent
                          ? tr("OUTREACH SENT", "아웃리치 발송 완료", "送信済み", "OUTREACH ENVOYÉ")
                          : tr("PENDING OUTREACH", "아웃리치 대기", "送信待ち", "OUTREACH EN ATTENTE")}
                      </div>
                      <div style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A" }}>
                        {app.galleryName}
                      </div>
                      <div style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginTop: 4 }}>
                        {app.galleryCity}, {app.galleryCountry} · {app.galleryEmail}
                      </div>
                    </div>
                    <span style={{
                      fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase",
                      padding: "4px 10px", border: "1px solid #E8E3DB", color: "#8A8580",
                    }}>
                      D-{Math.max(0, Math.ceil((new Date(app.openCallDeadline).getTime() - Date.now()) / 86400000))}
                    </span>
                  </div>

                  {/* Open call theme */}
                  <div style={{ fontFamily: F, fontSize: 12, color: "#4A4A4A", marginBottom: 16, padding: "10px 14px", background: "#FAF8F4", borderLeft: "3px solid #E8E3DB" }}>
                    {tr("Open Call", "오픈콜", "オープンコール", "Open Call")}: <strong>{app.openCallTheme}</strong>
                    <br />{tr("Deadline", "마감일", "締切", "Date limite")}: {app.openCallDeadline}
                  </div>

                  {/* Artist info */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", background: "#F0EBE3",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: F, fontSize: 12, fontWeight: 600, color: "#8B7355",
                    }}>
                      {app.artistName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>
                        {app.artistName}
                      </div>
                      <div style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>
                        {app.artistCity}, {app.artistCountry} · {app.artistEmail}
                      </div>
                    </div>
                    {app.artistPortfolioUrl && (
                      <a href={app.artistPortfolioUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: F, fontSize: 10, color: "#8B7355", textDecoration: "underline", marginLeft: "auto" }}>
                        {tr("View Portfolio", "포트폴리오 보기", "ポートフォリオを見る", "Voir le portfolio")}
                      </a>
                    )}
                  </div>

                  {app.message && (
                    <div style={{ fontFamily: F, fontSize: 12, color: "#4A4A4A", fontStyle: "italic", marginBottom: 16, padding: "8px 14px", borderLeft: "2px solid #F0EBE3" }}>
                      "{app.message}"
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      onClick={() => sendOutreachToGallery(app.id)}
                      disabled={sendingOutreach === app.id}
                      style={{
                        padding: "10px 20px",
                        border: app.outreachSent ? "1px solid #8B7355" : "1px solid #1A1A1A",
                        background: app.outreachSent ? "#FFFFFF" : "#1A1A1A",
                        color: app.outreachSent ? "#8B7355" : "#FDFBF7",
                        fontFamily: F,
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        cursor: sendingOutreach === app.id ? "wait" : "pointer",
                      }}
                    >
                      {sendingOutreach === app.id
                        ? tr("Sending...", "발송 중...", "送信中...", "Envoi...")
                        : app.outreachSent
                          ? tr("Resend outreach", "아웃리치 재발송", "再送信", "Renvoyer outreach")
                          : `${tr("Send outreach to", "아웃리치 보내기:", "送信先:", "Envoyer à")} ${app.galleryName}`}
                    </button>
                    {app.outreachSent ? (
                      <span style={{ fontFamily: F, fontSize: 11, color: "#5A7A5A" }}>
                        {tr("Sent", "발송됨", "送信済み", "Envoyé")} {app.outreachSentAt ? new Date(app.outreachSentAt).toLocaleString() : ""}
                      </span>
                    ) : null}
                  </div>

                  {outreachResults[app.id] && (
                    <p style={{
                      marginTop: 8, fontFamily: F, fontSize: 11,
                      color: outreachResults[app.id].startsWith("Sent") ? "#5A7A5A" : "#8B4A4A",
                    }}>
                      {outreachResults[app.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Gallery Outreach */}
        <Section number="03" title={tr("Gallery Outreach", "갤러리 아웃리치", "ギャラリーアウトリーチ", "Outreach galerie")}>
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 20 }}>
            {tr("Send invitation emails to galleries from the email directory DB.", "이메일 디렉토리 DB에 저장된 갤러리로 초대 메일을 보냅니다.", "メールディレクトリDBに保存されたギャラリーへ招待メールを送信します。", "Envoyez des invitations depuis la base d'emails des galeries.")}{" "}
            {(emailStats?.active || 0)} {tr("active emails.", "개 활성 이메일.", "件の有効メール。", "emails actifs.")}
          </p>

          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <button onClick={syncEmailDirectory} disabled={syncingEmails} style={btn(syncingEmails)}>
              {syncingEmails
                ? tr("Syncing...", "동기화 중...", "同期中...", "Synchronisation...")
                : tr("Sync Email Directory", "이메일 디렉토리 동기화", "メールディレクトリ同期", "Synchroniser la base email")}
            </button>
          </div>

          {/* Country filter + batch send */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {countries.map((c) => {
              const count =
                c === "ALL"
                  ? emailStats?.active || 0
                  : emailStats?.countries?.find((x) => x.country === c)?.count || 0;
              return (
                <button key={c} onClick={() => setSelectedCountry(c)}
                  style={{ padding: "8px 16px", border: c === selectedCountry ? "1px solid #1A1A1A" : "1px solid #E8E3DB", background: c === selectedCountry ? "#1A1A1A" : "transparent", color: c === selectedCountry ? "#FDFBF7" : "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", cursor: "pointer" }}>
                  {c} ({count})
                </button>
              );
            })}
          </div>

          <button onClick={() => sendBatch(selectedCountry)} disabled={sending} style={btn(sending)}>
            {sending
              ? tr("Sending...", "발송 중...", "送信中...", "Envoi...")
              : `${tr("Send to", "다음으로 발송:", "送信先:", "Envoyer à")} ${selectedCountry === "ALL" ? tr("all", "전체", "すべて", "tous") : selectedCountry} ${tr("galleries", "갤러리", "ギャラリー", "galeries")}`}
          </button>

          {/* Single send */}
          <div style={{ marginTop: 28, padding: 24, border: "1px solid #E8E3DB", background: "#FAF8F4" }}>
            <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355", marginBottom: 16 }}>
              {tr("Send to specific gallery", "특정 갤러리에 발송", "特定ギャラリーへ送信", "Envoyer à une galerie spécifique")}
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input value={singleForm.galleryName} onChange={(e) => setSingleForm((p) => ({ ...p, galleryName: e.target.value }))} placeholder={tr("Gallery name", "갤러리 이름", "ギャラリー名", "Nom de galerie")} style={inp} />
                <input value={singleForm.to} onChange={(e) => setSingleForm((p) => ({ ...p, to: e.target.value }))} placeholder={tr("Email", "이메일", "メール", "Email")} style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <select value={singleForm.country} onChange={(e) => setSingleForm((p) => ({ ...p, country: e.target.value }))} style={inp}>
                  <option value="한국">Korea</option><option value="일본">Japan</option><option value="영국">UK</option><option value="프랑스">France</option>
                  <option value="미국">USA</option><option value="독일">Germany</option><option value="이탈리아">Italy</option><option value="스위스">Switzerland</option>
                </select>
                <select value={singleForm.language} onChange={(e) => setSingleForm((p) => ({ ...p, language: e.target.value }))} style={inp}>
                  <option value="en">{tr("English", "영어", "英語", "Anglais")}</option><option value="ko">{tr("Korean", "한국어", "韓国語", "Coréen")}</option><option value="ja">{tr("Japanese", "일본어", "日本語", "Japonais")}</option>
                  <option value="fr">{tr("French", "프랑스어", "フランス語", "Français")}</option><option value="de">{tr("German", "독일어", "ドイツ語", "Allemand")}</option>
                </select>
              </div>
              <button onClick={sendSingle} disabled={sending} style={btn(sending)}>
                {sending ? "..." : tr("Send invitation", "초대 메일 보내기", "招待メール送信", "Envoyer invitation")}
              </button>
            </div>
          </div>

          {sendResult && (
            <p
              style={{
                marginTop: 16,
                fontFamily: F,
                fontSize: 12,
                color:
                  sendResult.includes("success") ||
                  sendResult.includes("complete") ||
                  sendResult.includes("완료") ||
                  sendResult.includes("Envoy") ||
                  sendResult.includes("送信")
                    ? "#5A7A5A"
                    : "#8B4A4A",
              }}
            >
              {sendResult}
            </p>
          )}
        </Section>

        {/* Open Call Crawler */}
        <Section number="04" title={tr("Open Call Crawler", "오픈콜 크롤러", "オープンコールクローラー", "Crawler Open Call")}>
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 16 }}>
            {tr("Automatically discover and import open calls from external sources.", "외부 소스에서 오픈콜을 자동 수집/등록합니다.", "外部ソースからオープンコールを自動収集します。", "Découvre et importe automatiquement des open calls externes.")}
          </p>
          <div style={{ display: "grid", gap: 1, background: "#E8E3DB", marginBottom: 20 }}>
            {[
              { name: "e-flux", url: "e-flux.com", type: "RSS" },
              { name: "artrabbit", url: "artrabbit.com", type: tr("Scrape", "스크랩", "スクレイプ", "Scraping") },
              { name: "transartists", url: "transartists.org", type: tr("Scrape", "스크랩", "スクレイプ", "Scraping") },
              { name: "arthub-kr", url: "arthub.co.kr", type: tr("Scrape", "스크랩", "スクレイプ", "Scraping") },
              { name: "korean-art-blog", url: "blog.naver.com", type: tr("Scrape", "스크랩", "スクレイプ", "Scraping") },
            ].map((s) => (
              <div key={s.name} style={{ padding: "16px 20px", background: "#FFFFFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontFamily: F, fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{s.name}</span>
                  <span style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", marginLeft: 12 }}>{s.url}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.08em", color: "#5A7A5A", textTransform: "uppercase" }}>{s.type}</span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5A7A5A" }} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={runCrawler} disabled={crawling} style={btn(crawling)}>
            {crawling ? tr("Crawling...", "수집 중...", "クロール中...", "Crawling...") : tr("Run crawler now", "지금 크롤러 실행", "今すぐ実行", "Lancer le crawler")}
          </button>
          {crawlResult && <p style={{ marginTop: 12, fontFamily: F, fontSize: 12, color: "#5A7A5A" }}>{crawlResult}</p>}
        </Section>

        {/* Deadline Reminders */}
        <Section number="05" title={tr("Deadline Reminders", "마감 리마인더", "締切リマインダー", "Rappels de deadline")}>
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 16 }}>
            {tr("Generate deadline reminder notifications for approaching open calls.", "마감이 임박한 오픈콜 알림을 생성합니다.", "締切が近いオープンコールの通知を作成します。", "Génère des rappels pour les open calls proches de la date limite.")}
          </p>
          <button onClick={triggerDeadlineReminders} disabled={reminding} style={btn(reminding)}>
            {reminding ? tr("Generating...", "생성 중...", "生成中...", "Génération...") : tr("Send deadline reminders", "마감 리마인더 발송", "締切リマインダー送信", "Envoyer les rappels")}
          </button>
          {remindResult && <p style={{ marginTop: 12, fontFamily: F, fontSize: 12, color: "#5A7A5A" }}>{remindResult}</p>}
        </Section>

        {/* Recent Outreach Records */}
        <Section number="06" title={tr("Recent Outreach", "최근 아웃리치", "最近のアウトリーチ", "Outreach récents")}>
          {records.length === 0 ? (
            <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2", textAlign: "center", padding: 24 }}>
              {tr("No outreach records yet", "아웃리치 기록이 없습니다", "アウトリーチ履歴なし", "Aucun historique outreach")}
            </p>
          ) : (
            <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
              {records.slice(0, 20).map((r) => (
                <div key={r.id} style={{ padding: "16px 20px", background: "#FFFFFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontFamily: F, fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{r.galleryName}</span>
                    <span style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", marginLeft: 12 }}>{r.to}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: F, fontSize: 10, color: "#8A8580" }}>{r.country}</span>
                    <span style={{
                      fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                      padding: "3px 10px",
                      color: r.status === "sent" ? "#5A7A5A" : r.status === "failed" ? "#8B4A4A" : "#8B7355",
                      background: r.status === "sent" ? "rgba(90,122,90,0.08)" : r.status === "failed" ? "rgba(139,74,74,0.08)" : "rgba(139,115,85,0.08)",
                    }}>
                      {r.status}
                    </span>
                    <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>
                      {new Date(r.sentAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </main>
    </>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
        <span style={{ fontFamily: S, fontSize: 28, fontWeight: 300, color: "#D4CEC4" }}>{number}</span>
        <h2 style={{ fontFamily: S, fontSize: 22, fontWeight: 400, color: "#1A1A1A" }}>{title}</h2>
      </div>
      <div style={{ border: "1px solid #E8E3DB", padding: 32, background: "#FFFFFF" }}>{children}</div>
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div style={{ padding: 24, background: "#FFFFFF", textAlign: "center" }}>
      <div style={{ fontFamily: S, fontSize: 32, fontWeight: 300, color: "#1A1A1A" }}>{value}</div>
      <div style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8580", marginTop: 6 }}>{label}</div>
    </div>
  );
}
