"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";

type GalleryProfile = {
  id: string;
  userId: string;
  role: "gallery";
  email: string;
  name: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  createdAt: number;
  updatedAt: number;
};

export default function GalleryPublicPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GalleryProfile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setErr(null);

    fetch(`/api/public/gallery/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error ?? "not found");
        setProfile(data.profile);
      })
      .catch(() => setErr("Gallery profile not found"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 860, margin: "30px auto", padding: "0 12px" }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: "8px 10px",
            borderRadius: 999,
            border: "1px solid #ddd",
            background: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        {loading ? (
          <div style={{ padding: 14, opacity: 0.7 }}>Loading…</div>
        ) : err ? (
          <div style={{ padding: 14, color: "#c00" }}>{err}</div>
        ) : !profile ? null : (
          <div
            style={{
              marginTop: 14,
              border: "1px solid #e6e6e6",
              borderRadius: 18,
              background: "#fff",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>🏛️ Gallery</div>
                <div style={{ fontWeight: 900, fontSize: 26, letterSpacing: -0.4 }}>
                  {profile.name}
                </div>
                <div style={{ marginTop: 6, opacity: 0.75 }}>
                  📍 {profile.city}, {profile.country}
                </div>
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, textAlign: "right" }}>
                <div>id: {profile.userId}</div>
                <div>updated: {new Date(profile.updatedAt).toLocaleString()}</div>
              </div>
            </div>

            <hr style={{ margin: "14px 0" }} />

            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Bio</div>
            <div
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 14,
                background: "#fafafa",
                border: "1px solid #eee",
                whiteSpace: "pre-wrap",
              }}
            >
              {profile.bio?.trim() ? profile.bio : "No bio yet."}
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Website</div>
              {profile.website ? (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-block", marginTop: 8, fontWeight: 900 }}
                >
                  🔗 {profile.website}
                </a>
              ) : (
                <div style={{ marginTop: 8, opacity: 0.7 }}>No website</div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
