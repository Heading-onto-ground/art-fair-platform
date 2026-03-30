import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/profile/image/upload
 *
 * multipart/form-data로 이미지 파일을 받아 Vercel Blob에 업로드하고
 * DB에 URL을 저장합니다.
 *
 * 필요한 환경 변수: BLOB_READ_WRITE_TOKEN
 * Vercel 대시보드 > Storage > Blob에서 발급
 */
export async function POST(req: NextRequest) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "no file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "invalid file type" }, { status: 400 });
    }

    // 5MB 제한
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "file too large (max 5MB)" }, { status: 400 });
    }

    // BLOB_READ_WRITE_TOKEN이 없으면 base64 fallback 방식 사용
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({
        ok: false,
        error: "BLOB_READ_WRITE_TOKEN not configured. Set this in your Vercel project settings.",
        fallback: true,
      }, { status: 503 });
    }

    const { put } = await import("@vercel/blob");

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `profiles/${session.userId}-${Date.now()}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });

    // DB에 URL 저장
    if (session.role === "artist") {
      await prisma.artistProfile.update({
        where: { userId: session.userId },
        data: { profileImage: blob.url },
      });
    } else if (session.role === "gallery") {
      await prisma.galleryProfile.update({
        where: { userId: session.userId },
        data: { profileImage: blob.url },
      });
    } else if (session.role === "curator") {
      await prisma.curatorProfile.update({
        where: { userId: session.userId },
        data: { profileImage: blob.url },
      });
    }

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e) {
    console.error("POST /api/profile/image/upload failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
