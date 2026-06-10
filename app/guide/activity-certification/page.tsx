import type { Metadata } from "next";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { F, S, colors } from "@/lib/design";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "예술활동증명 신청 가이드 — 증빙자료 준비부터 신청까지 | ROB",
  description:
    "한국예술인복지재단 예술활동증명 신청 절차와 필요한 증빙자료를 정리했습니다. ROB에 기록한 전시·수상·레지던시 활동을 리포트로 내보내 신청 증빙 준비 시간을 줄여보세요.",
  path: "/guide/activity-certification",
  type: "article",
});

const h2: React.CSSProperties = { fontFamily: S, fontSize: 26, fontWeight: 400, color: colors.textPrimary, margin: "48px 0 16px" };
const p: React.CSSProperties = { fontFamily: F, fontSize: 14, color: colors.textSecondary, lineHeight: 1.85, margin: "0 0 14px" };
const li: React.CSSProperties = { fontFamily: F, fontSize: 14, color: colors.textSecondary, lineHeight: 1.85, marginBottom: 8 };

export default function ActivityCertificationGuidePage() {
  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 96px", minHeight: "100vh" }}>
        <p style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.accent, margin: "0 0 10px" }}>
          Guide · 한국 예술인
        </p>
        <h1 style={{ fontFamily: S, fontSize: "clamp(30px,5.5vw,46px)", fontWeight: 400, color: colors.textPrimary, lineHeight: 1.2, margin: "0 0 18px" }}>
          예술활동증명 신청 가이드
        </h1>
        <p style={p}>
          예술활동증명은 「예술인 복지법」에 따라 <strong>한국예술인복지재단</strong>이 확인하는
          제도로, 창작준비금·예술인 산재보험 등 정부 지원 사업에 참여하기 위한 기본 요건입니다.
          신청과 심사는 재단을 통해서만 이루어지며, 예술인은 일정 기간의 공표된 예술 활동 또는
          예술 활동 수입을 증빙해야 합니다.
        </p>

        <div style={{ padding: "18px 20px", background: colors.bgAccent, border: `1px solid ${colors.border}`, margin: "8px 0 8px" }}>
          <p style={{ ...p, margin: 0, fontSize: 13 }}>
            ROB는 예술활동증명을 발급하는 기관이 아닙니다. ROB는 전시·수상·레지던시 등 활동
            기록을 한곳에 정리하고, 신청에 참고할 수 있는 <strong>활동 기록 리포트</strong>를
            제공하는 기록 도구입니다.
          </p>
        </div>

        <h2 style={h2}>1. 어디서 신청하나요?</h2>
        <p style={p}>
          신청은 한국예술인복지재단 예술활동증명 시스템에서 온라인으로 진행합니다.
          재단 공식 홈페이지(
          <a href="https://www.kawf.kr" target="_blank" rel="noopener noreferrer" style={{ color: colors.accent }}>
            kawf.kr
          </a>
          )에서 예술활동증명 메뉴를 확인하세요. 분야(미술·문학·음악 등)와 신청 유형(공표된
          예술 활동 / 예술 활동 수입)에 따라 기준이 다릅니다.
        </p>

        <h2 style={h2}>2. 어떤 증빙이 필요한가요? (미술 분야 예시)</h2>
        <ul style={{ paddingLeft: 20, margin: "0 0 14px" }}>
          <li style={li}>전시 참여를 확인할 수 있는 자료 — 도록, 리플릿, 포스터, 초대장, 전시 전경 사진 등</li>
          <li style={li}>전시 기간·장소·주최·참여 작가가 확인되는 객관적 자료 — 기관 홈페이지, 보도자료, 기사</li>
          <li style={li}>수입 기준으로 신청하는 경우 — 작품 판매·원고료·강연료 등 예술 활동 수입 증빙</li>
        </ul>
        <p style={p}>
          실제 요건과 인정 범위는 재단 공고 기준이 우선합니다. 신청 전 반드시 재단의 최신
          안내를 확인하세요.
        </p>

        <h2 style={h2}>3. 증빙 준비, 왜 힘든가요?</h2>
        <p style={p}>
          대부분의 작가에게 가장 큰 장벽은 심사가 아니라 <strong>흩어진 기록을 모으는 일</strong>입니다.
          몇 년 전 전시의 리플릿, 인스타그램에만 남은 전시 전경, 메일함 속 참여 확정 메일을
          신청 시점에 한꺼번에 찾으려면 시간이 오래 걸립니다.
        </p>

        <h2 style={h2}>4. ROB로 준비 시간 줄이기</h2>
        <ul style={{ paddingLeft: 20, margin: "0 0 14px" }}>
          <li style={li}>전시·수상·레지던시·출판 등 활동을 발생할 때마다 ROB에 기록해 두세요.</li>
          <li style={li}>
            공개 프로필의 <strong>활동 기록 리포트</strong> 페이지에서 기록 전체를 표 형식으로 정리해
            인쇄하거나 PDF로 저장할 수 있습니다.
          </li>
          <li style={li}>
            리포트는 활동의 일자·장소·주최를 한눈에 보여주는 정리 자료로, 증빙 원본(도록·기사 등)과
            함께 보조 자료로 활용할 수 있습니다.
          </li>
        </ul>
        <p style={p}>
          ROB 계정이 있다면 내 공개 프로필 주소 뒤에 <code style={{ fontFamily: F, fontSize: 12, background: colors.bgAccent, padding: "2px 6px" }}>/report</code>를
          붙여 바로 확인할 수 있습니다.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
          <Link
            href="/login"
            style={{ padding: "14px 28px", background: colors.textPrimary, color: colors.bgPrimary, fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}
          >
            활동 기록 시작하기
          </Link>
          <a
            href="https://www.kawf.kr"
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: "14px 28px", border: `1px solid ${colors.border}`, color: colors.textSecondary, fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}
          >
            한국예술인복지재단 바로가기
          </a>
        </div>

        <p style={{ ...p, fontSize: 11, color: colors.textLight, marginTop: 48 }}>
          본 가이드는 일반적인 안내이며, 예술활동증명의 신청 요건·인정 기준·발급은 전적으로
          한국예술인복지재단의 심사에 따릅니다. ROB가 제공하는 리포트는 공식 증명서가 아닙니다.
        </p>
      </main>
    </>
  );
}
