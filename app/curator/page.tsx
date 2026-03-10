"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { F, S } from "@/lib/design";

type Session = { userId: string; role: string; email?: string };
type Profile = {
  id: string;
  name: string;
  curatorId: string;
  curatorType: "independent" | "institutional";
  organization?: string;
  instagram?: string;
  country?: string;
  city?: string;
  website?: string;
  bio?: string;
};

export default function CuratorPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const tr = (en: string, ko: string) => lang === "ko" ? ko : en;

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me?lite=1", { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      const role = data?.session?.role;
      if (!role) { router.replace("/login?role=curator"); return; }
      if (role !== "curator") { router.replace(role === "artist" ? "/artist" : "/gallery"); return; }
      setSession(data.session);
      setProfile(data.profile ?? null);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 900, margin: "80px auto", padding: "0 40px" }}>
          <div style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>Loading...</div>
        </main>
      </>
    );
  }

  const typeLabel =
    profile?.curatorType === "institutional"
      ? tr("Institutional Curator", "기관 큐레이터")
      : tr("Independent Curator", "독립 큐레이터");

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 56 }}>
          <div>
            <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
              {tr("Curator Dashboard", "큐레이터 대시보드")}
            </span>
            <h1 style={{ fontFamily: S, fontSize: 42, fontWeight: 300, color: "#1A1A1A", marginTop: 8, letterSpacing: "-0.01em" }}>
              {profile?.name ?? session?.email ?? "Curator"}
            </h1>
            <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 8 }}>
              {typeLabel}
              {profile?.organization ? ` · ${profile.organization}` : ""}
              {profile?.country ? ` · ${profile.country}` : ""}
            </p>
          </div>
          <Link
            href="/curator/profile"
            style={{ padding: "10px 20px", border: "1px solid #1A1A1A", background: "transparent", color: "#1A1A1A", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1A1A1A"; e.currentTarget.style.color = "#FDFBF7"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1A1A1A"; }}
          >
            {tr("Edit Profile", "프로필 편집")}
          </Link>
        </div>

        {/* Profile Info */}
        <Section number="01" title={tr("My Profile", "내 프로필")}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <InfoRow label={tr("Curator ID", "큐레이터 ID")} value={profile?.curatorId ?? "-"} />
            <InfoRow label={tr("Type", "유형")} value={typeLabel} />
            {profile?.organization && <InfoRow label={tr("Organization", "소속 기관")} value={profile.organization} />}
            {profile?.city && <InfoRow label={tr("Location", "위치")} value={[profile.city, profile.country].filter(Boolean).join(", ")} />}
            {profile?.instagram && <InfoRow label="Instagram" value={`@${profile.instagram.replace(/^@/, "")}`} />}
            {profile?.website && (
              <InfoRow label={tr("Website", "웹사이트")} value={
                <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: "#8B7355", textDecoration: "underline" }}>{profile.website}</a>
              } />
            )}
          </div>
          {profile?.bio && (
            <p style={{ fontFamily: F, fontSize: 13, color: "#4A4A4A", lineHeight: 1.7, marginTop: 20, paddingTop: 20, borderTop: "1px solid #E8E3DB" }}>
              {profile.bio}
            </p>
          )}
        </Section>

        {/* Explore */}
        <Section number="02" title={tr("Explore", "탐색")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "#E8E3DB" }}>
            <NavCard
              href="/artists"
              title={tr("Artists", "작가 탐색")}
              desc={tr("Browse global artist portfolios", "전 세계 작가 포트폴리오 탐색")}
            />
            <NavCard
              href="/open-calls"
              title={tr("Open Calls", "오픈콜")}
              desc={tr("Discover open calls from galleries", "갤러리 오픈콜 탐색")}
            />
            <NavCard
              href="/community"
              title={tr("Community", "커뮤니티")}
              desc={tr("Connect with artists and galleries", "작가·갤러리와 소통")}
            />
          </div>
        </Section>

        {/* Account */}
        <Section number="03" title={tr("Account", "계정")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580" }}>
              {tr("Email", "이메일")}: {session?.email ?? "-"}
            </p>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
              }}
              style={{ alignSelf: "flex-start", padding: "10px 20px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              {tr("Sign Out", "로그아웃")}
            </button>
          </div>
        </Section>
      </main>

      <style jsx global>{`
        @media (max-width: 768px) {
          main { padding: 32px 20px !important; }
        }
      `}</style>
    </>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 20 }}>
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", color: "#B0AAA2" }}>{number}</span>
        <h2 style={{ fontFamily: S, fontSize: 24, fontWeight: 400, color: "#1A1A1A" }}>{title}</h2>
      </div>
      <div style={{ border: "1px solid #E8E3DB", padding: 28, background: "#FFFFFF" }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "#B0AAA2", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: F, fontSize: 13, color: "#1A1A1A" }}>{value}</div>
    </div>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{ padding: 24, background: "#FFFFFF", transition: "background 0.2s" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#FAF8F4"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#FFFFFF"; }}
      >
        <div style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", marginBottom: 8 }}>{title}</div>
        <div style={{ fontFamily: F, fontSize: 11, color: "#8A8580", lineHeight: 1.6 }}>{desc}</div>
      </div>
    </Link>
  );
}
