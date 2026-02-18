"use client";

import { useEffect, useState } from "react";
import TopBar from "@/app/components/TopBar";
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

export default function AboutPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [content, setContent] = useState<AboutContent | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/about", { cache: "default" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.content) throw new Error(data?.error || "failed to load about");
        setContent(data.content as AboutContent);
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 72px" }}>
        {loading ? (
          <CardSkeleton count={4} />
        ) : err ? (
          <div
            style={{
              border: "1px solid #E8E3DB",
              background: "#FFFFFF",
              padding: 20,
              color: "#8B3A3A",
              fontFamily: F,
              fontSize: 13,
            }}
          >
            {err}
          </div>
        ) : content ? (
          <>
            <section style={{ marginBottom: 32 }}>
              <div
                style={{
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#8B7355",
                  marginBottom: 12,
                }}
              >
                Platform
              </div>
              <h1 style={{ fontFamily: S, fontSize: "clamp(36px, 8vw, 54px)", fontWeight: 300, margin: 0 }}>
                {content.title}
              </h1>
              <p
                style={{
                  marginTop: 16,
                  color: "#6F6A64",
                  fontFamily: F,
                  fontSize: 14,
                  lineHeight: 1.8,
                  maxWidth: 760,
                }}
              >
                {content.subtitle}
              </p>
            </section>

            <section
              style={{
                border: "1px solid #E8E3DB",
                background: "#FFFFFF",
                padding: "24px clamp(18px, 3vw, 34px)",
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontFamily: S, fontSize: 28, fontWeight: 300, margin: "0 0 12px" }}>Our Story</h2>
              <p style={{ margin: 0, fontFamily: F, fontSize: 14, color: "#4A4A4A", lineHeight: 1.9 }}>
                {content.story}
              </p>
            </section>

            <section
              style={{
                border: "1px solid #E8E3DB",
                background: "#FFFFFF",
                padding: "24px clamp(18px, 3vw, 34px)",
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontFamily: S, fontSize: 28, fontWeight: 300, margin: "0 0 12px" }}>Mission</h2>
              <p style={{ margin: 0, fontFamily: F, fontSize: 14, color: "#4A4A4A", lineHeight: 1.9 }}>
                {content.mission}
              </p>
            </section>

            <section
              style={{
                border: "1px solid #E8E3DB",
                background: "#FFFFFF",
                padding: "24px clamp(18px, 3vw, 34px)",
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: 20,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  border: "1px solid #E8E3DB",
                  background: "#F7F3ED",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {content.founderImageUrl ? (
                  <img
                    src={content.founderImageUrl}
                    alt="Founder"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontFamily: F, fontSize: 10, color: "#A39B92", letterSpacing: "0.08em" }}>
                    FOUNDER
                  </span>
                )}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: F,
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#8B7355",
                    marginBottom: 8,
                  }}
                >
                  Founder
                </div>
                <div style={{ fontFamily: S, fontSize: 30, fontWeight: 300, color: "#1A1A1A" }}>
                  {content.founderName}
                </div>
                <div style={{ marginTop: 6 }}>
                  <a
                    href={`https://instagram.com/${content.founderInstagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontFamily: F, fontSize: 13, color: "#8B7355", textDecoration: "underline" }}
                  >
                    {content.founderInstagram || "@1wh13"}
                  </a>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}

