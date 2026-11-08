import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/apiGuards";
import { PUBLIC_HISTORY_CACHE_TAG } from "@/lib/history/publicGraph";
import { isSubmittedSourceDecision, reviewSubmittedSource } from "@/lib/history/sourceReview";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { error } = requireAdminSession();
  if (error) return error;
  const body = await request.json().catch(() => null);
  if (!isSubmittedSourceDecision(body?.decision)) {
    return NextResponse.json({ error: "Choose approve or reject." }, { status: 400 });
  }
  const result = await reviewSubmittedSource(prisma, { sourceId: params.id, decision: body.decision });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  revalidateTag(PUBLIC_HISTORY_CACHE_TAG);
  return NextResponse.json({
    ok: true,
    sourceClearance: result.sourceClearance,
    exhibitions: result.exhibitions,
  });
}
