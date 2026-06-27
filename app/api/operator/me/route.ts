import { NextResponse } from "next/server";
import { getOperatorContext } from "@/lib/operatorAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getOperatorContext();
  if (!ctx) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, isSuperAdmin: ctx.isSuperAdmin, actor: ctx.actor });
}
