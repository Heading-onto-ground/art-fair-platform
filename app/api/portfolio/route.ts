import { NextResponse } from "next/server";
import { getProfileByUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }

    const profile = await getProfileByUserId(id);
    if (!profile || profile.role !== "artist") {
      return NextResponse.json({ error: "artist not found" }, { status: 404 });
    }

    const portfolioUrl = String(profile.portfolioUrl || "").trim();
    if (!portfolioUrl) {
      return NextResponse.json({ error: "portfolio not found" }, { status: 404 });
    }

    if (portfolioUrl.startsWith("data:")) {
      const decoded = decodeDataUri(portfolioUrl);
      if (!decoded) {
        return NextResponse.json({ error: "invalid portfolio data" }, { status: 400 });
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
          "Cache-Control": "private, no-store, no-cache, must-revalidate",
        },
      });
    }

    return NextResponse.redirect(portfolioUrl, { status: 302 });
  } catch (e) {
    console.error("GET /api/portfolio failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

