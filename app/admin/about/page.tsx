"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { CardSkeleton } from "@/app/components/Skeleton";
import { F, S } from "@/lib/design";

type AboutContent = {
  title: string;
  subtitle: string;
  story: string;
  mission: string;
  founderName: string;
  founderInstagram: string;
  founderImageUrl: string;
  updatedAt?: number;
};

export default function AdminAboutPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [content, setContent] = useState<AboutContent>({
    title: "",
    subtitle: "",
    story: "",
    mission: "",
    founderName: "",
    founderInstagram: "@noas_no_art_special",
    founderImageUrl: "",
  });

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

        const res = await fetch("/api/admin/about", { cache: "no-store", credentials: "include" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.content) throw new Error(data?.error || "failed to load");
        setContent(data.content as AboutContent);
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function save() {
    setSaving(true);
    setErr(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/admin/about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(content),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "save failed");
      setContent(data.content as AboutContent);
      setOkMsg("Saved successfully.");
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof AboutContent>(key: K, value: AboutContent[K]) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "40px" }}>
        <div style={{ marginBottom: 24 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8B7355",
            }}
          >
            Admin
          </span>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
            About Page Editor
          </h1>
        </div>

        {authenticated === null || loading ? (
          <CardSkeleton count={4} />
        ) : (
          <div
            style={{
              border: "1px solid #E8E3DB",
              background: "#FFFFFF",
              padding: "22px clamp(16px, 3vw, 30px)",
              display: "grid",
              gap: 14,
            }}
          >
            <Field label="Title">
              <input value={content.title} onChange={(e) => update("title", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Subtitle">
              <textarea
                value={content.subtitle}
                onChange={(e) => update("subtitle", e.target.value)}
                style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
              />
            </Field>
            <Field label="Our Story">
              <textarea
                value={content.story}
                onChange={(e) => update("story", e.target.value)}
                style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
              />
            </Field>
            <Field label="Mission">
              <textarea
                value={content.mission}
                onChange={(e) => update("mission", e.target.value)}
                style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Founder Name">
                <input
                  value={content.founderName}
                  onChange={(e) => update("founderName", e.target.value)}
                  style={inputStyle}
                />
              </Field>
              <Field label="Founder Instagram">
                <input
                  value={content.founderInstagram}
                  onChange={(e) => update("founderInstagram", e.target.value)}
                  placeholder="@noas_no_art_special"
                  style={inputStyle}
                />
              </Field>
            </div>
            <Field label="Founder Image URL (or data URI)">
              <input
                value={content.founderImageUrl}
                onChange={(e) => update("founderImageUrl", e.target.value)}
                placeholder="https://... or data:image/..."
                style={inputStyle}
              />
            </Field>

            {content.founderImageUrl ? (
              <div style={{ marginTop: 2 }}>
                <img
                  src={content.founderImageUrl}
                  alt="Founder preview"
                  style={{ width: 140, height: 140, objectFit: "cover", border: "1px solid #E8E3DB" }}
                />
              </div>
            ) : null}

            {err ? (
              <div
                style={{
                  marginTop: 2,
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
            {okMsg ? (
              <div
                style={{
                  marginTop: 2,
                  border: "1px solid #D5E6CF",
                  background: "#F7FCF5",
                  color: "#48633E",
                  fontFamily: F,
                  fontSize: 12,
                  padding: "10px 12px",
                }}
              >
                {okMsg}
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <div style={{ fontFamily: F, fontSize: 11, color: "#8A8580" }}>
                {content.updatedAt ? `Last updated: ${new Date(content.updatedAt).toLocaleString()}` : "Not saved yet"}
              </div>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  padding: "11px 22px",
                  border: "1px solid #1A1A1A",
                  background: "#1A1A1A",
                  color: "#FFFFFF",
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save About"}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span
        style={{
          fontFamily: F,
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#8A8580",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  border: "1px solid #E8E3DB",
  background: "#FFFFFF",
  color: "#1A1A1A",
  padding: "10px 12px",
  fontFamily: F,
  fontSize: 12,
  lineHeight: 1.6,
  outline: "none",
} as const;

