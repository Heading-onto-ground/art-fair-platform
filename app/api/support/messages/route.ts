import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  addUserMessage,
  getOrCreateThread,
  listMessagesForThread,
  readByRecipientForSupportMessage,
  tryRefreshReadReceiptsAfterUserOpen,
  validateSupportText,
} from "@/lib/adminSupport";

export const dynamic = "force-dynamic";

/** Logged-in user: list messages in their admin support thread */
export async function GET() {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const thread = await getOrCreateThread(session.userId);
    const messages = await listMessagesForThread(thread.id);
    type Row = (typeof messages)[number];

    const { lastReadByUserAt: lur, lastReadByAdminAt: lar } = await tryRefreshReadReceiptsAfterUserOpen(thread.id);

    return NextResponse.json({
      ok: true,
      threadId: thread.id,
      messages: messages.map((m: Row) => ({
        id: m.id,
        fromAdmin: m.fromAdmin,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
        readByRecipient: readByRecipientForSupportMessage(m.fromAdmin, m.createdAt, lur, lar),
      })),
    });
  } catch (e) {
    console.error("GET /api/support/messages failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

/** Logged-in user: send a message to admin */
export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text : "";
    const err = validateSupportText(text);
    if (err === "empty") {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    if (err === "too_long") {
      return NextResponse.json({ error: "message too long" }, { status: 400 });
    }

    const msg = await addUserMessage(session.userId, text.trim());

    return NextResponse.json({
      ok: true,
      message: {
        id: msg.id,
        fromAdmin: msg.fromAdmin,
        text: msg.text,
        createdAt: msg.createdAt.toISOString(),
        readByRecipient: false,
      },
    });
  } catch (e) {
    console.error("POST /api/support/messages failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
