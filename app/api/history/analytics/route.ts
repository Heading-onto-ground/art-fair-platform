import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isHistoryEvent } from "@/lib/history/policy";
import { isMissingHistorySchema } from "@/lib/history/schemaError";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !isHistoryEvent(body.name)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    await prisma.historySignal.create({
      data: {
        name: body.name,
        path: typeof body.path === "string" ? body.path.slice(0, 300) : null,
      },
    });
  } catch (error) {
    if (!isMissingHistorySchema(error)) console.error("history analytics failed", error);
  }
  return NextResponse.json({ ok: true });
}
