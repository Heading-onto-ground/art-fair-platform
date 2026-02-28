import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { artistId } = await req.json();
    if (!artistId || typeof artistId !== "string") {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS public_page_views (
        id SERIAL PRIMARY KEY,
        artist_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`;

    await prisma.$executeRaw`
      INSERT INTO public_page_views (artist_id) VALUES (${artistId})`;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
