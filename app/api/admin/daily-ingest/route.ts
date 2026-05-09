import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { ensureGalleryEmailDirectoryTable } from "@/lib/galleryEmailDirectory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DirRow = {
  id: string;
  email: string;
  galleryName: string;
  country: string | null;
  city: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Admin-only: rows touched (created or updated) in the rolling window. */
export async function GET(req: Request) {
  const admin = getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const hoursRaw = Number(url.searchParams.get("hours") || "24");
  const hours = Number.isFinite(hoursRaw) ? Math.min(168, Math.max(1, Math.floor(hoursRaw))) : 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  try {
    const [openCalls, galleryUsers] = await Promise.all([
      prisma.openCall.findMany({
        where: {
          OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          theme: true,
          gallery: true,
          city: true,
          country: true,
          deadline: true,
          isExternal: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.findMany({
        where: {
          role: "gallery",
          OR: [
            { createdAt: { gte: since } },
            {
              galleryProfile: {
                is: {
                  OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
                },
              },
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          email: true,
          createdAt: true,
          galleryProfile: {
            select: {
              galleryId: true,
              name: true,
              city: true,
              country: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
    ]);

    await ensureGalleryEmailDirectoryTable();
    const directoryRows = (await prisma.$queryRawUnsafe(
      `SELECT id, email, "galleryName", country, city, source, "createdAt", "updatedAt"
       FROM "GalleryEmailDirectory"
       WHERE "updatedAt" >= $1 OR "createdAt" >= $1
       ORDER BY GREATEST("updatedAt", "createdAt") DESC
       LIMIT 50`,
      since
    )) as DirRow[];

    const openCallRows = openCalls.map(
      (oc: (typeof openCalls)[number]): {
        id: string;
        theme: string;
        gallery: string;
        city: string;
        country: string;
        deadline: string;
        isExternal: boolean;
        createdAt: number;
        updatedAt: number;
        change: "new" | "updated";
      } => {
      const created = oc.createdAt >= since;
        return {
          id: oc.id,
          theme: oc.theme,
          gallery: oc.gallery,
          city: oc.city,
          country: oc.country,
          deadline: oc.deadline,
          isExternal: oc.isExternal,
          createdAt: oc.createdAt.getTime(),
          updatedAt: oc.updatedAt.getTime(),
          change: created ? ("new" as const) : ("updated" as const),
        };
      }
    );

    const galleryUserRows = galleryUsers.map((u: (typeof galleryUsers)[number]) => ({
      userId: u.id,
      email: u.email,
      galleryId: u.galleryProfile?.galleryId ?? "",
      name: u.galleryProfile?.name ?? "",
      city: u.galleryProfile?.city ?? "",
      country: u.galleryProfile?.country ?? "",
      userCreatedAt: u.createdAt.getTime(),
      profileCreatedAt: u.galleryProfile?.createdAt?.getTime() ?? null,
      profileUpdatedAt: u.galleryProfile?.updatedAt?.getTime() ?? null,
      change: u.createdAt >= since ? ("signup" as const) : ("profile_touch" as const),
    }));

    const directoryOut = directoryRows.map((r) => ({
      id: r.id,
      email: r.email,
      galleryName: r.galleryName,
      country: r.country,
      city: r.city,
      source: r.source,
      createdAt: new Date(r.createdAt).getTime(),
      updatedAt: new Date(r.updatedAt).getTime(),
      change: new Date(r.createdAt) >= since ? ("new" as const) : ("updated" as const),
    }));

    return NextResponse.json({
      ok: true,
      hours,
      since: since.toISOString(),
      counts: {
        openCalls: openCallRows.length,
        platformGalleries: galleryUserRows.length,
        directoryGalleries: directoryOut.length,
      },
      openCalls: openCallRows,
      platformGalleries: galleryUserRows,
      directoryGalleries: directoryOut,
    });
  } catch (e) {
    console.error("GET /api/admin/daily-ingest failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
