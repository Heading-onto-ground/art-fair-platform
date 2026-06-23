import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/a-moim/planning-guide — PDF download (works even when static public path 404s). */
export async function GET(req: Request) {
  try {
    const inline = new URL(req.url).searchParams.get("inline") === "1";
    const filePath = path.join(process.cwd(), "public", "a-moim-planning-guide.pdf");
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": inline
          ? 'inline; filename="A-moim-planning-guide-ROB.pdf"'
          : 'attachment; filename="A-moim-planning-guide-ROB.pdf"',
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (e) {
    console.error("GET /api/a-moim/planning-guide failed:", e);
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }
}
