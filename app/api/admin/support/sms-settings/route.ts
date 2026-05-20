import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { getAdminSupportSmsTo, setAdminSupportSmsTo } from "@/lib/adminSettings";

export const dynamic = "force-dynamic";

function normalizePhone(input: unknown): string {
  return String(input || "").replace(/\s+/g, "").trim();
}

function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export async function GET() {
  const admin = getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const smsTo = await getAdminSupportSmsTo();
  return NextResponse.json({ ok: true, smsTo: smsTo || "" });
}

export async function POST(req: Request) {
  const admin = getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const smsTo = normalizePhone(body?.smsTo);

  if (!smsTo) {
    await setAdminSupportSmsTo(null);
    return NextResponse.json({ ok: true, smsTo: "" });
  }

  if (!isValidE164(smsTo)) {
    return NextResponse.json(
      { ok: false, error: "invalid_phone_format", message: "Phone must be E.164 format like +821012345678" },
      { status: 400 }
    );
  }

  await setAdminSupportSmsTo(smsTo);
  return NextResponse.json({ ok: true, smsTo });
}
