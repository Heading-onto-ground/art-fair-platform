import fs from "fs";
import path from "path";

type SourceRow = {
  name: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  sourcePortal?: string;
  sourceUrl?: string;
  externalEmail?: string;
};

const SOURCES_PATH = path.join(process.cwd(), "data", "portal-gallery-sources.json");

const KR_NAVER_GALLERIES: Array<{ name: string; city: string; website?: string; bio?: string }> = [
  { name: "Kukje Gallery", city: "Seoul", website: "https://www.kukjegallery.com" },
  { name: "Gallery Hyundai", city: "Seoul", website: "https://www.galleryhyundai.com" },
  { name: "PKM Gallery", city: "Seoul", website: "https://www.pkmgallery.com" },
  { name: "Hakgojae Gallery", city: "Seoul", website: "https://www.hakgojae.com" },
  { name: "Arario Gallery Seoul", city: "Seoul", website: "https://www.arariogallery.com" },
  { name: "Pace Gallery Seoul", city: "Seoul", website: "https://www.pacegallery.com" },
  { name: "Thaddaeus Ropac Seoul", city: "Seoul", website: "https://www.ropac.net" },
  { name: "Perrotin Seoul", city: "Seoul", website: "https://www.perrotin.com" },
  { name: "Tang Contemporary Art Seoul", city: "Seoul", website: "https://www.tangcontemporary.com" },
  { name: "Gallery Baton", city: "Seoul", website: "https://www.gallerybaton.com" },
  { name: "One and J. Gallery", city: "Seoul", website: "https://www.oneandj.com" },
  { name: "Perigee Gallery", city: "Seoul", website: "https://www.perigeegallery.com" },
  { name: "Leeahn Gallery Seoul", city: "Seoul", website: "https://www.leeahngallery.com" },
  { name: "Gana Art", city: "Seoul", website: "https://www.ganaart.com" },
  { name: "Keumsan Gallery", city: "Seoul", website: "https://www.keumsan.org" },
  { name: "PYO Gallery Seoul", city: "Seoul", website: "https://www.pyogallery.com" },
  { name: "Gallery Chosun", city: "Seoul", website: "https://www.gallerychosun.com" },
  { name: "Gallery SP", city: "Seoul", website: "https://www.gallerysp.com" },
  { name: "Gallery Joeun", city: "Seoul", website: "https://www.galleryjoeun.com" },
  { name: "Gallery BK", city: "Seoul", website: "https://www.gallerybk.co.kr" },
  { name: "313 Art Project", city: "Seoul", website: "https://www.313artproject.com" },
  { name: "Wooson Gallery Seoul", city: "Seoul", website: "https://www.woosongallery.com" },
  { name: "Gallery LVS", city: "Seoul", website: "https://www.gallerylvs.org" },
  { name: "Sun Gallery", city: "Seoul", website: "https://www.sun-gallery.com" },
  { name: "JJ Joong Jung Gallery", city: "Seoul", website: "https://www.jjjoongjunggallery.com" },
  { name: "A-Lounge Contemporary", city: "Seoul", website: "https://www.a-lounge.kr" },
  { name: "Gallery Hyundai Dosan", city: "Seoul", website: "https://www.galleryhyundai.com" },
  { name: "ThisWeekendRoom", city: "Seoul", website: "https://www.thisweekendroom.com" },
  { name: "Gallery2", city: "Seoul", website: "https://www.gallery2.co.kr" },
  { name: "Doosan Gallery", city: "Seoul", website: "https://www.doosangallery.com" },
  { name: "OCI Museum of Art Gallery Space", city: "Seoul", website: "https://www.ociam.org" },
  { name: "Aando Fine Art", city: "Seoul", website: "https://www.aandoart.com" },
  { name: "Johyun Gallery", city: "Busan", website: "https://www.johyungallery.com" },
  { name: "Gallery Mare", city: "Busan", website: "https://www.gallerymare.com" },
  { name: "Gallery DOS", city: "Busan", website: "https://www.gallerydos.com" },
  { name: "Space One Busan", city: "Busan", website: "https://www.spaceone.co.kr" },
  { name: "Soul Art Space", city: "Busan", website: "https://www.soulartspace.com" },
  { name: "Gallery M", city: "Busan", website: "https://www.gallerym.kr" },
  { name: "LEE & BAE", city: "Busan", website: "https://www.leeandbae.com" },
  { name: "Art Sohyang", city: "Busan", website: "https://www.artsohyang.com" },
  { name: "Gallery MHK", city: "Daegu", website: "https://www.gallerymhk.com" },
  { name: "Wooson Gallery Daegu", city: "Daegu", website: "https://www.woosongallery.com" },
  { name: "Gallery Bun", city: "Daegu", website: "https://www.gallerybun.com" },
  { name: "Gallery Soso", city: "Paju", website: "https://www.gallerysoso.com" },
  { name: "Gallery Plant", city: "Seoul", website: "https://www.galleryplant.com" },
  { name: "Gallery Lux", city: "Seoul", website: "https://www.gallerylux.net" },
  { name: "Gallery We", city: "Seoul", website: "https://www.gallerywe.com" },
  { name: "Gallery M9", city: "Seoul", website: "https://www.gallerym9.com" },
  { name: "Gallery Dam", city: "Seoul", website: "https://www.gallerydam.com" },
  { name: "Gallery IS", city: "Seoul", website: "https://www.galleryis.com" },
  { name: "Gallery BK Hannam", city: "Seoul", website: "https://www.gallerybk.co.kr" },
  { name: "Gallery LEE", city: "Seoul", website: "https://www.gallerylee.co.kr" },
  { name: "Gallery Now", city: "Seoul", website: "https://www.gallerynow.co.kr" },
  { name: "Gallery Yeh", city: "Seoul", website: "https://www.galleryyeh.com" },
  { name: "Gallery K", city: "Seoul", website: "https://www.galleryk.co.kr" },
  { name: "Gallery Choi", city: "Seoul", website: "https://www.gallerychoi.com" },
  { name: "Gallery Grimson", city: "Seoul", website: "https://www.gallerygrimson.com" },
  { name: "Gallery Simon", city: "Seoul", website: "https://www.gallerysimon.com" },
  { name: "Gallery Minjung", city: "Seoul", website: "https://www.galleryminjung.com" },
  { name: "Gallery H", city: "Seoul", website: "https://www.galleryh.kr" },
  { name: "Gallery D", city: "Seoul", website: "https://www.galleryd.co.kr" },
  { name: "Gallery Eum", city: "Seoul", website: "https://www.galleryeum.com" },
];

function normalizeText(v: string) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u3131-\uD79D\u3040-\u30ff\u4e00-\u9faf\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostFromUrl(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase().trim();
  } catch {
    return "";
  }
}

function dedupeKey(row: SourceRow) {
  const host = hostFromUrl(row.website);
  const name = normalizeText(row.name);
  const city = normalizeText(row.city);
  const country = normalizeText(row.country);
  if (host) return `hostncc:${host}|${name}|${country}|${city}`;
  return `ncc:${name}|${country}|${city}`;
}

function isExcludedName(name: string) {
  const v = String(name || "").toLowerCase();
  return v.includes("카페") || v.includes("cafe") || v.includes("공방") || v.includes("workshop");
}

function naverSearchUrl(name: string, city: string) {
  const q = `${name} ${city} 갤러리`;
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(q)}`;
}

function loadRows(): SourceRow[] {
  try {
    const raw = fs.readFileSync(SOURCES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SourceRow[];
  } catch {
    return [];
  }
}

function main() {
  const existing = loadRows();
  const merged = new Map<string, SourceRow>();

  for (const row of existing) {
    if (row?.country === "한국" && isExcludedName(row.name)) continue;
    merged.set(dedupeKey(row), row);
  }

  for (const g of KR_NAVER_GALLERIES) {
    if (isExcludedName(g.name)) continue;
    const row: SourceRow = {
      name: g.name,
      country: "한국",
      city: g.city,
      website: g.website,
      bio: g.bio || "Naver search based gallery listing (cafe/workshop excluded).",
      sourcePortal: "Naver",
      sourceUrl: naverSearchUrl(g.name, g.city),
    };
    merged.set(dedupeKey(row), row);
  }

  const out = Array.from(merged.values()).sort((a, b) => {
    if (a.country !== b.country) return a.country.localeCompare(b.country);
    if (a.city !== b.city) return a.city.localeCompare(b.city);
    return a.name.localeCompare(b.name);
  });

  fs.writeFileSync(SOURCES_PATH, `${JSON.stringify(out, null, 2)}\n`, "utf8");

  const krCount = out.filter((x) => x.country === "한국").length;
  const naverKrCount = out.filter((x) => x.country === "한국" && String(x.sourcePortal || "").toLowerCase() === "naver").length;
  console.log(JSON.stringify({ total: out.length, krCount, naverKrCount }, null, 2));
}

main();
