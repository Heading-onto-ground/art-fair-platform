"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";

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

// Pre-defined gallery targets for batch outreach
const GALLERY_TARGETS: { name: string; email: string; country: string; language: string }[] = [
  // Korea
  { name: "Gallery Hyundai", email: "info@galleryhyundai.com", country: "한국", language: "ko" },
  { name: "Kukje Gallery", email: "info@kukjegallery.com", country: "한국", language: "ko" },
  { name: "PKM Gallery", email: "info@pkmgallery.com", country: "한국", language: "ko" },
  { name: "Arario Gallery", email: "info@arariogallery.com", country: "한국", language: "ko" },
  // Japan
  { name: "SCAI The Bathhouse", email: "info@scaithebathhouse.com", country: "일본", language: "ja" },
  { name: "Taka Ishii Gallery", email: "info@takaishiigallery.com", country: "일본", language: "ja" },
  { name: "Perrotin Tokyo", email: "tokyo@perrotin.com", country: "일본", language: "ja" },
  // UK
  { name: "White Cube", email: "info@whitecube.com", country: "영국", language: "en" },
  { name: "Lisson Gallery", email: "contact@lissongallery.com", country: "영국", language: "en" },
  { name: "Victoria Miro", email: "info@victoria-miro.com", country: "영국", language: "en" },
  // France
  { name: "Galerie Perrotin", email: "info@perrotin.com", country: "프랑스", language: "fr" },
  { name: "Galerie Thaddaeus Ropac", email: "paris@ropac.net", country: "프랑스", language: "fr" },
  { name: "Galerie Templon", email: "info@templon.com", country: "프랑스", language: "fr" },
  // USA
  { name: "Pace Gallery", email: "info@pacegallery.com", country: "미국", language: "en" },
  { name: "David Zwirner", email: "info@davidzwirner.com", country: "미국", language: "en" },
  { name: "Hauser & Wirth", email: "newyork@hauserwirth.com", country: "미국", language: "en" },
  // Germany
  { name: "Sprüth Magers", email: "info@spruethmagers.com", country: "독일", language: "de" },
  { name: "Esther Schipper", email: "office@estherschipper.com", country: "독일", language: "de" },
  { name: "König Galerie", email: "info@koeniggalerie.com", country: "독일", language: "de" },
  // Italy
  { name: "Galleria Continua", email: "info@galleriacontinua.com", country: "이탈리아", language: "it" },
  { name: "Alfonso Artiaco", email: "info@alfonsoartiaco.com", country: "이탈리아", language: "it" },
];

export default function OutreachPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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

  // Single send form
  const [singleForm, setSingleForm] = useState({ to: "", galleryName: "", country: "한국", language: "en" });

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
      const [outreachRes, extRes] = await Promise.all([
        fetch("/api/outreach", { cache: "no-store" }),
        fetch("/api/admin/external-apps", { cache: "no-store" }),
      ]);
      const outreachData = await outreachRes.json();
      const extData = await extRes.json();
      setStats(outreachData.stats || null);
      setRecords(outreachData.records || []);
      setExtApps(extData.applications || []);
      setExtStats(extData.stats || null);
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
        setOutreachResults((prev) => ({ ...prev, [applicationId]: `Sent to ${data.email?.to}` }));
        loadData();
      } else {
        setOutreachResults((prev) => ({ ...prev, [applicationId]: `Failed: ${data.error}` }));
      }
    } catch {
      setOutreachResults((prev) => ({ ...prev, [applicationId]: "Server error" }));
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
      setSendResult(data.ok ? "Email sent successfully" : `Failed: ${data.error}`);
      loadData();
    } catch { setSendResult("Server error"); }
    finally { setSending(false); }
  }

  async function sendBatch(country: string) {
    setSending(true);
    setSendResult(null);
    const targets = country === "ALL"
      ? GALLERY_TARGETS
      : GALLERY_TARGETS.filter((g) => g.country === country);

    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_batch",
          galleries: targets.map((g) => ({ to: g.email, galleryName: g.name, country: g.country, language: g.language })),
        }),
      });
      const data = await res.json();
      setSendResult(`Batch complete: ${data.sent} sent, ${data.failed} failed`);
      loadData();
    } catch { setSendResult("Server error"); }
    finally { setSending(false); }
  }

  async function runCrawler() {
    setCrawling(true);
    setCrawlResult(null);
    try {
      const res = await fetch("/api/cron/crawl-opencalls", { method: "POST" });
      const data = await res.json();
      setCrawlResult(data.message || "Crawler completed");
    } catch { setCrawlResult("Crawler failed"); }
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
      setRemindResult(data.message || "Reminders created");
    } catch { setRemindResult("Failed"); }
    finally { setReminding(false); }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "14px 16px", background: "#FFFFFF", border: "1px solid #E8E3DB", color: "#1A1A1A", fontFamily: F, fontSize: 13, fontWeight: 400, outline: "none" };
  const btn = (disabled: boolean): React.CSSProperties => ({ padding: "12px 24px", border: "none", background: disabled ? "#E8E3DB" : "#1A1A1A", color: disabled ? "#8A8580" : "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer" });

  const countries = ["ALL", "한국", "일본", "영국", "프랑스", "미국", "독일", "이탈리아"];

  if (authenticated === null) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FDFBF7" }}>
        <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Authenticating...</p>
      </main>
    );
  }

  if (!authenticated) return null;

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "56px 40px" }}>
        <div style={{ marginBottom: 48 }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>Admin</span>
          <h1 style={{ fontFamily: S, fontSize: 42, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>Growth Automation</h1>
          <p style={{ fontFamily: F, fontSize: 12, fontWeight: 300, color: "#8A8580", marginTop: 8 }}>
            Manage outreach, crawlers, and automated notifications
          </p>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <Section number="01" title="Outreach Stats">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#E8E3DB" }}>
              <Stat value={stats.total} label="Total Sent" />
              <Stat value={stats.sent} label="Delivered" />
              <Stat value={stats.signedUp} label="Signed Up" />
              <Stat value={`${stats.conversionRate}%`} label="Conversion" />
            </div>
          </Section>
        )}

        {/* External Applications — Artist interest in crawled open calls */}
        <Section number="02" title="External Applications">
          {extStats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "#E8E3DB", marginBottom: 24 }}>
              <Stat value={extStats.total} label="Total" />
              <Stat value={extStats.pending} label="Pending Outreach" />
              <Stat value={extStats.sent} label="Outreach Sent" />
            </div>
          )}
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 20 }}>
            Artists interested in external open calls. Send outreach emails to invite galleries to ROB.
          </p>

          {extApps.length === 0 ? (
            <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2", textAlign: "center", padding: 24 }}>
              No external applications yet. Artists will appear here when they apply to crawled open calls.
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
                        {app.outreachSent ? "OUTREACH SENT" : "PENDING OUTREACH"}
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
                    Open Call: <strong>{app.openCallTheme}</strong>
                    <br />Deadline: {app.openCallDeadline}
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
                        View Portfolio
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
                    {!app.outreachSent ? (
                      <button
                        onClick={() => sendOutreachToGallery(app.id)}
                        disabled={sendingOutreach === app.id}
                        style={{
                          padding: "10px 20px", border: "1px solid #1A1A1A", background: "#1A1A1A",
                          color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500,
                          letterSpacing: "0.1em", textTransform: "uppercase",
                          cursor: sendingOutreach === app.id ? "wait" : "pointer",
                        }}
                      >
                        {sendingOutreach === app.id ? "Sending..." : `Send outreach to ${app.galleryName}`}
                      </button>
                    ) : (
                      <span style={{ fontFamily: F, fontSize: 11, color: "#5A7A5A" }}>
                        Sent {app.outreachSentAt ? new Date(app.outreachSentAt).toLocaleString() : ""}
                      </span>
                    )}
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
        <Section number="03" title="Gallery Outreach">
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 20 }}>
            Send invitation emails to galleries worldwide. {GALLERY_TARGETS.length} galleries in database.
          </p>

          {/* Country filter + batch send */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {countries.map((c) => {
              const count = c === "ALL" ? GALLERY_TARGETS.length : GALLERY_TARGETS.filter((g) => g.country === c).length;
              return (
                <button key={c} onClick={() => setSelectedCountry(c)}
                  style={{ padding: "8px 16px", border: c === selectedCountry ? "1px solid #1A1A1A" : "1px solid #E8E3DB", background: c === selectedCountry ? "#1A1A1A" : "transparent", color: c === selectedCountry ? "#FDFBF7" : "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", cursor: "pointer" }}>
                  {c} ({count})
                </button>
              );
            })}
          </div>

          <button onClick={() => sendBatch(selectedCountry)} disabled={sending} style={btn(sending)}>
            {sending ? "Sending..." : `Send to ${selectedCountry === "ALL" ? "all" : selectedCountry} galleries`}
          </button>

          {/* Single send */}
          <div style={{ marginTop: 28, padding: 24, border: "1px solid #E8E3DB", background: "#FAF8F4" }}>
            <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355", marginBottom: 16 }}>Send to specific gallery</div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input value={singleForm.galleryName} onChange={(e) => setSingleForm((p) => ({ ...p, galleryName: e.target.value }))} placeholder="Gallery name" style={inp} />
                <input value={singleForm.to} onChange={(e) => setSingleForm((p) => ({ ...p, to: e.target.value }))} placeholder="Email" style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <select value={singleForm.country} onChange={(e) => setSingleForm((p) => ({ ...p, country: e.target.value }))} style={inp}>
                  <option value="한국">Korea</option><option value="일본">Japan</option><option value="영국">UK</option><option value="프랑스">France</option>
                  <option value="미국">USA</option><option value="독일">Germany</option><option value="이탈리아">Italy</option><option value="스위스">Switzerland</option>
                </select>
                <select value={singleForm.language} onChange={(e) => setSingleForm((p) => ({ ...p, language: e.target.value }))} style={inp}>
                  <option value="en">English</option><option value="ko">Korean</option><option value="ja">Japanese</option>
                  <option value="fr">French</option><option value="de">German</option>
                </select>
              </div>
              <button onClick={sendSingle} disabled={sending} style={btn(sending)}>
                {sending ? "..." : "Send invitation"}
              </button>
            </div>
          </div>

          {sendResult && (
            <p style={{ marginTop: 16, fontFamily: F, fontSize: 12, color: sendResult.includes("success") || sendResult.includes("complete") ? "#5A7A5A" : "#8B4A4A" }}>
              {sendResult}
            </p>
          )}
        </Section>

        {/* Open Call Crawler */}
        <Section number="04" title="Open Call Crawler">
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 16 }}>
            Automatically discover and import open calls from external sources.
          </p>
          <div style={{ display: "grid", gap: 1, background: "#E8E3DB", marginBottom: 20 }}>
            {[
              { name: "e-flux", url: "e-flux.com", type: "RSS" },
              { name: "artrabbit", url: "artrabbit.com", type: "Scrape" },
              { name: "transartists", url: "transartists.org", type: "Scrape" },
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
            {crawling ? "Crawling..." : "Run crawler now"}
          </button>
          {crawlResult && <p style={{ marginTop: 12, fontFamily: F, fontSize: 12, color: "#5A7A5A" }}>{crawlResult}</p>}
        </Section>

        {/* Deadline Reminders */}
        <Section number="05" title="Deadline Reminders">
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 16 }}>
            Generate deadline reminder notifications for approaching open calls.
          </p>
          <button onClick={triggerDeadlineReminders} disabled={reminding} style={btn(reminding)}>
            {reminding ? "Generating..." : "Send deadline reminders"}
          </button>
          {remindResult && <p style={{ marginTop: 12, fontFamily: F, fontSize: 12, color: "#5A7A5A" }}>{remindResult}</p>}
        </Section>

        {/* Recent Outreach Records */}
        <Section number="06" title="Recent Outreach">
          {records.length === 0 ? (
            <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2", textAlign: "center", padding: 24 }}>No outreach records yet</p>
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
