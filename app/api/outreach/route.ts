import { NextResponse } from "next/server";
import { sendOutreachEmail, sendBatchOutreach, listOutreachRecords, getOutreachStats } from "@/lib/outreach";
import { requireAdminSession } from "@/lib/apiGuards";

export const dynamic = "force-dynamic";

const MAX_BATCH_SIZE = 50;

// GET: Fetch outreach records and stats (admin only)
export async function GET() {
  try {
    const { admin, error } = requireAdminSession();
    if (error || !admin) return error!;

    const records = await listOutreachRecords();
    const stats = await getOutreachStats();

    return NextResponse.json({ records, stats });
  } catch (e) {
    console.error("GET /api/outreach failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// POST: Send outreach emails (admin only)
export async function POST(req: Request) {
  try {
    const { admin, error } = requireAdminSession();
    if (error || !admin) return error!;

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "send_single") {
      const { to, galleryName, country, language } = body;
      if (!to || !galleryName || !country) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const result = await sendOutreachEmail({
        to,
        galleryName,
        country,
        language: language || "en",
      });

      return NextResponse.json(result);
    }

    if (action === "send_batch") {
      const { galleries } = body;
      if (!Array.isArray(galleries) || galleries.length === 0) {
        return NextResponse.json({ error: "No galleries provided" }, { status: 400 });
      }
      if (galleries.length > MAX_BATCH_SIZE) {
        return NextResponse.json({ error: `Batch limit is ${MAX_BATCH_SIZE}` }, { status: 400 });
      }

      const result = await sendBatchOutreach(galleries);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/outreach failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
