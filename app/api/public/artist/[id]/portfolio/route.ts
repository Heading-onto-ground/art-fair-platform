import { NextResponse } from "next/server";
import { getProfileByUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

function decodeDataUriPdf(dataUri: string): Buffer | null {
  const m = dataUri.match(/^data:application\/pdf;base64,(.+)$/i);
  if (!m?.[1]) return null;
  try {
    return Buffer.from(m[1], "base64");
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id || "");
    if (!id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }

    const profile = await getProfileByUserId(id);
    if (!profile || profile.role !== "artist") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const portfolioUrl = String(profile.portfolioUrl || "").trim();
    if (!portfolioUrl) {
      return NextResponse.json({ error: "portfolio not found" }, { status: 404 });
    }

    // Handle legacy uploaded data URI PDFs safely for browsers.
    if (portfolioUrl.startsWith("data:application/pdf;base64,")) {
      const bytes = decodeDataUriPdf(portfolioUrl);
      if (!bytes) {
        return NextResponse.json({ error: "invalid portfolio data" }, { status: 400 });
      }
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="portfolio-${id}.pdf"`,
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      });
    }

    // For URL-based portfolios, redirect directly.
    return NextResponse.redirect(portfolioUrl, { status: 302 });
  } catch (e) {
    console.error("GET /api/public/artist/[id]/portfolio failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

