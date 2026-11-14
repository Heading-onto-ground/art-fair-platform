import { NextResponse } from "next/server";
import { getOpenCallById } from "@/app/data/openCalls";
import { getServerSession } from "@/lib/auth";
import { clearPreparation, readPreparation, savePreparation } from "@/lib/openCall/preparationStore";
import { parsePreparationStatus } from "@/lib/openCall/preparationStatus";

export const dynamic = "force-dynamic";

function artistId() {
  const session = getServerSession();
  if (!session || session.role !== "artist") return null;
  return session.userId;
}

async function existingCall(openCallId: string) {
  const openCall = await getOpenCallById(openCallId);
  return openCall ? openCall : null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const userId = artistId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await existingCall(params.id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const preparation = await readPreparation(userId, params.id);
    return NextResponse.json({ preparation });
  } catch (error) {
    console.error("GET /api/open-calls/[id]/preparation failed:", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const userId = artistId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await existingCall(params.id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const status = parsePreparationStatus(body?.status);
  if (!status) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const preparation = await savePreparation({
      userId,
      openCallId: params.id,
      status,
      note: body?.note,
    });
    return NextResponse.json({ preparation });
  } catch (error) {
    console.error("PUT /api/open-calls/[id]/preparation failed:", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = artistId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await existingCall(params.id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    await clearPreparation(userId, params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/open-calls/[id]/preparation failed:", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
