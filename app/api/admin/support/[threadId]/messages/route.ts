import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import {
  addAdminMessage,
  getThreadForAdmin,
  listMessagesForThread,
  validateSupportText,
} from "@/lib/adminSupport";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const threadId = params.threadId;
    const thread = await getThreadForAdmin(threadId);
    if (!thread) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const messages = await listMessagesForThread(threadId);

    return NextResponse.json({
      ok: true,
      thread: {
        id: thread.id,
        userId: thread.userId,
        userEmail: thread.user.email,
        userRole: thread.user.role,
      },
      messages: messages.map((m) => ({
        id: m.id,
        fromAdmin: m.fromAdmin,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("GET admin support messages failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const threadId = params.threadId;
    const thread = await getThreadForAdmin(threadId);
    if (!thread) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
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

    const msg = await addAdminMessage(threadId, text.trim());

    return NextResponse.json({
      ok: true,
      message: {
        id: msg.id,
        fromAdmin: msg.fromAdmin,
        text: msg.text,
        createdAt: msg.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("POST admin support messages failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
