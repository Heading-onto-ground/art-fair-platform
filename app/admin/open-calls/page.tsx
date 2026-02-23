"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

type OpenCall = {
  id: string;
  galleryId: string;
  gallery: string;
  city: string;
  country: string;
  deadline: string;
  isExternal?: boolean;
};

type GalleryOption = {
  galleryId: string;
  gallery: string;
  city: string;
  country: string;
  openCallCount: number;
  isExternal: boolean;
};

export default function AdminOpenCallsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;

  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openCalls, setOpenCalls] = useState<OpenCall[]>([]);
  const [pinnedGalleryId, setPinnedGalleryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const data = await res.json().catch(() => null);
        if (data?.authenticated) {
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

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ocRes, pinRes] = await Promise.all([
        // Add cache-bust so admins see fresh ordering quickly.
        fetch(`/api/open-calls?t=${Date.now()}`, { cache: "no-store" }),
        fetch("/api/admin/open-call-pin", { cache: "no-store", credentials: "include" }),
      ]);
      if (pinRes.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const ocData = await ocRes.json().catch(() => null);
      const pinData = await pinRes.json().catch(() => null);
      setOpenCalls(Array.isArray(ocData?.openCalls) ? (ocData.openCalls as OpenCall[]) : []);
      setPinnedGalleryId(typeof pinData?.pinnedGalleryId === "string" ? pinData.pinnedGalleryId : null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authenticated) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const galleryOptions = useMemo(() => {
    const map = new Map<string, GalleryOption>();
    for (const oc of openCalls) {
      const gid = String(oc.galleryId || "").trim();
      if (!gid) continue;
      const prev = map.get(gid);
      if (!prev) {
        map.set(gid, {
          galleryId: gid,
          gallery: String(oc.gallery || "").trim() || gid,
          city: String(oc.city || "").trim(),
          country: String(oc.country || "").trim(),
          openCallCount: 1,
          isExternal: !!oc.isExternal,
        });
      } else {
        map.set(gid, { ...prev, openCallCount: prev.openCallCount + 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.openCallCount !== a.openCallCount) return b.openCallCount - a.openCallCount;
      return a.gallery.localeCompare(b.gallery);
    });
  }, [openCalls]);

  const pinnedOption = useMemo(
    () => (pinnedGalleryId ? galleryOptions.find((g) => g.galleryId === pinnedGalleryId) || null : null),
    [galleryOptions, pinnedGalleryId]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return galleryOptions;
    return galleryOptions.filter((g) => {
      return (
        g.gallery.toLowerCase().includes(q) ||
        g.galleryId.toLowerCase().includes(q) ||
        (g.country || "").toLowerCase().includes(q) ||
        (g.city || "").toLowerCase().includes(q)
      );
    });
  }, [galleryOptions, query]);

  async function savePin(nextGalleryId: string | null) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/open-call-pin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galleryId: nextGalleryId }),
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json().catch(() => null);
      setPinnedGalleryId(typeof data?.pinnedGalleryId === "string" ? data.pinnedGalleryId : null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

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
        <div style={{ marginBottom: 32 }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            {tr("Admin", "관리자", "管理者", "Admin")}
          </span>
          <h1 style={{ fontFamily: S, fontSize: 42, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
            {tr("Open Calls", "오픈콜", "オープンコール", "Open Calls")}
          </h1>
          <p style={{ fontFamily: F, fontSize: 12, fontWeight: 300, color: "#8A8580", marginTop: 8 }}>
            {tr(
              "Pin a gallery to prioritize its open calls at the top.",
              "특정 갤러리를 핀하여 해당 오픈콜을 최상단에 우선 노출합니다.",
              "ギャラリーをピン留めして、オープンコールを最上部に表示します。",
              "Épinglez une galerie pour prioriser ses open calls."
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "10px 18px",
              border: "1px solid #E8E3DB",
              background: "#FFFFFF",
              color: "#8A8580",
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "..." : tr("Refresh", "새로고침", "更新", "Rafraîchir")}
          </button>
          <button
            onClick={() => savePin(null)}
            disabled={saving || !pinnedGalleryId}
            style={{
              padding: "10px 18px",
              border: "1px solid #E8E3DB",
              background: pinnedGalleryId ? "#1A1A1A" : "#FFFFFF",
              color: pinnedGalleryId ? "#FFFFFF" : "#C8C2B9",
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: saving || !pinnedGalleryId ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "..." : tr("Clear pin", "핀 해제", "解除", "Désépingler")}
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("Search gallery...", "갤러리 검색...", "検索...", "Rechercher...")}
            style={{
              flex: "1 1 280px",
              minWidth: 220,
              padding: "12px 14px",
              border: "1px solid #E8E3DB",
              background: "#FFFFFF",
              fontFamily: F,
              fontSize: 12,
              color: "#1A1A1A",
              outline: "none",
            }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: 18, padding: 14, border: "1px solid rgba(139,74,74,0.25)", background: "rgba(139,74,74,0.04)", color: "#8B4A4A", fontFamily: F, fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: 22, marginBottom: 24 }}>
          <div style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B7355", marginBottom: 10 }}>
            {tr("Current pin", "현재 핀", "現在のピン", "Épingle actuelle")}
          </div>
          {pinnedOption ? (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: S, fontSize: 20, color: "#1A1A1A" }}>{pinnedOption.gallery}</div>
                <div style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginTop: 6 }}>
                  {[pinnedOption.country, pinnedOption.city].filter(Boolean).join(" / ")} · {pinnedOption.openCallCount} {tr("open calls", "개 오픈콜", "件", "open calls")}
                </div>
                <div style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", marginTop: 6 }}>
                  ID: {pinnedOption.galleryId}
                </div>
              </div>
              <span style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 10px", border: "1px solid #1A1A1A", color: "#1A1A1A" }}>
                PINNED
              </span>
            </div>
          ) : (
            <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2", margin: 0 }}>
              {tr("No pinned gallery.", "핀된 갤러리가 없습니다.", "ピン留めなし。", "Aucune galerie épinglée.")}
            </p>
          )}
        </div>

        <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
          {loading ? (
            <div style={{ padding: 20, background: "#FFFFFF", fontFamily: F, fontSize: 12, color: "#8A8580" }}>
              {tr("Loading...", "로딩 중...", "読み込み中...", "Chargement...")}
            </div>
          ) : filteredOptions.length === 0 ? (
            <div style={{ padding: 20, background: "#FFFFFF", fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>
              {tr("No results.", "검색 결과가 없습니다.", "該当なし。", "Aucun résultat.")}
            </div>
          ) : (
            filteredOptions.map((g) => {
              const active = g.galleryId === pinnedGalleryId;
              return (
                <button
                  key={g.galleryId}
                  onClick={() => savePin(g.galleryId)}
                  disabled={saving}
                  style={{
                    textAlign: "left",
                    padding: "16px 18px",
                    background: active ? "#FFF8EF" : "#FFFFFF",
                    border: "none",
                    cursor: saving ? "wait" : "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: S, fontSize: 18, color: "#1A1A1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {g.gallery}
                    </div>
                    <div style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginTop: 6 }}>
                      {[g.country, g.city].filter(Boolean).join(" / ")} · {g.openCallCount} {tr("open calls", "개 오픈콜", "件", "open calls")}
                      {g.isExternal ? ` · ${tr("external", "외부", "外部", "externe")}` : ""}
                    </div>
                    <div style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", marginTop: 6 }}>
                      ID: {g.galleryId}
                    </div>
                  </div>
                  <span style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 10px", border: `1px solid ${active ? "#8B7355" : "#E8E3DB"}`, color: active ? "#8B7355" : "#8A8580" }}>
                    {active ? "PINNED" : tr("Pin", "핀", "ピン", "Épingler")}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}

