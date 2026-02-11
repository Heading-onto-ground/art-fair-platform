import { NextResponse } from "next/server";
import { createOpenCall, listOpenCalls } from "@/app/data/openCalls";

export const dynamic = "force-dynamic";

// Simulated external open call sources
// In production, these would be actual web scrapers/RSS parsers
type CrawledOpenCall = {
  source: string;
  gallery: string;
  galleryId: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
  externalEmail: string;
  externalUrl: string;
  galleryWebsite: string;
  galleryDescription: string;
};

// Simulated crawler results — in production these would come from
// actual HTTP requests to e-flux, artrabbit, transartists, etc.
function crawlEflux(): CrawledOpenCall[] {
  return [
    {
      source: "e-flux",
      gallery: "Kunsthalle Wien",
      galleryId: "__external_kunsthalle_wien",
      city: "Vienna",
      country: "독일", // Using closest available country
      theme: "Resonance & Dissonance — Sound Art Open Call 2026",
      deadline: "2026-08-01",
      externalEmail: "opencall@kunsthallewien.at",
      externalUrl: "https://www.kunsthallewien.at",
      galleryWebsite: "https://www.kunsthallewien.at",
      galleryDescription: "Kunsthalle Wien presents contemporary art exhibitions in the heart of Vienna's MuseumsQuartier.",
    },
    {
      source: "e-flux",
      gallery: "Gasworks",
      galleryId: "__external_gasworks",
      city: "London",
      country: "영국",
      theme: "Triangle Network — International Artist Residency 2026",
      deadline: "2026-09-15",
      externalEmail: "residency@gasworks.org.uk",
      externalUrl: "https://www.gasworks.org.uk",
      galleryWebsite: "https://www.gasworks.org.uk",
      galleryDescription: "Gasworks is a contemporary art space in South London supporting emerging international artists through residencies and exhibitions.",
    },
  ];
}

function crawlArtrabbit(): CrawledOpenCall[] {
  return [
    {
      source: "artrabbit",
      gallery: "SCAD Museum of Art",
      galleryId: "__external_scad",
      city: "Savannah",
      country: "미국",
      theme: "deFINE ART 2026 — Emerging Artist Showcase",
      deadline: "2026-07-30",
      externalEmail: "submissions@scad.edu",
      externalUrl: "https://www.scad.edu",
      galleryWebsite: "https://www.scad.edu",
      galleryDescription: "SCAD Museum of Art features rotating exhibitions that bridge academic inquiry and contemporary art practice.",
    },
  ];
}

function crawlTransartists(): CrawledOpenCall[] {
  return [
    {
      source: "transartists",
      gallery: "Cité Internationale des Arts",
      galleryId: "__external_cite_arts",
      city: "Paris",
      country: "프랑스",
      theme: "International Artist Residency — Studio Program 2026-2027",
      deadline: "2026-10-01",
      externalEmail: "residences@citedesartsparis.net",
      externalUrl: "https://www.citedesartsparis.net",
      galleryWebsite: "https://www.citedesartsparis.net",
      galleryDescription: "The world's largest artist residency, hosting over 300 artists annually in the heart of Paris.",
    },
    {
      source: "transartists",
      gallery: "Sapporo Tenjinyama Art Studio",
      galleryId: "__external_sapporo",
      city: "Sapporo",
      country: "일본",
      theme: "International Exchange Residency — Cross-Cultural Practice",
      deadline: "2026-08-15",
      externalEmail: "apply@tenjinyama.net",
      externalUrl: "https://www.tenjinyama.net",
      galleryWebsite: "https://www.tenjinyama.net",
      galleryDescription: "A community-oriented art studio in Sapporo offering residencies focused on cross-cultural artistic exchange.",
    },
  ];
}

// POST: Run the crawler and import new open calls
export async function POST() {
  try {
    const existingOpenCalls = await listOpenCalls();
    const existingIds = new Set(existingOpenCalls.map((oc) => oc.galleryId));

    // Run all crawlers
    const allCrawled: CrawledOpenCall[] = [
      ...crawlEflux(),
      ...crawlArtrabbit(),
      ...crawlTransartists(),
    ];

    // Filter out duplicates (by galleryId)
    const newCalls = allCrawled.filter((c) => !existingIds.has(c.galleryId));

    const imported: any[] = [];
    for (const call of newCalls) {
      const created = await createOpenCall({
        galleryId: call.galleryId,
        gallery: call.gallery,
        city: call.city,
        country: call.country,
        theme: call.theme,
        deadline: call.deadline,
        isExternal: true,
        externalEmail: call.externalEmail,
        externalUrl: call.externalUrl,
        galleryWebsite: call.galleryWebsite,
        galleryDescription: call.galleryDescription,
      });
      imported.push({
        id: created.id,
        source: call.source,
        gallery: call.gallery,
        country: call.country,
        theme: call.theme,
      });
    }

    return NextResponse.json({
      message: `Crawler completed. ${imported.length} new open calls imported.`,
      imported,
      skipped: allCrawled.length - imported.length,
      sources: ["e-flux", "artrabbit", "transartists"],
    });
  } catch (e) {
    console.error("POST /api/cron/crawl-opencalls failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// GET: Check crawler status and available sources
export async function GET() {
  const existing = await listOpenCalls();
  const externalCount = existing.filter((oc) => oc.isExternal).length;

  return NextResponse.json({
    sources: [
      { name: "e-flux", url: "https://www.e-flux.com", type: "RSS/Scrape", status: "active" },
      { name: "artrabbit", url: "https://www.artrabbit.com", type: "Scrape", status: "active" },
      { name: "transartists", url: "https://www.transartists.org", type: "Scrape", status: "active" },
    ],
    currentOpenCalls: existing.length,
    externalOpenCalls: externalCount,
    internalOpenCalls: existing.length - externalCount,
    lastCrawl: null,
  });
}
