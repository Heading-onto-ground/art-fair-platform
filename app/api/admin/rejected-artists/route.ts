import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import {
  listAdminRejectedArtistTestimonies,
  reviewRejectedArtistTestimony,
  type RejectedArtistStatus,
} from "@/lib/rejectedArtists";
import { sanitizeText } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseStatus(input: string): RejectedArtistStatus | undefined {
  if (input === "pending" || input === "published" || input === "rejected") return input;
  return undefined;
}

export async function GET(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const status = parseStatus(String(url.searchParams.get("status") || "").trim());
    const limitRaw = Number(url.searchParams.get("limit") || "100");
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 100;
    const testimonies = await listAdminRejectedArtistTestimonies({ status, limit });
    return NextResponse.json({ ok: true, testimonies }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/rejected-artists failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const id = sanitizeText(String(body?.id || ""), 64);
    const action = String(body?.action || "").trim();
    const adminNote = sanitizeText(String(body?.adminNote || ""), 1000);

    if (!id || (action !== "publish" && action !== "reject")) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const updated = await reviewRejectedArtistTestimony({
      id,
      action: action as "publish" | "reject",
      adminNote: adminNote || null,
    });
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, testimony: updated }, { status: 200 });
  } catch (e) {
    console.error("PATCH /api/admin/rejected-artists failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
