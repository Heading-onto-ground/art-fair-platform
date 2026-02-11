"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";

type CountryInfo = {
  code: string;
  nameKo: string;
  nameEn: string;
  nameLocal: string;
  flag: string;
  continent: string;
  artScene: string;
  keyInstitutions: string[];
  seoTitle: string;
  seoDescription: string;
};

type OpenCall = {
  id: string;
  gallery: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
  isExternal?: boolean;
  galleryWebsite?: string;
  galleryDescription?: string;
};

type CountryData = {
  country: CountryInfo;
  openCalls: OpenCall[];
  stats: {
    openCallsInCountry: number;
    totalOpenCalls: number;
    deadlinesSoon: number;
  };
};

export default function CountryPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [data, setData] = useState<CountryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/country/${code}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Country not found");
        const json = await res.json();
        setData(json);
        // Update page title for SEO
        if (json.country?.seoTitle) document.title = json.country.seoTitle;
      } catch (e: any) {
        setError(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  if (loading) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "80px 40px", textAlign: "center" }}>
          <span style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>Loading...</span>
        </main>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "80px 40px", textAlign: "center" }}>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, color: "#1A1A1A" }}>Country not found</h1>
          <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", marginTop: 16 }}>{error}</p>
          <Link href="/" style={{ fontFamily: F, fontSize: 12, color: "#8B7355", textDecoration: "underline", marginTop: 24, display: "inline-block" }}>Back to home</Link>
        </main>
      </>
    );
  }

  const { country, openCalls, stats } = data;

  return (
    <>
      <TopBar />
      <main style={{ minHeight: "100vh", background: "#FDFBF7" }}>
        {/* Hero Section */}
        <section style={{ padding: "80px 40px 60px", maxWidth: 900, margin: "0 auto", borderBottom: "1px solid #E8E3DB" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 32 }}>
            <span style={{ fontSize: 56, lineHeight: 1 }}>{country.flag}</span>
            <div>
              <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
                {country.continent}
              </span>
              <h1 style={{ fontFamily: S, fontSize: 52, fontWeight: 300, color: "#1A1A1A", lineHeight: 1.1, marginTop: 4 }}>
                {country.nameEn}
              </h1>
              <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", marginTop: 8 }}>
                {country.nameLocal} — {country.nameKo}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "#E8E3DB", marginTop: 40 }}>
            <StatBox value={stats.openCallsInCountry} label="Open Calls" />
            <StatBox value={stats.deadlinesSoon} label="Closing Soon" />
            <StatBox value={stats.totalOpenCalls} label="Total Worldwide" />
          </div>
        </section>

        {/* Art Scene Description */}
        <section style={{ padding: "56px 40px", maxWidth: 900, margin: "0 auto", borderBottom: "1px solid #E8E3DB" }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            Art Scene
          </span>
          <p style={{ fontFamily: S, fontSize: 20, fontWeight: 300, color: "#1A1A1A", lineHeight: 1.7, marginTop: 16 }}>
            {country.artScene}
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
            {country.keyInstitutions.map((inst) => (
              <span key={inst} style={{ padding: "8px 16px", border: "1px solid #E8E3DB", fontFamily: F, fontSize: 11, color: "#8A8580", fontWeight: 400 }}>
                {inst}
              </span>
            ))}
          </div>
        </section>

        {/* Open Calls List */}
        <section style={{ padding: "56px 40px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
            <div>
              <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
                Opportunities
              </span>
              <h2 style={{ fontFamily: S, fontSize: 32, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
                Open Calls in {country.nameEn}
              </h2>
            </div>
            <Link href="/open-calls" style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355", textDecoration: "underline" }}>
              View all countries
            </Link>
          </div>

          {openCalls.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", background: "#FFFFFF", border: "1px solid #E8E3DB" }}>
              <p style={{ fontFamily: S, fontSize: 18, fontStyle: "italic", color: "#B0AAA2" }}>
                No open calls in {country.nameEn} at the moment
              </p>
              <Link href="/login?role=gallery" style={{ fontFamily: F, fontSize: 11, color: "#8B7355", textDecoration: "underline", marginTop: 16, display: "inline-block" }}>
                Are you a gallery? Publish an open call
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
              {openCalls.map((oc, i) => {
                const daysLeft = Math.ceil((new Date(oc.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={oc.id} onClick={() => router.push(`/open-calls/${oc.id}`)}
                    style={{ background: "#FFFFFF", padding: "32px 36px", cursor: "pointer", transition: "background 0.3s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <span style={{ fontFamily: S, fontSize: 18, fontWeight: 300, color: "#D4CEC4" }}>{String(i + 1).padStart(2, "0")}</span>
                          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355" }}>
                            {oc.city}
                          </span>
                          {oc.isExternal && (
                            <span style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FFF", background: "#8B7355", padding: "2px 8px" }}>
                              Global
                            </span>
                          )}
                          {daysLeft <= 7 && daysLeft > 0 && (
                            <span style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B4A4A", background: "rgba(139,74,74,0.08)", padding: "2px 8px" }}>
                              {daysLeft}d left
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontFamily: S, fontSize: 24, fontWeight: 400, color: "#1A1A1A", marginBottom: 6 }}>
                          {oc.gallery}
                        </h3>
                        <p style={{ fontFamily: F, fontSize: 13, fontWeight: 300, color: "#8A8580" }}>{oc.theme}</p>
                        {oc.galleryDescription && (
                          <p style={{ fontFamily: F, fontSize: 11, fontWeight: 300, color: "#B0AAA2", marginTop: 8, lineHeight: 1.6 }}>
                            {oc.galleryDescription.slice(0, 120)}...
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 24 }}>
                        <span style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B0AAA2" }}>Deadline</span>
                        <div style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", marginTop: 4 }}>{oc.deadline}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* CTA */}
        <section style={{ padding: "80px 40px", textAlign: "center", borderTop: "1px solid #E8E3DB", marginTop: 40 }}>
          <h2 style={{ fontFamily: S, fontSize: 32, fontWeight: 300, color: "#1A1A1A", marginBottom: 12 }}>
            Ready to exhibit in {country.nameEn}?
          </h2>
          <p style={{ fontFamily: F, fontSize: 13, fontWeight: 300, color: "#8A8580", marginBottom: 32 }}>
            Join ROB and connect with galleries worldwide
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <Link href="/login?role=artist" style={{ padding: "14px 40px", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none" }}>
              Join as Artist
            </Link>
            <Link href="/login?role=gallery" style={{ padding: "14px 40px", border: "1px solid #1A1A1A", color: "#1A1A1A", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none" }}>
              Join as Gallery
            </Link>
          </div>
        </section>

        {/* Other Countries */}
        <section style={{ padding: "56px 40px", maxWidth: 900, margin: "0 auto", borderTop: "1px solid #E8E3DB" }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            Explore More
          </span>
          <h3 style={{ fontFamily: S, fontSize: 24, fontWeight: 300, color: "#1A1A1A", marginTop: 8, marginBottom: 20 }}>
            Other Countries
          </h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["kr", "jp", "uk", "fr", "us", "de", "it", "ch", "cn", "au"]
              .filter((c) => c !== code)
              .map((c) => {
                const names: Record<string, string> = { kr: "Korea", jp: "Japan", uk: "UK", fr: "France", us: "USA", de: "Germany", it: "Italy", ch: "Switzerland", cn: "China", au: "Australia" };
                const flags: Record<string, string> = { kr: "🇰🇷", jp: "🇯🇵", uk: "🇬🇧", fr: "🇫🇷", us: "🇺🇸", de: "🇩🇪", it: "🇮🇹", ch: "🇨🇭", cn: "🇨🇳", au: "🇦🇺" };
                return (
                  <Link key={c} href={`/country/${c}`}
                    style={{ padding: "10px 20px", border: "1px solid #E8E3DB", background: "#FFFFFF", fontFamily: F, fontSize: 11, color: "#4A4A4A", textDecoration: "none", transition: "all 0.3s", display: "flex", alignItems: "center", gap: 8 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1A1A1A"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E3DB"; }}>
                    <span>{flags[c]}</span> {names[c]}
                  </Link>
                );
              })}
          </div>
        </section>

        {/* Footer */}
        <footer style={{ padding: "48px 40px", textAlign: "center", borderTop: "1px solid #E8E3DB", marginTop: 40 }}>
          <div style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A" }}>ROB</div>
          <div style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#B0AAA2", marginTop: 4 }}>Role of Bridge — {country.nameEn}</div>
        </footer>
      </main>
    </>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ padding: 32, background: "#FFFFFF", textAlign: "center" }}>
      <div style={{ fontFamily: S, fontSize: 42, fontWeight: 300, color: "#1A1A1A", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8580", marginTop: 10 }}>
        {label}
      </div>
    </div>
  );
}
