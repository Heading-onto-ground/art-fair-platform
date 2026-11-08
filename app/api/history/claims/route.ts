import { NextResponse } from "next/server";
import { enforceRateLimit, requireUserSession } from "@/lib/apiGuards";
import { getServerSession } from "@/lib/auth";
import { claimState } from "@/lib/history/contribution";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import { submitClaim } from "@/lib/history/mutate";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("artist")?.trim() ?? "";
  if (!slug) return NextResponse.json({ error: "Artist is required." }, { status: 400 });
  const session = getServerSession();
  if (!session) return NextResponse.json({ status: "NONE" });
  try {
    const artist = await prisma.artistEntity.findUnique({ where: { slug }, select: { id: true } });
    if (!artist) return NextResponse.json({ status: "NONE" });
    const rows = await prisma.artistEntityClaim.findMany({
      where: { artistEntityId: artist.id, userId: session.userId },
      select: { status: true },
    });
    return NextResponse.json({ status: claimState(rows.map((row: { status: string }) => row.status)) });
  } catch (err) {
    if (isMissingHistorySchema(err)) return NextResponse.json({ status: "NONE" });
    console.error("claim status failed", err);
    return NextResponse.json({ error: "Could not read the claim." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "history-claim", 10, 60_000);
  if (limited) return limited;
  const { session, error } = requireUserSession();
  if (error) return error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.slug !== "string") {
    return NextResponse.json({ error: "Artist is required." }, { status: 400 });
  }
  try {
    const result = await submitClaim({
      slug: body.slug,
      userId: session.userId,
      note: typeof body.note === "string" ? body.note : null,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
    return NextResponse.json({ status: result.status, alreadyPending: result.alreadyPending });
  } catch (err) {
    if (isMissingHistorySchema(err)) {
      return NextResponse.json({ error: "History records are not available until the schema is applied." }, { status: 503 });
    }
    console.error("claim failed", err);
    return NextResponse.json({ error: "Could not submit the claim." }, { status: 500 });
  }
}
