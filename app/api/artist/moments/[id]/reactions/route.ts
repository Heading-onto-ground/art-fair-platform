/**
 * POST /api/artist/moments/[id]/reactions
 * Add or toggle reaction on a moment.
 * Body: { reactionType: "fire" | "mind_blown" | "eyes" | "brain" }
 * Toggle: if user already has this reaction, remove; else add/update.
 */

import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = ["fire", "mind_blown", "eyes", "brain"] as const;

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const momentId = params.id;
    const body = await req.json().catch(() => null);
    const reactionType = String(body?.reactionType || "").toLowerCase();

    if (!VALID_TYPES.includes(reactionType as (typeof VALID_TYPES)[number])) {
      return NextResponse.json(
        { ok: false, error: "invalid reaction type" },
        { status: 400 }
      );
    }

    const moment = await prisma.artistMoment.findUnique({
      where: { id: momentId },
    });
    if (!moment) {
      return NextResponse.json({ ok: false, error: "moment not found" }, { status: 404 });
    }

    const existing = await prisma.momentReaction.findUnique({
      where: {
        momentId_userId: { momentId, userId: session.userId },
      },
    });

    if (existing) {
      if (existing.reactionType === reactionType) {
        await prisma.momentReaction.delete({
          where: { id: existing.id },
        });
      } else {
        await prisma.momentReaction.update({
          where: { id: existing.id },
          data: { reactionType },
        });
      }
    } else {
      await prisma.momentReaction.create({
        data: {
          momentId,
          userId: session.userId,
          reactionType,
        },
      });
    }

    const counts = await prisma.momentReaction.groupBy({
      by: ["reactionType"],
      where: { momentId },
      _count: true,
    });

    const reactions: Record<string, number> = {};
    for (const r of counts) {
      reactions[r.reactionType] = r._count;
    }

    const wasRemoved =
      existing?.reactionType === reactionType;
    return NextResponse.json({
      ok: true,
      action: wasRemoved ? "removed" : existing ? "updated" : "added",
      reactionType: wasRemoved ? null : reactionType,
      reactions,
    });
  } catch (e) {
    console.error("POST /api/artist/moments/[id]/reactions failed:", e);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}
