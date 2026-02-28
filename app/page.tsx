"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";
import { useMemo } from "react";
import { useFetch } from "@/lib/useFetch";
import { F, S } from "@/lib/design";

export default function Home() {
  const { lang } = useLanguage();
  // SWR-based: warms cache for /artists and /galleries pages too
  const { data: artistData } = useFetch<{ artists: any[] }>("/api/public/artists", { revalidateOnFocus: false });
  const { data: galleryData } = useFetch<{ galleries: any[] }>("/api/public/galleries", { revalidateOnFocus: false });

  const stats = useMemo(() => {
    const artists = artistData?.artists || [];
    const galleries = galleryData?.galleries || [];
    const allCountries = new Set([...artists.map((a: any) => a.country), ...galleries.map((g: any) => g.country)]);
    return {
      artists: artists.length || 50,
      galleries: galleries.length || 20,
      countries: allCountries.size || 15,
    };
  }, [artistData, galleryData]);

  return (
    <main style={{ minHeight: "100vh", background: "#FDFBF7" }}>
      {/* Hero */}
      <section className="hero-section" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 40px", textAlign: "center", position: "relative" }}>
        <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.3em", color: "#8B7355", marginBottom: 32, textTransform: "uppercase" }}>
          {t("home_badge", lang)}
        </div>

        <h1 style={{ fontFamily: S, fontSize: "clamp(36px, 10vw, 100px)", fontWeight: 300, color: "#1A1A1A", marginBottom: 16, lineHeight: 1.05, letterSpacing: "0.02em" }}>
          Role of Bridge
        </h1>

        <p style={{ fontFamily: F, fontSize: 14, fontWeight: 300, color: "#8A8580", maxWidth: 420, margin: "0 auto 56px", lineHeight: 1.8, whiteSpace: "pre-line", padding: "0 16px" }}>
          {t("home_subtitle", lang)}
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", padding: "0 16px" }}>
          <Link href="/login?role=artist" style={{ padding: "16px 40px", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none", transition: "all 0.3s ease", flex: "0 1 auto" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#8B7355"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#1A1A1A"; }}>
            {t("home_i_am_artist", lang)}
          </Link>
          <Link href="/login?role=gallery" style={{ padding: "16px 40px", border: "1px solid #1A1A1A", background: "transparent", color: "#1A1A1A", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none", transition: "all 0.3s ease", flex: "0 1 auto" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1A1A1A"; e.currentTarget.style.color = "#FDFBF7"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1A1A1A"; }}>
            {t("home_i_am_gallery", lang)}
          </Link>
        </div>

        <div className="hide-on-mobile" style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, #D4CEC4, transparent)" }} />
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: "60px 24px", borderTop: "1px solid #E8E3DB" }}>
        <div className="stats-grid" style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          <StatItem number={stats.artists} label={t("home_artists", lang)} />
          <StatItem number={stats.galleries} label={t("home_galleries", lang)} />
          <StatItem number={stats.countries} label={t("home_countries", lang)} />
          <StatItem number="∞" label={t("home_connections", lang)} />
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.3em", color: "#8B7355", textTransform: "uppercase" }}>{t("home_how_it_works", lang)}</span>
          <h2 style={{ fontFamily: S, fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 300, color: "#1A1A1A", marginTop: 16, letterSpacing: "0.02em" }}>
            {t("home_three_steps", lang)}
          </h2>
        </div>

        <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "#E8E3DB" }}>
          <FeatureCard number="01" title={t("home_step1_title", lang)} description={t("home_step1_desc", lang)} />
          <FeatureCard number="02" title={t("home_step2_title", lang)} description={t("home_step2_desc", lang)} />
          <FeatureCard number="03" title={t("home_step3_title", lang)} description={t("home_step3_desc", lang)} />
        </div>
      </section>

      {/* Role Cards */}
      <section style={{ padding: "60px 24px", background: "#F5F1EB" }}>
        <div className="role-grid" style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, background: "#E8E3DB", alignItems: "stretch" }}>
          <RoleCard href="/login?role=artist" label={t("home_for_artists", lang)} title={t("home_artist_title", lang)} features={[t("home_artist_feat1", lang), t("home_artist_feat2", lang), t("home_artist_feat3", lang), t("home_artist_feat5", lang), t("home_artist_feat6", lang), t("home_artist_feat7", lang)]} lang={lang} />
          <RoleCard href="/login?role=gallery" label={t("home_for_galleries", lang)} title={t("home_gallery_title", lang)} features={[t("home_gallery_feat1", lang), t("home_gallery_feat2", lang), t("home_gallery_feat3", lang), t("home_gallery_feat4", lang), t("home_gallery_feat5", lang)]} lang={lang} />
        </div>
      </section>

      {/* Country Landing Pages */}
      <section style={{ padding: "60px 24px", background: "#FDFBF7" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.3em", color: "#8B7355", textTransform: "uppercase" }}>{t("home_explore_country", lang)}</span>
          <h2 style={{ fontFamily: S, fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 300, color: "#1A1A1A", marginTop: 16, marginBottom: 32 }}>
            {t("home_10_countries", lang)}
          </h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { code: "kr", flag: "🇰🇷", name: lang === "ko" ? "한국" : lang === "ja" ? "韓国" : "Korea" },
              { code: "jp", flag: "🇯🇵", name: lang === "ko" ? "일본" : lang === "ja" ? "日本" : "Japan" },
              { code: "uk", flag: "🇬🇧", name: lang === "ko" ? "영국" : lang === "ja" ? "イギリス" : "UK" },
              { code: "fr", flag: "🇫🇷", name: lang === "ko" ? "프랑스" : lang === "ja" ? "フランス" : "France" },
              { code: "us", flag: "🇺🇸", name: lang === "ko" ? "미국" : lang === "ja" ? "アメリカ" : "USA" },
              { code: "de", flag: "🇩🇪", name: lang === "ko" ? "독일" : lang === "ja" ? "ドイツ" : "Germany" },
              { code: "it", flag: "🇮🇹", name: lang === "ko" ? "이탈리아" : lang === "ja" ? "イタリア" : "Italy" },
              { code: "ch", flag: "🇨🇭", name: lang === "ko" ? "스위스" : lang === "ja" ? "スイス" : "Switzerland" },
              { code: "cn", flag: "🇨🇳", name: lang === "ko" ? "중국" : lang === "ja" ? "中国" : "China" },
              { code: "au", flag: "🇦🇺", name: lang === "ko" ? "호주" : lang === "ja" ? "オーストラリア" : "Australia" },
            ].map((c) => (
              <Link key={c.code} href={`/country/${c.code}`}
                style={{ padding: "14px 24px", border: "1px solid #E8E3DB", background: "#FFFFFF", fontFamily: F, fontSize: 12, color: "#1A1A1A", textDecoration: "none", transition: "all 0.3s", display: "flex", alignItems: "center", gap: 10 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B7355"; e.currentTarget.style.background = "#FAF8F4"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E3DB"; e.currentTarget.style.background = "#FFFFFF"; }}>
                <span style={{ fontSize: 18 }}>{c.flag}</span>
                <span style={{ fontWeight: 400 }}>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: S, fontSize: "clamp(28px, 5vw, 56px)", fontWeight: 300, color: "#1A1A1A", margin: "0 0 40px" }}>
          {t("home_begin", lang)}
        </h2>
        <Link href="/login" style={{ display: "inline-block", padding: "18px 48px", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none", transition: "all 0.3s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#8B7355"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#1A1A1A"; }}>
          {t("enter", lang)}
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 24px", textAlign: "center", borderTop: "1px solid #E8E3DB" }}>
        <div style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", marginBottom: 4 }}>ROB</div>
        <div style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#B0AAA2", marginBottom: 16 }}>Role of Bridge</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 12 }}>
          <Link href="/about" style={{ fontFamily: F, fontSize: 11, color: "#8B7355", textDecoration: "underline" }}>
            About
          </Link>
          <a
            href="mailto:contact@rob-roleofbridge.com"
            style={{ fontFamily: F, fontSize: 11, color: "#8B7355", textDecoration: "underline" }}
          >
            contact@rob-roleofbridge.com
          </a>
          <a href="https://instagram.com/noas_no_art_special" target="_blank" rel="noreferrer" style={{ fontFamily: F, fontSize: 11, color: "#8B7355", textDecoration: "underline" }}>
            @noas_no_art_special
          </a>
        </div>
        <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.08em", color: "#D4CEC4" }}>© 2026 Global Art Platform</div>
      </footer>

      <style jsx global>{`
        @media (max-width: 768px) {
          .hero-section { min-height: 80vh !important; padding: 40px 20px !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 32px 16px !important; }
          .feature-grid { grid-template-columns: 1fr !important; }
          .role-grid { grid-template-columns: 1fr !important; }
          .hide-on-mobile { display: none !important; }
        }
        @media (max-width: 480px) {
          .hero-section { min-height: auto !important; padding: 48px 16px 60px !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 24px 12px !important; }
        }
      `}</style>
    </main>
  );
}

function StatItem({ number, label }: { number: number | string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: S, fontSize: "clamp(36px, 6vw, 52px)", fontWeight: 300, color: "#1A1A1A", lineHeight: 1 }}>
        {typeof number === "number" ? `${number}+` : number}
      </div>
      <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8A8580", marginTop: 12 }}>{label}</div>
    </div>
  );
}

function FeatureCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div style={{ padding: "clamp(24px, 4vw, 48px)", background: "#FFFFFF", transition: "all 0.3s ease" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
      <div style={{ fontFamily: S, fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 300, color: "#D4CEC4", marginBottom: 16 }}>{number}</div>
      <h3 style={{ fontFamily: S, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 400, color: "#1A1A1A", marginBottom: 12 }}>{title}</h3>
      <p style={{ fontFamily: F, fontSize: 13, fontWeight: 300, color: "#8A8580", lineHeight: 1.7 }}>{description}</p>
    </div>
  );
}

function RoleCard({ href, label, title, features, lang }: { href: string; label: string; title: string; features: string[]; lang: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
      <div style={{ padding: "clamp(24px, 4vw, 48px)", background: "#FFFFFF", height: "100%", display: "flex", flexDirection: "column", transition: "all 0.3s ease" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
        <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", color: "#8B7355", textTransform: "uppercase", marginBottom: 16 }}>{label}</div>
        <h3 style={{ fontFamily: S, fontSize: "clamp(20px, 3vw, 24px)", fontWeight: 400, color: "#1A1A1A", marginBottom: 24, lineHeight: 1.3 }}>{title}</h3>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", flex: 1 }}>
          {features.map((f, i) => (
            <li key={i} style={{ fontFamily: F, fontSize: 12, fontWeight: 400, color: "#8A8580", padding: "10px 0", borderBottom: "1px solid #F0EBE3", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#8B7355" }}>—</span> {f}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 24, padding: "14px 0", border: "1px solid #1A1A1A", color: "#1A1A1A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", transition: "all 0.3s ease" }}>
          {lang === "ko" ? "입장" : lang === "ja" ? "入場" : "Enter"}
        </div>
      </div>
    </Link>
  );
}
