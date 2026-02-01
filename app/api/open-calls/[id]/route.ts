import { NextResponse } from "next/server";
import { getOpenCallById } from "@/app/data/openCalls";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const openCall = getOpenCallById(params.id);
    if (!openCall) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ openCall });
  } catch (e) {
    console.error("GET /api/open-calls/[id] failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}