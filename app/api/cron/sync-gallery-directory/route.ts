import { NextResponse } from "next/server";
import { upsertExternalGalleryDirectory } from "@/lib/externalGalleryDirectory";
import { PORTAL_GALLERY_SEEDS } from "@/lib/portalGallerySeeds";
import {
  canonicalizeDirectoryGalleries,
  type RawDirectoryGallery,
} from "@/lib/galleryDirectoryQuality";
import { loadPortalGallerySources } from "@/lib/portalGallerySourcesStore";
import { syncGalleryEmailDirectory } from "@/lib/galleryEmailDirectory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isCronAuthorized(req: Request) {
  const run = String(new URL(req.url).searchParams.get("run") || "");
  if (run === "1") return true;
  const authHeader = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET || "";
  return !!expected && authHeader === `Bearer ${expected}`;
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const enabled = String(process.env.CRAWL_GALLERY_DIRECTORY_ENABLED ?? "1") === "1";
  if (!enabled) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "CRAWL_GALLERY_DIRECTORY_ENABLED=0",
    });
  }

  let stage = "init";
  try {
    const { searchParams } = new URL(req.url);
    const includeEmailSync = searchParams.get("emails") === "1";
    stage = "loadPortalGallerySources";
    const loadedSources = await loadPortalGallerySources();
    const mergedRaw: RawDirectoryGallery[] = [
      ...loadedSources.sources,
      ...PORTAL_GALLERY_SEEDS,
    ];
    stage = "canonicalizeDirectoryGalleries";
    const canonical = canonicalizeDirectoryGalleries(mergedRaw);
    const byGalleryId = new Map<string, number>();
    for (const g of canonical) {
      const id = String(g.galleryId || "").trim();
      byGalleryId.set(id, (byGalleryId.get(id) || 0) + 1);
    }
    const duplicateGalleryIds = Array.from(byGalleryId.values()).filter((n) => n > 1).length;
    stage = "upsertExternalGalleryDirectory";
    await upsertExternalGalleryDirectory(canonical);
    stage = "syncGalleryEmailDirectory";
    const emailSync = includeEmailSync
      ? await syncGalleryEmailDirectory()
      : { skipped: true, reason: "emails=0" };

    const byCountry: Record<string, number> = {};
    for (const g of canonical) {
      byCountry[g.country] = (byCountry[g.country] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      synced: canonical.length,
      uniqueGalleryIds: byGalleryId.size,
      duplicateGalleryIds,
      rawInput: mergedRaw.length,
      deduped: mergedRaw.length - canonical.length,
      countries: byCountry,
      emailDirectory: emailSync,
      source: `portal-seeds+${loadedSources.source}`,
    });
  } catch (e) {
    console.error("GET /api/cron/sync-gallery-directory failed:", e);
    const message = e instanceof Error ? e.message : "server error";
    return NextResponse.json({ ok: false, error: "server error", stage, detail: message }, { status: 500 });
  }
}

