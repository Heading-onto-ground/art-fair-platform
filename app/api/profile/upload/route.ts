// app/api/profile/upload/route.ts
import { NextResponse } from "next/server";
import { getServerSession, upsertArtistProfile } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file missing" }, { status: 400 });
    }

    const isPdfMime =
      file.type === "application/pdf" ||
      file.type === "application/x-pdf" ||
      file.type === "application/acrobat" ||
      file.type === "applications/vnd.pdf";
    const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfMime && !hasPdfExtension) {
      return NextResponse.json({ ok: false, error: "only pdf allowed" }, { status: 400 });
    }

    // Keep upload size conservative to prevent oversized DB payloads.
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ ok: false, error: "file too large (max 5MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const portfolioUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;

    // 프로필에 저장
    const profile = await upsertArtistProfile(session.userId, {
      portfolioUrl,
    });

    return NextResponse.json({ ok: true, portfolioUrl, profile }, { status: 200 });
  } catch (e) {
    console.error("POST /api/profile/upload failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
