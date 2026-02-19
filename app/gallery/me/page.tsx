"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import ProfileImageUpload from "@/app/components/ProfileImageUpload";
import { F, S } from "@/lib/design";

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
  profileImage?: string | null;
  createdAt: number;
  updatedAt: number;
};

type MeResponse = {
  session: Session | null;
  profile: any | null;
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

export default function GalleryMePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdminView = searchParams.get("adminView") === "1";
  const [adminReadOnly, setAdminReadOnly] = useState(false);

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
    if (isAdminView) {
      const adminRes = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" }).catch(() => null);
      const adminData = adminRes ? await adminRes.json().catch(() => null) : null;
      if (adminData?.authenticated) {
        setAdminReadOnly(true);
        setMe({
          session: { userId: "__admin_preview__", role: "gallery", email: adminData?.session?.email || "admin@rob-roleofbridge.com" },
          profile: null,
        });
        setLoading(false);
        return;
      }
    }
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = (await res.json()) as MeResponse;

    setMe(data);

    if (!data.session) {
      router.push("/login");
      return;
    }
    if (data.session.role !== "gallery") {
      router.push("/artist");
      return;
    }

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
  }, [isAdminView]);

  useEffect(() => {
    if (!me?.session || adminReadOnly) return;
    loadExhibitions();
  }, [me?.session?.userId, adminReadOnly]);

  const addExhibition = async () => {
    if (adminReadOnly) {
      setExMsg("Read-only admin preview mode");
      return;
    }
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
      setExForm((p) => ({ ...p, title: "", city: "", summary: "" }));
    } catch {
      setExMsg("Server error");
    }
  };

  const updateExhibition = async (id: string, patch: Partial<Exhibition>) => {
    if (adminReadOnly) return;
    const res = await fetch(`/api/gallery/exhibitions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.exhibition) {
      setExhibitions((p) => p.map((e) => (e.id === id ? (data.exhibition as Exhibition) : e)));
    }
  };

  const removeExhibition = async (id: string) => {
    if (adminReadOnly) return;
    const res = await fetch(`/api/gallery/exhibitions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setExhibitions((p) => p.filter((e) => e.id !== id));
    }
  };

  const onSave = async () => {
    if (adminReadOnly) {
      setMsg("Read-only admin preview mode");
      return;
    }
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
        setMsg(json?.error ?? `Save failed (${res.status})`);
        setSaveLoading(false);
        return;
      }

      setMsg("Profile saved successfully");
      await loadMe();
    } catch {
      setMsg("Server error");
    } finally {
      setSaveLoading(false);
    }
  };

  const session = me?.session as Session | null;
  const profile = me?.profile as GalleryProfile | null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 18px",
    border: "1px solid #E5E0DB",
    background: "#FFFFFF",
    fontFamily: F,
    fontSize: 13,
    color: "#1A1A1A",
    outline: "none",
  };

  return (
    <>
      <TopBar />

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 40px" }}>
        {adminReadOnly && (
          <div style={{ marginBottom: 20, padding: "12px 14px", border: "1px solid #E8E3DB", background: "#FAF8F4", color: "#8A8580", fontFamily: F, fontSize: 11, letterSpacing: "0.04em" }}>
            Admin preview mode (read-only)
          </div>
        )}
        {/* Header - Margiela Style */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 }}>
          <div>
            <span
              style={{
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#8A8A8A",
              }}
            >
              Profile
            </span>
            <h1
              style={{
                fontFamily: S,
                fontSize: 42,
                fontWeight: 300,
                color: "#1A1A1A",
                marginTop: 8,
                letterSpacing: "-0.01em",
              }}
            >
              Gallery Profile
            </h1>
            <p
              style={{
                fontFamily: F,
                fontSize: 12,
                color: "#8A8A8A",
                marginTop: 8,
                letterSpacing: "0.02em",
              }}
            >
              {session?.email}
            </p>
          </div>
          <div
            style={{
              padding: "8px 16px",
              border: "1px solid #1A1A1A",
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#1A1A1A",
            }}
          >
            Gallery
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#8A8A8A" }}>
            <span style={{ fontFamily: F, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Loading...
            </span>
          </div>
        ) : (
          <>
            {/* Profile Summary */}
            <Section number="01" title="Profile Summary">
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <ProfileImageUpload
                  currentImage={profile?.profileImage}
                  onUploaded={async () => {
                    await loadMe();
                  }}
                />
              </div>
              <h3
                style={{
                  fontFamily: S,
                  fontSize: 28,
                  fontWeight: 400,
                  color: "#1A1A1A",
                  marginBottom: 8,
                }}
              >
                {profile?.name?.trim() ? profile.name : "No name yet"}
              </h3>
              <p style={{ fontFamily: F, fontSize: 13, color: "#4A4A4A", marginBottom: 20 }}>
                {form.city || "-"}, {form.country || "-"}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {profile?.galleryId && <Tag>{profile.galleryId}</Tag>}
                {profile?.foundedYear && <Tag>{new Date().getFullYear() - profile.foundedYear + 1} years</Tag>}
                {session?.userId && <Tag>ID: {session.userId.slice(0, 12)}</Tag>}
              </div>
            </Section>

            {/* Edit Form */}
            <Section number="02" title="Edit Profile">
              <div style={{ display: "grid", gap: 20 }}>
                <Field label="Gallery ID">
                  <input value={form.galleryId} onChange={(e) => setForm((p) => ({ ...p, galleryId: e.target.value }))} placeholder="GAL-0001" style={inputStyle} />
                </Field>
                <Field label="Name">
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Gallery name" style={inputStyle} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <Field label="Country">
                    <input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} placeholder="e.g. United Kingdom" style={inputStyle} />
                  </Field>
                  <Field label="City">
                    <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="e.g. London" style={inputStyle} />
                  </Field>
                </div>
                <Field label="Address">
                  <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Gallery address" style={inputStyle} />
                </Field>
                <Field label="Founded Year">
                  <input value={form.foundedYear} onChange={(e) => setForm((p) => ({ ...p, foundedYear: e.target.value }))} placeholder="e.g. 2010" style={inputStyle} />
                </Field>
                <Field label="Instagram">
                  <input value={form.instagram} onChange={(e) => setForm((p) => ({ ...p, instagram: e.target.value }))} placeholder="@gallery" style={inputStyle} />
                </Field>
                <Field label="Website">
                  <input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://..." style={inputStyle} />
                </Field>
                <Field label="Bio">
                  <textarea value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} placeholder="Write gallery bio..." rows={5} style={{ ...inputStyle, resize: "vertical" }} />
                </Field>
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 16, alignItems: "center" }}>
                <button
                  onClick={onSave}
                  disabled={saveLoading}
                  style={{
                    padding: "14px 32px",
                    border: "1px solid #1A1A1A",
                    background: saveLoading ? "#E5E0DB" : "#1A1A1A",
                    color: saveLoading ? "#8A8A8A" : "#FFFFFF",
                    fontFamily: F,
                    fontSize: 10,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    cursor: saveLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {saveLoading ? "Saving..." : "Save Profile"}
                </button>
                {msg && <span style={{ fontFamily: F, fontSize: 12, color: msg.includes("success") ? "#3D5A3D" : "#8B3A3A" }}>{msg}</span>}
              </div>

              {profile?.updatedAt && (
                <p style={{ marginTop: 20, fontFamily: F, fontSize: 11, color: "#B0B0B0" }}>
                  Last updated: {new Date(profile.updatedAt).toLocaleString()}
                </p>
              )}
            </Section>

            {/* Exhibition History */}
            <Section number="03" title="Exhibition History">
              <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
                <Field label="Title">
                  <input value={exForm.title} onChange={(e) => setExForm((p) => ({ ...p, title: e.target.value }))} placeholder="Exhibition title" style={inputStyle} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Country">
                    <select value={exForm.country} onChange={(e) => setExForm((p) => ({ ...p, country: e.target.value }))} style={inputStyle}>
                      <option value="한국">Korea</option>
                      <option value="일본">Japan</option>
                      <option value="영국">UK</option>
                    </select>
                  </Field>
                  <Field label="City">
                    <input value={exForm.city} onChange={(e) => setExForm((p) => ({ ...p, city: e.target.value }))} placeholder="City" style={inputStyle} />
                  </Field>
                </div>
                <Field label="Year">
                  <input value={exForm.year} onChange={(e) => setExForm((p) => ({ ...p, year: e.target.value }))} placeholder="e.g. 2024" style={inputStyle} />
                </Field>
                <Field label="Summary">
                  <textarea value={exForm.summary} onChange={(e) => setExForm((p) => ({ ...p, summary: e.target.value }))} placeholder="Summary (optional)" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </Field>
              </div>

              <button
                onClick={addExhibition}
                style={{
                  padding: "14px 32px",
                  border: "1px solid #1A1A1A",
                  background: "#1A1A1A",
                  color: "#FFFFFF",
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  marginBottom: 16,
                }}
              >
                Add Exhibition
              </button>
              {exMsg && <p style={{ fontFamily: F, fontSize: 12, color: "#8B3A3A" }}>{exMsg}</p>}

              {exLoading ? (
                <p style={{ fontFamily: F, fontSize: 12, color: "#8A8A8A" }}>Loading...</p>
              ) : exhibitions.length === 0 ? (
                <p style={{ fontFamily: S, fontSize: 16, fontStyle: "italic", color: "#8A8A8A" }}>
                  No exhibitions yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 1, background: "#E5E0DB", marginTop: 24 }}>
                  {exhibitions.map((ex) => (
                    <div key={ex.id} style={{ padding: 24, background: "#FAF8F5" }}>
                      <h4 style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", marginBottom: 6 }}>
                        {ex.title}
                      </h4>
                      <p style={{ fontFamily: F, fontSize: 12, color: "#4A4A4A" }}>
                        {ex.city}, {ex.country} — {ex.year}
                      </p>
                      {ex.summary && (
                        <p style={{ fontFamily: F, fontSize: 12, color: "#8A8A8A", marginTop: 8 }}>
                          {ex.summary}
                        </p>
                      )}
                      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
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
                            padding: "8px 16px",
                            border: "1px solid #E5E0DB",
                            background: "transparent",
                            color: "#4A4A4A",
                            fontFamily: F,
                            fontSize: 10,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeExhibition(ex.id)}
                          style={{
                            padding: "8px 16px",
                            border: "1px solid #8B3A3A",
                            background: "transparent",
                            color: "#8B3A3A",
                            fontFamily: F,
                            fontSize: 10,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </main>
    </>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 20 }}>
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", color: "#B0B0B0" }}>{number}</span>
        <h2 style={{ fontFamily: S, fontSize: 24, fontWeight: 400, color: "#1A1A1A" }}>{title}</h2>
      </div>
      <div style={{ border: "1px solid #E5E0DB", padding: 32, background: "#FFFFFF" }}>{children}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        padding: "8px 14px",
        border: "1px solid #E5E0DB",
        background: "transparent",
        color: "#4A4A4A",
        fontFamily: F,
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontFamily: F,
          fontSize: 10,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#8A8A8A",
          marginBottom: 10,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
