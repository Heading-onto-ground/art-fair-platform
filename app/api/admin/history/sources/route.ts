import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/apiGuards";
import { prisma } from "@/lib/prisma";
import { listSubmittedSources } from "@/lib/history/sourceReview";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { error } = requireAdminSession();
  if (error) return error;
  const status = new URL(request.url).searchParams.get("status");
  if (status !== "REVIEW_REQUIRED") {
    return NextResponse.json({ error: "This queue only lists sources waiting for review." }, { status: 400 });
  }
  const sources = await listSubmittedSources(prisma, status);
  return NextResponse.json({ sources });
}
