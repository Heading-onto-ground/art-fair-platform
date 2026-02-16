import fs from "fs/promises";
import path from "path";
import type { RawDirectoryGallery } from "@/lib/galleryDirectoryQuality";
import { PORTAL_GALLERY_SOURCES } from "@/lib/portalGallerySources";

const SOURCES_PATH = path.join(process.cwd(), "data", "portal-gallery-sources.json");

function sanitizeSource(input: any): RawDirectoryGallery | null {
  const name = String(input?.name || "").trim();
  const country = String(input?.country || "").trim();
  const city = String(input?.city || "").trim();
  if (!name || !country || !city) return null;
  return {
    name,
    country,
    city,
    website: String(input?.website || "").trim() || undefined,
    bio: String(input?.bio || "").trim() || undefined,
    sourcePortal: String(input?.sourcePortal || "").trim() || undefined,
    sourceUrl: String(input?.sourceUrl || "").trim() || undefined,
    externalEmail: String(input?.externalEmail || "").trim() || undefined,
  };
}

function sanitizeList(input: any): RawDirectoryGallery[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row) => sanitizeSource(row))
    .filter((row): row is RawDirectoryGallery => !!row);
}

export async function loadPortalGallerySources() {
  try {
    const raw = await fs.readFile(SOURCES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const list = sanitizeList(parsed);
    if (list.length > 0) {
      return { sources: list, source: "json" as const, path: SOURCES_PATH };
    }
  } catch {
    // fallback to built-in defaults
  }
  return {
    sources: PORTAL_GALLERY_SOURCES,
    source: "fallback" as const,
    path: SOURCES_PATH,
  };
}

export async function savePortalGallerySources(input: any) {
  const list = sanitizeList(input);
  if (list.length === 0) {
    throw new Error("No valid source entries. Each row needs name/country/city.");
  }
  await fs.mkdir(path.dirname(SOURCES_PATH), { recursive: true });
  await fs.writeFile(SOURCES_PATH, `${JSON.stringify(list, null, 2)}\n`, "utf8");
  return list;
}

export function getPortalGallerySourcesPath() {
  return SOURCES_PATH;
}

