import { NextResponse } from "next/server";
import { getProfileByUserId } from "@/lib/auth";
import { getExhibitionsByGalleryId } from "@/app/data/exhibitions";
import { listOpenCalls } from "@/app/data/openCalls";
import { getExternalGalleryDirectoryById } from "@/lib/externalGalleryDirectory";
import { resolveGalleryContactEmail } from "@/lib/galleryContactEmail";

function isTokenLike(value: string) {
  const v = String(value || "").trim();
  if (!v) return false;
  if (!/^[a-z0-9]{6,}$/i.test(v)) return false;
  return /[a-z]/i.test(v) && /\d/.test(v);
}

function isLikelyInvalidInternalGalleryProfile(profile: any) {
  const nowYear = new Date().getFullYear();
  const foundedYear = Number(profile?.foundedYear || 0);
  if (foundedYear && (foundedYear < 1500 || foundedYear > nowYear + 1)) return true;

  const name = String(profile?.name || "").trim();
  const city = String(profile?.city || "").trim();
  const website = String(profile?.website || "").trim();
  const bio = String(profile?.bio || "").trim();
  const address = String(profile?.address || "").trim();
  const instagram = String(profile?.instagram || "").trim();

  if (isTokenLike(name) && !city && !website && !bio && (isTokenLike(address) || isTokenLike(instagram))) {
    return true;
  }
  return false;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id);
    const profile = await getProfileByUserId(id);

    // ✅ gallery 프로필만 노출
    if (!profile || profile.role !== "gallery" || isLikelyInvalidInternalGalleryProfile(profile)) {
      // Fallback #1: external gallery directory
      const ext = await getExternalGalleryDirectoryById(id);
      if (ext) {
        const pseudoProfile = {
          id: `external-directory-${id}`,
          userId: id,
          role: "gallery" as const,
          email: resolveGalleryContactEmail({
            name: ext.name,
            explicit: ext.externalEmail || "",
            website: ext.website || undefined,
          }),
          name: ext.name,
          country: ext.country,
          city: ext.city,
          website: ext.website || "",
          bio: ext.bio || "",
          createdAt: new Date(ext.createdAt).getTime(),
          updatedAt: new Date(ext.updatedAt).getTime(),
        };
        return NextResponse.json(
          { ok: true, profile: pseudoProfile, exhibitions: [] },
          { status: 200 }
        );
      }

      // Fallback #2: external gallery from crawled open calls
      const openCalls = await listOpenCalls();
      const externalCalls = openCalls.filter(
        (oc) => oc.isExternal && oc.galleryId === id
      );
      if (externalCalls.length === 0) {
        return NextResponse.json(
          { ok: false, error: "not found" },
          { status: 404 }
        );
      }
      const latest = externalCalls.sort((a, b) => b.createdAt - a.createdAt)[0];
      const pseudoProfile = {
        id: `external-${id}`,
        userId: id,
        role: "gallery" as const,
        email: resolveGalleryContactEmail({
          name: latest.gallery,
          explicit: latest.externalEmail || "",
          website: latest.galleryWebsite || undefined,
        }),
        name: latest.gallery,
        country: latest.country,
        city: latest.city,
        website: latest.galleryWebsite,
        bio: latest.galleryDescription,
        createdAt: latest.createdAt,
        updatedAt: latest.createdAt,
      };
      return NextResponse.json(
        { ok: true, profile: pseudoProfile, exhibitions: [] },
        { status: 200 }
      );
    }

    const exhibitions = await getExhibitionsByGalleryId(profile.userId);
    const safeProfile =
      profile.role === "gallery"
        ? {
          ...profile,
          email: resolveGalleryContactEmail({
            name: profile.name,
            explicit: profile.email,
            website: profile.website || undefined,
          }),
        }
        : profile;

    return NextResponse.json({ ok: true, profile: safeProfile, exhibitions }, { status: 200 });
  } catch (e) {
    console.error("GET /api/public/gallery/[id] failed:", e);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}
