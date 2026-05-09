"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { F, S } from "@/lib/design";

type GuideRole = "artist" | "gallery" | "curator";

const ROLE_ORDER: GuideRole[] = ["artist", "gallery", "curator"];

export default function GuidePage() {
  const { lang } = useLanguage();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<GuideRole>("artist");

  useEffect(() => {
    const raw = String(searchParams.get("role") || "").trim().toLowerCase();
    if (raw === "artist" || raw === "gallery" || raw === "curator") {
      setRole(raw);
    }
  }, [searchParams]);

  const roleLabel = (r: GuideRole) => {
    if (r === "artist") return lang === "ko" ? "아티스트" : "Artist";
    if (r === "gallery") return lang === "ko" ? "갤러리" : "Gallery";
    return lang === "ko" ? "큐레이터" : "Curator";
  };

  const guide = useMemo(() => {
    if (role === "artist") {
      return {
        title:
          lang === "ko"
            ? "아티스트 시작 가이드 (활동 증명 중심)"
            : "Artist Guide (Activity Evidence First)",
        quick: [
          lang === "ko" ? "기본 프로필 완성" : "Complete your basic profile",
          lang === "ko" ? "작업 시리즈 1개 등록" : "Create your first series",
          lang === "ko" ? "포트폴리오 1건 업로드" : "Upload one portfolio PDF",
          lang === "ko" ? "작업 노트/활동 타임라인 보강" : "Add work note or timeline entries",
        ],
        links: [
          { href: "/artist/me?tab=profile", label: lang === "ko" ? "내 페이지" : "My Page" },
          { href: "/artist/me?tab=works", label: lang === "ko" ? "작업 관리" : "Manage Works" },
          { href: "/open-calls", label: lang === "ko" ? "오픈콜 탐색" : "Browse Open Calls" },
        ],
      };
    }
    if (role === "gallery") {
      return {
        title: lang === "ko" ? "갤러리 운영 가이드" : "Gallery Guide",
        quick: [
          lang === "ko" ? "갤러리 프로필/웹사이트 정리" : "Complete gallery profile and website",
          lang === "ko" ? "오픈콜 등록 및 마감일 점검" : "Publish open calls with clear deadlines",
          lang === "ko" ? "지원자 확인 및 커뮤니케이션" : "Review applicants and communicate quickly",
          lang === "ko" ? "아웃리치 대상/메일 관리" : "Manage outreach targets and follow-ups",
        ],
        links: [
          { href: "/gallery/me", label: lang === "ko" ? "내 페이지" : "My Page" },
          { href: "/gallery", label: lang === "ko" ? "오픈콜 관리" : "Open Call Management" },
          { href: "/admin/outreach", label: lang === "ko" ? "아웃리치" : "Outreach" },
        ],
      };
    }
    return {
      title: lang === "ko" ? "큐레이터 협업 가이드" : "Curator Guide",
      quick: [
        lang === "ko" ? "프로필 및 전문영역 명확화" : "Clarify profile and specialization",
        lang === "ko" ? "아티스트/공간 탐색 및 저장" : "Explore and shortlist artists/spaces",
        lang === "ko" ? "프로젝트 협업 제안 템플릿 준비" : "Prepare a collaboration proposal template",
        lang === "ko" ? "레퍼런스 링크로 신뢰도 강화" : "Improve trust with reference links",
      ],
      links: [
        { href: "/curator", label: lang === "ko" ? "큐레이터 페이지" : "Curator Page" },
        { href: "/artists", label: lang === "ko" ? "아티스트 탐색" : "Explore Artists" },
        { href: "/spaces", label: lang === "ko" ? "공간 탐색" : "Explore Spaces" },
      ],
    };
  }, [lang, role]);

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "42px 24px 64px" }}>
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#8B7355",
            }}
          >
            {lang === "ko" ? "사용 안내서" : "Platform Guide"}
          </div>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 400, color: "#1A1A1A", margin: "8px 0 0" }}>
            {lang === "ko" ? "역할별 사용 가이드" : "Role-based Guides"}
          </h1>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {ROLE_ORDER.map((r) => {
            const active = role === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  padding: "9px 14px",
                  border: active ? "1px solid #1A1A1A" : "1px solid #E8E3DB",
                  background: active ? "#1A1A1A" : "#FFFFFF",
                  color: active ? "#FDFBF7" : "#4A4540",
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {roleLabel(r)}
              </button>
            );
          })}
        </div>

        <section style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: 18 }}>
          <h2 style={{ margin: 0, fontFamily: S, fontSize: 24, color: "#1A1A1A", fontWeight: 400 }}>{guide.title}</h2>

          <div style={{ marginTop: 14, borderTop: "1px solid #F0EBE3" }}>
            {guide.quick.map((item, i) => (
              <div key={item} style={{ padding: "12px 0", borderBottom: "1px solid #F0EBE3", fontFamily: F, fontSize: 12, color: "#4A4540" }}>
                {i + 1}. {item}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {guide.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #E8E3DB",
                  background: "#FAF8F4",
                  color: "#8B7355",
                  textDecoration: "none",
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

