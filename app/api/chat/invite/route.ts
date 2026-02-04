import { NextResponse } from "next/server";
import { createChatRoom, sendMessage } from "@/lib/chat";
import { getServerSession } from "@/lib/auth";
import { getOpenCallById } from "@/app/data/openCalls";
import { addInvite } from "@/app/data/invites";
import { getTemplates } from "@/app/data/inviteTemplates";
import { getProfileByUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (session.role !== "gallery") {
      return NextResponse.json({ error: "only galleries can invite" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const openCallId = String(body?.openCallId ?? "").trim();
    const artistId = String(body?.artistId ?? "").trim();
    const text = String(body?.message ?? "").trim();

    if (!openCallId || !artistId) {
      return NextResponse.json({ error: "missing openCallId/artistId" }, { status: 400 });
    }

    const openCall = getOpenCallById(openCallId);
    if (!openCall) {
      return NextResponse.json({ error: "open call not found" }, { status: 404 });
    }
    if (openCall.galleryId !== session.userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const roomId = await createChatRoom(openCallId, artistId, session.userId);
    const tpl = getTemplates(session.userId);
    const base =
      openCall.country === "한국"
        ? tpl.korea
        : openCall.country === "일본"
        ? tpl.japan
        : tpl.global;
    const artistProfile = await getProfileByUserId(artistId);
    const artistName =
      artistProfile && artistProfile.role === "artist"
        ? artistProfile.name || artistProfile.userId
        : artistId;
    const message =
      text ||
      base
        .replaceAll("{{gallery}}", openCall.gallery)
        .replaceAll("{{theme}}", openCall.theme)
        .replaceAll("{{artist}}", artistName)
        .replaceAll("{{deadline}}", openCall.deadline)
        .replaceAll("{{city}}", openCall.city)
        .replaceAll("{{country}}", openCall.country);

    await sendMessage(roomId, session.userId, "gallery", message);
    addInvite({
      galleryId: session.userId,
      artistId,
      openCallId,
      message,
    });

    return NextResponse.json({ roomId }, { status: 200 });
  } catch (e) {
    console.error("POST /api/chat/invite failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
