import { NextResponse } from "next/server";
import { getAboutContent } from "@/lib/aboutContent";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const content = await getAboutContent();
    return NextResponse.json(
      { content },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    console.error("GET /api/about failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

