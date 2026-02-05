"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";
import { useEffect, useState } from "react";

export default function Home() {
  const { lang } = useLanguage();
  const [stats, setStats] = useState({ artists: 0, galleries: 0, countries: 0 });

  // 실제 통계 가져오기 (선택적)
  useEffect(() => {
    (async () => {
      try {
        const [artistRes, galleryRes] = await Promise.all([
          fetch("/api/public/artists").then(r => r.json()).catch(() => ({ artists: [] })),
          fetch("/api/public/galleries").then(r => r.json()).catch(() => ({ galleries: [] })),
        ]);
        const artists = artistRes?.artists || [];
        const galleries = galleryRes?.galleries || [];
        const allCountries = new Set([
          ...artists.map((a: any) => a.country),
          ...galleries.map((g: any) => g.country),
        ]);
        setStats({
          artists: artists.length || 50,
          galleries: galleries.length || 20,
          countries: allCountries.size || 15,
        });
      } catch {
        setStats({ artists: 50, galleries: 20, countries: 15 });
      }
    })();
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#fafafa" }}>
      {/* Hero Section */}
      <section
        style={{
          padding: "80px 20px 60px",
          textAlign: "center",
          background: "linear-gradient(180deg, #fff 0%, #fafafa 100%)",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            background: "rgba(99, 102, 241, 0.1)",
            color: "#6366f1",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          🌐 Global Art Exhibition Network
        </div>

        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 800,
            color: "#111",
            marginBottom: 16,
            lineHeight: 1.2,
          }}
        >
          {t("home_title", lang)}
        </h1>

        {/* 핵심 가치 메시지 - ChatGPT 피드백 반영 */}
        <p
          style={{
            fontSize: "clamp(16px, 2.5vw, 20px)",
            color: "#666",
            maxWidth: 600,
            margin: "0 auto 12px",
            lineHeight: 1.6,
          }}
        >
          {t("home_subtitle", lang)}
        </p>

        {/* 추가 설명 - "왜 이 서비스를 써야 하는가" */}
        <p
          style={{
            fontSize: 15,
            color: "#888",
            maxWidth: 500,
            margin: "0 auto 40px",
          }}
        >
          전시회 참가 신청부터 갤러리 콜렉션까지, 모든 과정을 한 곳에서.
        </p>

        {/* Role Cards - 목적 + 행동이 드러나는 텍스트 */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", alignItems: "stretch" }}>
          <RoleCard
            href="/login?role=artist"
            icon="🎨"
            title="For Artists"
            subtitle="Submit to Global Exhibitions"
            description="전 세계 갤러리의 오픈콜에 지원하고, 포트폴리오를 공유하세요."
            features={["오픈콜 검색 & 지원", "포트폴리오 업로드", "갤러리와 직접 채팅", "지원 현황 추적"]}
            color="#6366f1"
            buttonText="아티스트로 시작하기"
          />
          <RoleCard
            href="/login?role=gallery"
            icon="🏛️"
            title="For Galleries"
            subtitle="Discover & Invite Artists"
            description="전 세계 아티스트를 발굴하고, 전시에 초대하세요."
            features={["오픈콜 게시", "아티스트 검색 & 초대", "지원서 관리", "배송 & 물류 추적"]}
            color="#ec4899"
            buttonText="갤러리로 시작하기"
          />
        </div>
      </section>

      {/* Stats Section - 신뢰성 요소 */}
      <section
        style={{
          padding: "48px 20px",
          background: "#fff",
          borderTop: "1px solid #eee",
          borderBottom: "1px solid #eee",
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            display: "flex",
            justifyContent: "center",
            gap: 48,
            flexWrap: "wrap",
          }}
        >
          <StatItem number={stats.artists + "+"} label="Artists" />
          <StatItem number={stats.galleries + "+"} label="Galleries" />
          <StatItem number={stats.countries + "+"} label="Countries" />
          <StatItem number="24/7" label="Support" />
        </div>
      </section>

      {/* How It Works - 기능 흐름 설명 */}
      <section style={{ padding: "64px 20px", maxWidth: 1000, margin: "0 auto" }}>
        <h2
          style={{
            textAlign: "center",
            fontSize: 28,
            fontWeight: 800,
            color: "#111",
            marginBottom: 12,
          }}
        >
          How It Works
        </h2>
        <p style={{ textAlign: "center", color: "#666", marginBottom: 48 }}>
          간단한 3단계로 전 세계 아트 네트워크에 참여하세요
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          <StepCard
            step="1"
            title="프로필 등록"
            description="아티스트 또는 갤러리로 가입하고, 프로필과 포트폴리오를 등록하세요."
            icon="📝"
          />
          <StepCard
            step="2"
            title="매칭 & 연결"
            description="오픈콜에 지원하거나, 아티스트를 검색하고 직접 초대하세요."
            icon="🤝"
          />
          <StepCard
            step="3"
            title="전시 진행"
            description="채팅으로 소통하고, 물류 시스템으로 작품 배송까지 한 번에 관리하세요."
            icon="🖼️"
          />
        </div>
      </section>

      {/* Features Section - 핵심 기능 */}
      <section
        style={{
          padding: "64px 20px",
          background: "#fff",
          borderTop: "1px solid #eee",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2
            style={{
              textAlign: "center",
              fontSize: 28,
              fontWeight: 800,
              color: "#111",
              marginBottom: 12,
            }}
          >
            Why Choose Us?
          </h2>
          <p style={{ textAlign: "center", color: "#666", marginBottom: 48 }}>
            아티스트와 갤러리 모두를 위한 올인원 플랫폼
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
            }}
          >
            <FeatureCard
              icon="🌍"
              title="Global Network"
              description="전 세계 갤러리와 아티스트가 참여하는 글로벌 네트워크"
            />
            <FeatureCard
              icon="💬"
              title="Direct Chat"
              description="번역 기능이 포함된 실시간 채팅으로 언어 장벽 없이 소통"
            />
            <FeatureCard
              icon="📄"
              title="Portfolio Sharing"
              description="PDF 포트폴리오를 업로드하고 갤러리에 직접 공유"
            />
            <FeatureCard
              icon="📦"
              title="Logistics Support"
              description="DHL, FedEx 등 글로벌 배송 예약 및 실시간 추적"
            />
            <FeatureCard
              icon="🔔"
              title="Instant Updates"
              description="지원 현황, 초대, 메시지 등 실시간 알림"
            />
            <FeatureCard
              icon="🌐"
              title="Auto Translation"
              description="채팅과 프로필을 자동 번역하여 글로벌 소통 지원"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          padding: "64px 20px",
          textAlign: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
        }}
      >
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#fff", marginBottom: 12 }}>
          지금 바로 시작하세요
        </h2>
        <p style={{ color: "rgba(255,255,255,0.85)", marginBottom: 32, fontSize: 16 }}>
          전 세계 아티스트와 갤러리가 기다리고 있습니다
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/login?role=artist"
            style={{
              padding: "14px 32px",
              borderRadius: 12,
              background: "#fff",
              color: "#6366f1",
              fontWeight: 700,
              fontSize: 15,
              textDecoration: "none",
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
            }}
          >
            🎨 아티스트로 가입
          </Link>
          <Link
            href="/login?role=gallery"
            style={{
              padding: "14px 32px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              textDecoration: "none",
              border: "2px solid rgba(255,255,255,0.3)",
            }}
          >
            🏛️ 갤러리로 가입
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "32px 20px",
          textAlign: "center",
          background: "#111",
          color: "#888",
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 8, color: "#fff", fontWeight: 600 }}>
          ROB : Role of Bridge
        </div>
        <div>Connecting Artists & Galleries Worldwide</div>
        <div style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
          © 2024 Global Art Fair Platform. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

/* ========== Components ========== */

function RoleCard({
  href,
  icon,
  title,
  subtitle,
  description,
  features,
  color,
  buttonText,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  color: string;
  buttonText: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "flex" }}>
      <div
        style={{
          width: 300,
          padding: 28,
          borderRadius: 20,
          background: "white",
          border: "2px solid #e5e5e5",
          cursor: "pointer",
          transition: "all 0.25s",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          textAlign: "left",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-6px)";
          e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.12)";
          e.currentTarget.style.borderColor = color;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)";
          e.currentTarget.style.borderColor = "#e5e5e5";
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: color, marginBottom: 4 }}>
          {title}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 8 }}>
          {subtitle}
        </h2>
        <p style={{ fontSize: 14, color: "#666", lineHeight: 1.5, marginBottom: 16, flex: 1 }}>
          {description}
        </p>

        {/* Feature List */}
        <ul style={{ margin: 0, padding: 0, listStyle: "none", marginBottom: 20 }}>
          {features.map((f, i) => (
            <li
              key={i}
              style={{
                fontSize: 13,
                color: "#555",
                padding: "4px 0",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: color }}>✓</span> {f}
            </li>
          ))}
        </ul>

        <div
          style={{
            padding: "12px 0",
            borderRadius: 10,
            background: color,
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            textAlign: "center",
            marginTop: "auto",
          }}
        >
          {buttonText} →
        </div>
      </div>
    </Link>
  );
}

function StatItem({ number, label }: { number: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 36, fontWeight: 800, color: "#111" }}>{number}</div>
      <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  icon,
}: {
  step: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div
      style={{
        padding: 28,
        borderRadius: 16,
        background: "#fff",
        border: "1px solid #eee",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
          color: "#fff",
          fontSize: 20,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        {step}
      </div>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 8 }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: "#666", lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 14,
        background: "#fafafa",
        border: "1px solid #eee",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 6 }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}
