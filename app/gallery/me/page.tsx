"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";

type Role = "artist" | "gallery";

type Session = {
  userId: string;
  role: Role;
  email: string;
};

type GalleryProfile = {
  id: string;
  userId: string;
  role: "gallery";
  email: string;
  galleryId: string;
  name: string;
  address: string;
  foundedYear: number;
  instagram?: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  createdAt: number;
  updatedAt: number;
};

type MeResponse = {
  session: Session | null;
  profile: any | null; // 서버에서 union으로 올 수 있어서 일단 any
};

type Exhibition = {
  id: string;
  galleryId: string;
  title: string;
  country: string;
  city: string;
  year: number;
  summary?: string;
};

function Chip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "dark" | "soft";
}) {
  const styles =
    tone === "dark"
      ? { background: "#111", color: "#fff", border: "1px solid #111" }
      : tone === "soft"
      ? { background: "#f5f5f5", color: "#111", border: "1px solid #eee" }
      : { background: "#fff", color: "#111", border: "1px solid #ddd" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        lineHeight: 1,
        ...styles,
      }}
    >
      {children}
    </span>
  );
}

export default function GalleryMePage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    galleryId: "",
    name: "",
    country: "",
    city: "",
    address: "",
    foundedYear: "",
    instagram: "",
    website: "",
    bio: "",
  });

  const [saveLoading, setSaveLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [exLoading, setExLoading] = useState(false);
  const [exForm, setExForm] = useState({
    title: "",
    country: "한국",
    city: "",
    year: String(new Date().getFullYear()),
    summary: "",
  });
  const [exMsg, setExMsg] = useState<string | null>(null);

  const loadMe = async () => {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = (await res.json()) as MeResponse;

    setMe(data);

    // auth redirect rules
    if (!data.session) {
      router.push("/login");
      return;
    }
    if (data.session.role !== "gallery") {
      router.push("/artist");
      return;
    }

    // hydrate form from profile
    const p = data.profile as GalleryProfile | null;
    if (p && p.role === "gallery") {
      setForm({
        galleryId: p.galleryId ?? "",
        name: p.name ?? "",
        country: p.country ?? "",
        city: p.city ?? "",
        address: p.address ?? "",
        foundedYear: p.foundedYear ? String(p.foundedYear) : "",
        instagram: p.instagram ?? "",
        website: p.website ?? "",
        bio: p.bio ?? "",
      });
    }

    setLoading(false);
  };

  const loadExhibitions = async () => {
    setExLoading(true);
    try {
      const res = await fetch("/api/gallery/exhibitions", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setExhibitions(Array.isArray(data?.exhibitions) ? data.exhibitions : []);
      }
    } finally {
      setExLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me?.session) return;
    loadExhibitions();
  }, [me?.session?.userId]);

  const addExhibition = async () => {
    setExMsg(null);
    try {
      const res = await fetch("/api/gallery/exhibitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: exForm.title.trim(),
          country: exForm.country.trim(),
          city: exForm.city.trim(),
          year: Number(exForm.year),
          summary: exForm.summary.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.exhibition) {
        setExMsg(data?.error ?? "Failed to add exhibition");
        return;
      }
      setExhibitions((p) => [data.exhibition as Exhibition, ...p]);
      setExForm((p) => ({
        ...p,
        title: "",
        city: "",
        summary: "",
      }));
    } catch {
      setExMsg("Server error");
    }
  };

  const updateExhibition = async (id: string, patch: Partial<Exhibition>) => {
    const res = await fetch(`/api/gallery/exhibitions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.exhibition) {
      setExhibitions((p) =>
        p.map((e) => (e.id === id ? (data.exhibition as Exhibition) : e))
      );
    }
  };

  const removeExhibition = async (id: string) => {
    const res = await fetch(`/api/gallery/exhibitions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setExhibitions((p) => p.filter((e) => e.id !== id));
    }
  };

  const onSave = async () => {
    setMsg(null);
    setSaveLoading(true);

    try {
      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setMsg(json?.error ?? `저장 실패 (${res.status})`);
        setSaveLoading(false);
        return;
      }

      setMsg("저장 완료 ✅");
      await loadMe();
    } catch {
      setMsg("서버 오류");
    } finally {
      setSaveLoading(false);
    }
  };

  const session = me?.session as Session | null;
  const profile = me?.profile as GalleryProfile | null;

  return (
    <>
      <TopBar />

      <main style={{ maxWidth: 860, margin: "40px auto", padding: "0 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            🏛️ Gallery Profile
          </h1>
          {session?.email ? <Chip tone="soft">{session.email}</Chip> : null}
        </div>

        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
          Your public identity used for open calls and artist conversations.
        </div>

        {loading ? (
          <div style={{ padding: 14, opacity: 0.7 }}>Loading…</div>
        ) : (
          <>
            <div
              style={{
                marginTop: 14,
                border: "1px solid #e6e6e6",
                borderRadius: 18,
                background: "#fff",
                padding: 16,
              }}
            >
            {/* Summary */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {profile?.name?.trim() ? profile.name : "(No name yet)"}
              </div>
              <Chip tone="dark">GALLERY</Chip>
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Chip>📍 {form.city || "-"}</Chip>
              <Chip>🌍 {form.country || "-"}</Chip>
              {session?.userId ? (
                <Chip tone="soft">ID: {session.userId}</Chip>
              ) : null}
              {profile?.galleryId ? <Chip>🏛️ {profile.galleryId}</Chip> : null}
              {profile?.foundedYear ? (
                <Chip>⏳ {new Date().getFullYear() - profile.foundedYear + 1}년차</Chip>
              ) : null}
            </div>

            <hr style={{ margin: "16px 0" }} />

            {/* Edit form */}
            <div style={{ fontWeight: 900, marginBottom: 8 }}>
              ✏️ Edit profile
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ fontSize: 12, opacity: 0.75 }}>Gallery ID</label>
              <input
                value={form.galleryId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, galleryId: e.target.value }))
                }
                placeholder="e.g., GAL-0001"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />
              <label style={{ fontSize: 12, opacity: 0.75 }}>Name</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Gallery name"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "1fr 1fr",
                }}
              >
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Country</label>
                  <input
                    value={form.country}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, country: e.target.value }))
                    }
                    placeholder="e.g. United Kingdom"
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #ddd",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontSize: 12, opacity: 0.75 }}>City</label>
                  <input
                    value={form.city}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, city: e.target.value }))
                    }
                    placeholder="e.g. London"
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #ddd",
                    }}
                  />
                </div>
              </div>

              <label style={{ fontSize: 12, opacity: 0.75 }}>Address</label>
              <input
                value={form.address}
                onChange={(e) =>
                  setForm((p) => ({ ...p, address: e.target.value }))
                }
                placeholder="Gallery address"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />

              <label style={{ fontSize: 12, opacity: 0.75 }}>Founded Year</label>
              <input
                value={form.foundedYear}
                onChange={(e) =>
                  setForm((p) => ({ ...p, foundedYear: e.target.value }))
                }
                placeholder="e.g., 2010"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />

              <label style={{ fontSize: 12, opacity: 0.75 }}>Instagram</label>
              <input
                value={form.instagram}
                onChange={(e) =>
                  setForm((p) => ({ ...p, instagram: e.target.value }))
                }
                placeholder="https://instagram.com/..."
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />

              <label style={{ fontSize: 12, opacity: 0.75 }}>Website</label>
              <input
                value={form.website}
                onChange={(e) =>
                  setForm((p) => ({ ...p, website: e.target.value }))
                }
                placeholder="https://..."
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />

              <label style={{ fontSize: 12, opacity: 0.75 }}>Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Write gallery bio..."
                rows={5}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <button
              onClick={onSave}
              disabled={saveLoading}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {saveLoading ? "Saving..." : "Save Profile"}
            </button>

            {msg && <div style={{ marginTop: 12, fontSize: 13 }}>{msg}</div>}

            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
              Updated:{" "}
              {profile?.updatedAt
                ? new Date(profile.updatedAt).toLocaleString()
                : "-"}
            </div>
            </div>

          {/* Exhibition editor */}
            <div
            style={{
              marginTop: 14,
              border: "1px solid #e6e6e6",
              borderRadius: 18,
              background: "#fff",
              padding: 16,
            }}
            >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>
              🗓️ Exhibition History (Edit)
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                value={exForm.title}
                onChange={(e) => setExForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Exhibition title"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #ddd",
                }}
              />
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                <select
                  value={exForm.country}
                  onChange={(e) => setExForm((p) => ({ ...p, country: e.target.value }))}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fff",
                  }}
                >
                  <option value="한국">한국</option>
                  <option value="일본">일본</option>
                  <option value="영국">영국</option>
                </select>
                <input
                  value={exForm.city}
                  onChange={(e) => setExForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="City"
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                />
              </div>
              <input
                value={exForm.year}
                onChange={(e) => setExForm((p) => ({ ...p, year: e.target.value }))}
                placeholder="Year (e.g., 2024)"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #ddd",
                }}
              />
              <textarea
                value={exForm.summary}
                onChange={(e) => setExForm((p) => ({ ...p, summary: e.target.value }))}
                placeholder="Summary (optional)"
                rows={3}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #ddd",
                }}
              />
            </div>
            <button
              onClick={addExhibition}
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
              Add Exhibition
            </button>
            {exMsg ? (
              <div style={{ marginTop: 8, fontSize: 12 }}>{exMsg}</div>
            ) : null}

            <div style={{ marginTop: 12 }}>
              {exLoading ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>Loading…</div>
              ) : exhibitions.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>No exhibitions yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {exhibitions.map((ex) => (
                    <div
                      key={ex.id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 12,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>{ex.title}</div>
                      <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
                        {ex.city}, {ex.country} · {ex.year}
                      </div>
                      {ex.summary ? (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                          {ex.summary}
                        </div>
                      ) : null}
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() =>
                            updateExhibition(ex.id, {
                              title: prompt("Title", ex.title) ?? ex.title,
                              city: prompt("City", ex.city) ?? ex.city,
                              country: prompt("Country", ex.country) ?? ex.country,
                              year: Number(prompt("Year", String(ex.year)) ?? ex.year),
                              summary: prompt("Summary", ex.summary ?? "") ?? ex.summary,
                            })
                          }
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            background: "#fff",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeExhibition(ex.id)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(200,0,0,0.4)",
                            background: "rgba(200,0,0,0.06)",
                            color: "#b00",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
