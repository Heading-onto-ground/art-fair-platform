import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { createOpenCall } from "@/app/data/openCalls";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.gallery || !body?.deadline || !body?.country || !body?.city || !body?.theme) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const oc = await createOpenCall({
    galleryId: `__admin_${Date.now()}`,
    gallery: String(body.gallery),
    city: String(body.city),
    country: String(body.country),
    theme: String(body.theme),
    deadline: String(body.deadline),
    exhibitionDate: body.exhibitionDate ? String(body.exhibitionDate) : undefined,
    isExternal: true,
    externalEmail: body.externalEmail ? String(body.externalEmail) : undefined,
    externalUrl: body.externalUrl ? String(body.externalUrl) : undefined,
    galleryWebsite: body.galleryWebsite ? String(body.galleryWebsite) : undefined,
    galleryDescription: body.galleryDescription ? String(body.galleryDescription) : undefined,
  });

  return NextResponse.json({ openCall: oc }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  await prisma.openCall.delete({ where: { id: String(id) } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
