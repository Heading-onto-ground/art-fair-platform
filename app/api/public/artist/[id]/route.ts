import { NextResponse } from "next/server";
import { getProfileByUserId } from "@/lib/auth";

function decodeDataUri(dataUri: string): { mime: string; bytes: Buffer } | null {
  const m = dataUri.match(/^data:([^;,]+)?(?:;[^,]*)?,(.+)$/i);
  if (!m?.[2]) return null;
  const mime = String(m[1] || "application/octet-stream").toLowerCase();
  const payload = String(m[2] || "");
  const isBase64 = /;base64,/i.test(dataUri);
  try {
    const bytes = isBase64
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8");
    return { mime, bytes };
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id);
    const { searchParams } = new URL(req.url);
    const view = String(searchParams.get("view") || "").trim().toLowerCase();

    const profile = await getProfileByUserId(id);

    // ✅ artist 프로필만 공개
    if (!profile || profile.role !== "artist") {
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
      );
    }

    if (view === "portfolio") {
      const portfolioUrl = String(profile.portfolioUrl || "").trim();
      if (!portfolioUrl) {
        return NextResponse.json({ ok: false, error: "portfolio not found" }, { status: 404 });
      }
      if (portfolioUrl.startsWith("data:")) {
        const decoded = decodeDataUri(portfolioUrl);
        if (!decoded) {
          return NextResponse.json({ ok: false, error: "invalid portfolio data" }, { status: 400 });
        }
        const contentType =
          decoded.mime.includes("pdf") || decoded.mime === "application/octet-stream"
            ? "application/pdf"
            : decoded.mime;
        return new NextResponse(decoded.bytes, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename="portfolio-${id}.pdf"`,
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          },
        });
      }
      return NextResponse.redirect(portfolioUrl, { status: 302 });
    }

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e) {
    console.error("GET /api/public/artist/[id] failed:", e);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}
