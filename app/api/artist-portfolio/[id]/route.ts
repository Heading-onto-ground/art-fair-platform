import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { getProfileByUserId, getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function decodeDataUri(dataUri: string): { mime: string; bytes: Buffer } | null {
  if (!dataUri.startsWith("data:")) return null;
  const comma = dataUri.indexOf(",");
  if (comma < 0) return null;
  const meta = dataUri.slice(5, comma);
  const payload = dataUri.slice(comma + 1);
  const mime = (meta.split(";")[0] || "application/octet-stream").toLowerCase();
  const isBase64 = meta.toLowerCase().includes("base64");
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
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params.id || "").trim();
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    const profile = await getProfileByUserId(id);
    if (!profile || profile.role !== "artist") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const portfolioUrl = String(profile.portfolioUrl || "").trim();
    if (!portfolioUrl) {
      return NextResponse.json({ error: "portfolio not found" }, { status: 404 });
    }

    const publicProfile = (profile as { exhibitions_public?: boolean }).exhibitions_public === true;
    const session = getServerSession();
    const owner = session?.role === "artist" && session.userId === id;
    if (!publicProfile && !owner && !getAdminSession()) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
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
      return new NextResponse(new Uint8Array(decoded.bytes), {
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
    console.error("GET /api/artist-portfolio/[id] failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

