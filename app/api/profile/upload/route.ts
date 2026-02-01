// app/api/profile/upload/route.ts
import { NextResponse } from "next/server";
import { getServerSession, upsertArtistProfile } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

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

    // PDF만 허용
    if (file.type !== "application/pdf") {
      return NextResponse.json({ ok: false, error: "only pdf allowed" }, { status: 400 });
    }

    // 저장 경로 준비
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${session.userId}_${Date.now()}_${safeName}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const fullPath = path.join(uploadDir, filename);
    await fs.writeFile(fullPath, buffer);

    const portfolioUrl = `/uploads/${filename}`;

    // 프로필에 저장
    const profile = await upsertArtistProfile(session.userId, {
      email: session.email,
      portfolioUrl,
    });

    return NextResponse.json({ ok: true, portfolioUrl, profile }, { status: 200 });
  } catch (e) {
    console.error("POST /api/profile/upload failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
