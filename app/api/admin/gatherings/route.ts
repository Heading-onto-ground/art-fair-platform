import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AttendeeLite = { id: string; artistId: string };
type ProfileLite = { id: string; artistId: string; name: string };
type GatheringWithAttendees = {
  id: string;
  title: string;
  theme: string | null;
  location: string | null;
  note: string | null;
  happenedAt: Date;
  attendees: AttendeeLite[];
};

/** Unordered pair key, restricted to a target set. */
function pairsWithin(ids: string[], target: Set<string>): Set<string> {
  const inSet = [...new Set(ids)].filter((id) => target.has(id));
  const out = new Set<string>();
  for (let i = 0; i < inSet.length; i++) {
    for (let j = i + 1; j < inSet.length; j++) {
      out.add([inSet[i], inSet[j]].sort().join("|"));
    }
  }
  return out;
}

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const gatherings = await prisma.gathering.findMany({
      orderBy: { happenedAt: "desc" },
      take: 100,
      include: { attendees: { select: { id: true, artistId: true } } },
    }) as GatheringWithAttendees[];

    const allArtistIds = [...new Set(gatherings.flatMap((g) => g.attendees.map((a) => a.artistId)))];
    const profiles = (allArtistIds.length > 0 ? await prisma.artistProfile.findMany({
      where: { id: { in: allArtistIds } },
      select: { id: true, artistId: true, name: true },
    }) : []) as ProfileLite[];
    const nameMap = new Map<string, ProfileLite>(profiles.map((p) => [p.id, p] as const));

    const result = gatherings.map((g) => ({
      id: g.id,
      title: g.title,
      theme: g.theme,
      location: g.location,
      note: g.note,
      happenedAt: g.happenedAt,
      attendees: g.attendees.map((a) => ({
        artistId: a.artistId,
        name: nameMap.get(a.artistId)?.name ?? "(unknown)",
        publicId: nameMap.get(a.artistId)?.artistId ?? null,
      })),
      attendeeCount: g.attendees.length,
    }));

    return NextResponse.json({ gatherings: result });
  } catch (e) {
    console.error("GET /api/admin/gatherings failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const theme = body?.theme ? String(body.theme).trim() : null;
    const location = body?.location ? String(body.location).trim() : null;
    const noteText = body?.note ? String(body.note).trim() : null;
    const happenedAt = body?.happenedAt ? new Date(body.happenedAt) : new Date();
    if (Number.isNaN(happenedAt.getTime())) {
      return NextResponse.json({ error: "invalid happenedAt" }, { status: 400 });
    }

    const requestedIds = Array.isArray(body?.artistIds)
      ? [...new Set(body.artistIds.map((v: unknown) => String(v || "").trim()).filter(Boolean))] as string[]
      : [];

    // Only keep artist profile ids that actually exist (avoids FK errors).
    const validProfiles = (requestedIds.length > 0 ? await prisma.artistProfile.findMany({
      where: { id: { in: requestedIds } },
      select: { id: true },
    }) : []) as { id: string }[];
    const attendeeIds: string[] = validProfiles.map((p) => p.id);

    const gathering = await prisma.gathering.create({
      data: {
        title,
        theme,
        location,
        note: noteText,
        happenedAt,
        createdBy: admin.email,
        attendees: { create: attendeeIds.map((artistId: string) => ({ artistId })) },
      },
      include: { attendees: { select: { id: true, artistId: true } } },
    }) as GatheringWithAttendees;

    // ---- Recap: how many attendee pairs are connected for the FIRST time ----
    const target = new Set(attendeeIds);
    const n = attendeeIds.length;
    const totalPairs = (n * (n - 1)) / 2;

    const priorPairs = new Set<string>();
    if (n >= 2) {
      // prior gatherings (excluding the one we just created)
      const priorGatheringRows = await prisma.gatheringAttendee.findMany({
        where: { artistId: { in: attendeeIds }, gatheringId: { not: gathering.id } },
        select: { gatheringId: true, artistId: true },
      }) as { gatheringId: string; artistId: string }[];
      const byGathering = new Map<string, string[]>();
      for (const r of priorGatheringRows) {
        const arr = byGathering.get(r.gatheringId) ?? [];
        arr.push(r.artistId);
        byGathering.set(r.gatheringId, arr);
      }
      for (const ids of byGathering.values()) {
        for (const k of pairsWithin(ids, target)) priorPairs.add(k);
      }

      // prior exhibitions
      const exhibitionRows = await prisma.exhibitionArtist.findMany({
        where: { artistId: { in: attendeeIds }, status: "confirmed" },
        select: { exhibitionId: true, artistId: true },
      }) as { exhibitionId: string; artistId: string }[];
      const byExhibition = new Map<string, string[]>();
      for (const r of exhibitionRows) {
        const arr = byExhibition.get(r.exhibitionId) ?? [];
        arr.push(r.artistId);
        byExhibition.set(r.exhibitionId, arr);
      }
      for (const ids of byExhibition.values()) {
        for (const k of pairsWithin(ids, target)) priorPairs.add(k);
      }
    }

    const newConnections = Math.max(0, totalPairs - priorPairs.size);

    const profiles = (attendeeIds.length > 0 ? await prisma.artistProfile.findMany({
      where: { id: { in: attendeeIds } },
      select: { id: true, name: true, artistId: true },
    }) : []) as ProfileLite[];
    const nameMap = new Map<string, ProfileLite>(profiles.map((p) => [p.id, p] as const));

    return NextResponse.json({
      ok: true,
      gathering: {
        id: gathering.id,
        title: gathering.title,
        theme: gathering.theme,
        happenedAt: gathering.happenedAt,
        attendees: gathering.attendees.map((a) => ({
          artistId: a.artistId,
          name: nameMap.get(a.artistId)?.name ?? "(unknown)",
          publicId: nameMap.get(a.artistId)?.artistId ?? null,
        })),
      },
      recap: {
        attendeeCount: n,
        totalPairs,
        newConnections,
        returningPairs: priorPairs.size,
        skipped: requestedIds.length - attendeeIds.length,
      },
    });
  } catch (e) {
    console.error("POST /api/admin/gatherings failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
