import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const KINDS = new Set(["incorrect", "identity", "date", "removal", "source"]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const kind = typeof body?.kind === "string" ? body.kind : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!KINDS.has(kind) || note.length < 3 || note.length > 1000) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await prisma.historyCorrectionReport.create({
    data: {
      kind,
      note,
      exhibitionId: typeof body?.exhibitionId === "string" ? body.exhibitionId.slice(0, 80) : null,
      artistSlug: typeof body?.artistSlug === "string" ? body.artistSlug.slice(0, 80) : null,
    },
  });
  return NextResponse.json({ ok: true });
}
