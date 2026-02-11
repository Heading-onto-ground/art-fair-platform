import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { sendOutreachEmail, sendBatchOutreach, listOutreachRecords, getOutreachStats } from "@/lib/outreach";

export const dynamic = "force-dynamic";

// GET: Fetch outreach records and stats
export async function GET() {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const records = await listOutreachRecords();
    const stats = await getOutreachStats();

    return NextResponse.json({ records, stats });
  } catch (e) {
    console.error("GET /api/outreach failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// POST: Send outreach emails
export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

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

      const result = await sendBatchOutreach(galleries);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/outreach failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
