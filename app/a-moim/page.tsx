import type { Metadata } from "next";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { F, S, colors } from "@/lib/design";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "A모임 기획 가이드 PDF — ROB",
  description: "작품보다 활동을 지속하는 사람들의 모임. A모임 기획·운영·ROB 연동 요약 PDF 다운로드.",
  path: "/a-moim",
});

const PDF_PATH = "/api/a-moim/planning-guide";

export default function AMoimGuidePage() {
  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "56px 24px 96px", minHeight: "100vh", textAlign: "center" }}>
        <p style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.accent, margin: "0 0 10px" }}>
          A모임 · 기획 문서
        </p>
        <h1 style={{ fontFamily: S, fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 400, color: colors.textPrimary, lineHeight: 1.25, margin: "0 0 16px" }}>
          A모임 기획 가이드
        </h1>
        <p style={{ fontFamily: F, fontSize: 14, color: colors.textSecondary, lineHeight: 1.75, margin: "0 0 32px" }}>
          「작품보다 활동을 지속하는 사람들의 모임」— 정의, 시그니처 의례, 코어/손님 경계, ROB 연동, 90분 러닝오더를 담은 PDF입니다.
        </p>

        <a
          href={PDF_PATH}
          download="A모임-기획-가이드-ROB.pdf"
          style={{
            display: "inline-block",
            padding: "14px 32px",
            background: colors.textPrimary,
            color: colors.bgPrimary,
            fontFamily: F,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          PDF 다운로드
        </a>

        <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, margin: "0 0 24px" }}>
          <a href={`${PDF_PATH}?inline=1`} target="_blank" rel="noopener noreferrer" style={{ color: colors.accent, textDecoration: "none" }}>
            브라우저에서 열기 →
          </a>
        </p>

        <Link href="/" style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, textDecoration: "none" }}>
          ← 홈으로
        </Link>
      </main>
    </>
  );
}
