import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { prisma as untypedPrisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/apiGuards";
import { reviewClaim } from "@/lib/history/mutate";
import { isMissingHistorySchema } from "@/lib/history/schemaError";

const prisma = untypedPrisma as PrismaClient;

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = requireAdminSession();
  if (error) return error;
  try {
    const claims = await prisma.artistEntityClaim.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" },
      include: {
        artist: { select: { slug: true, canonicalName: true, nativeName: true } },
        user: { select: { id: true, email: true } },
      },
      take: 100,
    });
    return NextResponse.json({
      claims: claims.map((claim) => ({
        id: claim.id,
        status: claim.status,
        submittedAt: claim.submittedAt,
        note: claim.note,
        artist: claim.artist,
        user: { id: claim.user.id, email: claim.user.email },
      })),
    });
  } catch (err) {
    if (isMissingHistorySchema(err)) return NextResponse.json({ claims: [], unavailable: true });
    console.error("list claims failed", err);
    return NextResponse.json({ error: "Could not list claims." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { admin, error } = requireAdminSession();
  if (error) return error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string" || (body.status !== "APPROVED" && body.status !== "REJECTED")) {
    return NextResponse.json({ error: "A claim and a review status are required." }, { status: 400 });
  }
  try {
    const result = await reviewClaim({ id: body.id, status: body.status, reviewedBy: admin.email });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ status: result.claim.status });
  } catch (err) {
    if (isMissingHistorySchema(err)) {
      return NextResponse.json({ error: "History records are not available until the schema is applied." }, { status: 503 });
    }
    console.error("review claim failed", err);
    return NextResponse.json({ error: "Could not review the claim." }, { status: 500 });
  }
}
