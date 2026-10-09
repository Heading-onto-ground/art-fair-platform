import { NextResponse } from "next/server";
import { enforceRateLimit, requireUserSession } from "@/lib/apiGuards";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import { createArtistRecord } from "@/lib/history/mutate";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "history-create-artist", 10, 60_000);
  if (limited) return limited;
  const { session, error } = requireUserSession();
  if (error) return error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.canonicalName !== "string") {
    return NextResponse.json({ error: "Artist name is required." }, { status: 400 });
  }
  const birthYear = body.birthYear == null || body.birthYear === "" ? null : Number(body.birthYear);
  if (birthYear != null && (!Number.isInteger(birthYear) || birthYear < 1000 || birthYear > 2100)) {
    return NextResponse.json({ error: "Birth year must be a year." }, { status: 400 });
  }
  try {
    const profile = await prisma.artistProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
    const created = await createArtistRecord({
      canonicalName: body.canonicalName,
      nativeName: typeof body.nativeName === "string" ? body.nativeName : null,
      birthYear,
      city: typeof body.city === "string" ? body.city : null,
      country: typeof body.country === "string" ? body.country : null,
      officialWebsite: typeof body.officialWebsite === "string" ? body.officialWebsite : null,
      profileId: profile?.id ?? null,
    });
    if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 });
    return NextResponse.json({ slug: created.artist.slug });
  } catch (err) {
    if (isMissingHistorySchema(err)) {
      return NextResponse.json({ error: "History records are not available until the schema is applied." }, { status: 503 });
    }
    console.error("create artist failed", err);
    return NextResponse.json({ error: "Could not create the artist." }, { status: 500 });
  }
}
