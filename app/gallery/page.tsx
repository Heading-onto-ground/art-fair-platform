"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";

type Role = "artist" | "gallery";

type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

type ChatRoom = {
  id: string;
  openCallId: string;
  artistId: string;
  galleryId: string;
  messages: { createdAt: number; text: string; senderId: string }[];
};

type OpenCall = {
  id: string;
  galleryId: string;
  gallery: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
  createdAt: number;
};

type Invite = {
  id: string;
  galleryId: string;
  artistId: string;
  openCallId: string;
  message: string;
  status: "sent" | "viewed" | "accepted" | "declined";
  createdAt: number;
};

type InviteTemplates = {
  galleryId: string;
  korea: string;
  japan: string;
  global: string;
  updatedAt: number;
};

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    return (await res.json().catch(() => null)) as MeResponse | null;
  } catch {
    return null;
  }
}

export default function GalleryPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [templates, setTemplates] = useState<InviteTemplates | null>(null);
  const [tplSaving, setTplSaving] = useState(false);
  const [tplMsg, setTplMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ocForm, setOcForm] = useState({
    gallery: "",
    city: "",
    country: "한국",
    theme: "",
    deadline: "",
  });
  const [savingOC, setSavingOC] = useState(false);
  const [ocMsg, setOcMsg] = useState<string | null>(null);

  const session = me?.session;

  const headers = useMemo(() => {
    if (!session) return {};
    return {
      "x-user-id": session.userId,
      "x-user-role": session.role,
    };
  }, [session]);

  async function loadChats(h: Record<string, string>) {
    const res = await fetch("/api/chats", { headers: h, cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
    return Array.isArray(data?.rooms) ? (data.rooms as ChatRoom[]) : [];
  }

  async function loadOpenCalls() {
    const res = await fetch("/api/open-calls", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
    const all = Array.isArray(data?.openCalls) ? (data.openCalls as OpenCall[]) : [];
    return all;
  }

  async function loadInvites() {
    const res = await fetch("/api/gallery/invites", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
    return Array.isArray(data?.invites) ? (data.invites as Invite[]) : [];
  }

  async function loadTemplates() {
    const res = await fetch("/api/gallery/invite-templates", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
    return (data?.templates ?? null) as InviteTemplates | null;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const m = await fetchMe();
      const r = m?.session?.role;

      if (!r) {
        router.replace("/login?role=gallery");
        return;
      }
      if (r !== "gallery") {
        router.replace("/artist");
        return;
      }

      setMe(m);
      const profile = m?.profile ?? null;
      setOcForm((p) => ({
        ...p,
        gallery: profile?.name ?? p.gallery,
      }));

      try {
        const list = await loadChats({
          "x-user-id": m!.session!.userId,
          "x-user-role": m!.session!.role,
        });
        setRooms(list);
        const allOCs = await loadOpenCalls();
        setOpenCalls(allOCs.filter((o) => o.galleryId === m!.session!.userId));
        const inv = await loadInvites();
        setInvites(inv);
        const tpl = await loadTemplates();
        setTemplates(tpl);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load chats");
        setRooms([]);
        setOpenCalls([]);
        setInvites([]);
        setTemplates(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function refresh() {
    if (!session) return;
    setErr(null);
    try {
      const list = await loadChats(headers as Record<string, string>);
      setRooms(list);
      const allOCs = await loadOpenCalls();
      setOpenCalls(allOCs.filter((o) => o.galleryId === session.userId));
      const inv = await loadInvites();
      setInvites(inv);
      const tpl = await loadTemplates();
      setTemplates(tpl);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load chats");
      setRooms([]);
      setOpenCalls([]);
      setInvites([]);
      setTemplates(null);
    }
  }

  async function updateInviteStatus(id: string, status: Invite["status"]) {
    const res = await fetch(`/api/gallery/invites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.invite) {
      setInvites((prev) =>
        prev.map((i) => (i.id === id ? (data.invite as Invite) : i))
      );
    }
  }

  async function saveTemplates() {
    if (!templates) return;
    setTplSaving(true);
    setTplMsg(null);
    try {
      const res = await fetch("/api/gallery/invite-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          korea: templates.korea,
          japan: templates.japan,
          global: templates.global,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.templates) {
        setTplMsg(data?.error ?? "Failed to save templates");
        return;
      }
      setTemplates(data.templates as InviteTemplates);
      setTplMsg("Saved ✅");
    } catch {
      setTplMsg("Server error");
    } finally {
      setTplSaving(false);
    }
  }

  async function createOpenCall() {
    if (!session) return;
    setOcMsg(null);
    setSavingOC(true);
    try {
      const res = await fetch("/api/open-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gallery: ocForm.gallery.trim(),
          city: ocForm.city.trim(),
          country: ocForm.country.trim(),
          theme: ocForm.theme.trim(),
          deadline: ocForm.deadline.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.openCall) {
        throw new Error(data?.error ?? `Failed to create (${res.status})`);
      }
      setOpenCalls((p) => [data.openCall as OpenCall, ...p]);
      setOcForm((p) => ({ ...p, city: "", country: "", theme: "", deadline: "" }));
      setOcMsg("오픈콜 등록 완료 ✅");
    } catch (e: any) {
      setOcMsg(e?.message ?? "오픈콜 등록 실패");
    } finally {
      setSavingOC(false);
    }
  }

  if (loading) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 900, margin: "30px auto", padding: "0 12px" }}>
          <p>Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 900, margin: "30px auto", padding: "0 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 26, fontWeight: 900 }}>🏛️ {t("gallery_page_title", lang)}</h1>
          <button onClick={refresh}>{t("refresh", lang)}</button>
        </div>

        <p style={{ opacity: 0.7, marginTop: 6 }}>
          Signed in: <b>{session?.userId}</b> ({session?.role})
        </p>

        {err && (
          <div
            style={{
              marginTop: 12,
              border: "1px solid rgba(255,80,80,0.5)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <b>Error:</b> {err}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900 }}>Create Open Call</h2>
          <div
            style={{
              marginTop: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <input
                value={ocForm.gallery}
                onChange={(e) => setOcForm((p) => ({ ...p, gallery: e.target.value }))}
                placeholder="Gallery name"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.16)",
                }}
              />
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                <select
                  value={ocForm.country}
                  onChange={(e) => setOcForm((p) => ({ ...p, country: e.target.value }))}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.16)",
                    background: "#fff",
                  }}
                >
                  <option value="한국">한국</option>
                  <option value="일본">일본</option>
                  <option value="영국">영국</option>
                </select>
                <input
                  value={ocForm.city}
                  onChange={(e) => setOcForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="City"
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.16)",
                  }}
                />
              </div>
              <input
                value={ocForm.theme}
                onChange={(e) => setOcForm((p) => ({ ...p, theme: e.target.value }))}
                placeholder="Theme"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.16)",
                }}
              />
              <input
                value={ocForm.deadline}
                onChange={(e) => setOcForm((p) => ({ ...p, deadline: e.target.value }))}
                placeholder="Deadline (YYYY-MM-DD)"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.16)",
                }}
              />
            </div>
            <button
              onClick={createOpenCall}
              disabled={savingOC}
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {savingOC ? "Saving..." : "Publish Open Call"}
            </button>
            {ocMsg ? <div style={{ marginTop: 8, fontSize: 12 }}>{ocMsg}</div> : null}
          </div>

          <h2 style={{ marginTop: 18, fontSize: 18, fontWeight: 900 }}>
            My Open Calls
          </h2>
          {openCalls.length === 0 ? (
            <div style={{ marginTop: 10, opacity: 0.8 }}>No open calls yet.</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {openCalls.map((o) => (
                <button
                  key={o.id}
                  onClick={() => router.push(`/open-calls/${o.id}`)}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>
                    {o.country} {o.city} · {o.theme}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                    Deadline: {o.deadline} · OpenCall: {o.id}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900 }}>Chats</h2>

          {rooms.length === 0 ? (
            <div
              style={{
                marginTop: 10,
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 12,
                padding: 12,
                opacity: 0.8,
                background: "#fff",
              }}
            >
              No chats yet.
            </div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {rooms.map((r) => {
                const last = r.messages?.[r.messages.length - 1];
                const counterpart = r.artistId;

                return (
                  <button
                    key={r.id}
                    onClick={() =>
                      router.push(`/chat/${r.id}?uid=${session?.userId}&role=gallery`)
                    }
                    style={{
                      textAlign: "left",
                      padding: 14,
                      borderRadius: 14,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>
                      🎨 Artist: {counterpart}
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.85 }}>
                      OpenCall: <b>{r.openCallId}</b> · Room: {r.id}
                    </div>
                    <div style={{ marginTop: 8, opacity: 0.9 }}>
                      {last ? (
                        <>
                          <b>{last.senderId === session?.userId ? "You" : last.senderId}:</b>{" "}
                          {last.text}
                        </>
                      ) : (
                        <span style={{ opacity: 0.7 }}>No messages yet</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900 }}>Invites</h2>
          {invites.length === 0 ? (
            <div style={{ marginTop: 10, opacity: 0.8 }}>No invites yet.</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {invites.map((i) => (
                <div
                  key={i.id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 12,
                    padding: 12,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>
                    🎨 {i.artistId} · OpenCall {i.openCallId}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                    {new Date(i.createdAt).toLocaleString()}
                  </div>
                  <div style={{ marginTop: 6 }}>{i.message}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>
                      Status: {i.status}
                    </span>
                    <button
                      onClick={() => updateInviteStatus(i.id, "viewed")}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid rgba(0,0,0,0.12)",
                        background: "#fff",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Mark Viewed
                    </button>
                    <button
                      onClick={() => updateInviteStatus(i.id, "accepted")}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #111",
                        background: "#111",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Mark Accepted
                    </button>
                    <button
                      onClick={() => updateInviteStatus(i.id, "declined")}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid rgba(200,0,0,0.4)",
                        background: "rgba(200,0,0,0.06)",
                        color: "#b00",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Mark Declined
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900 }}>Invite Templates</h2>
          {!templates ? (
            <div style={{ marginTop: 10, opacity: 0.8 }}>Loading templates…</div>
          ) : (
            <div
              style={{
                marginTop: 10,
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 12,
                padding: 12,
                background: "#fff",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Use placeholders: {"{{gallery}}"}, {"{{theme}}"}, {"{{artist}}"}, {"{{deadline}}"},{" "}
                {"{{city}}"}, {"{{country}}"}
              </div>
              <textarea
                value={templates.korea}
                onChange={(e) => setTemplates((p) => (p ? { ...p, korea: e.target.value } : p))}
                rows={2}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
              <textarea
                value={templates.japan}
                onChange={(e) => setTemplates((p) => (p ? { ...p, japan: e.target.value } : p))}
                rows={2}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
              <textarea
                value={templates.global}
                onChange={(e) => setTemplates((p) => (p ? { ...p, global: e.target.value } : p))}
                rows={2}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
              <button
                onClick={saveTemplates}
                disabled={tplSaving}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {tplSaving ? "Saving..." : "Save Templates"}
              </button>
              {tplMsg ? <div style={{ fontSize: 12 }}>{tplMsg}</div> : null}
            </div>
          )}
        </div>
      </main>
    </>
  );
}