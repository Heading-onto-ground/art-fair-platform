import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = getServerSession();

    if (!session) {
      return NextResponse.json(
        { session: null, profile: null },
        { status: 200 }
      );
    }

    const profile = await getProfileByUserId(session.userId);

    return NextResponse.json(
      { session, profile: profile ?? null },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/auth/me failed:", e);
    const details =
      process.env.NODE_ENV !== "production"
        ? e instanceof Error
          ? e.message
          : String(e)
        : undefined;
    return NextResponse.json(
      { session: null, profile: null, error: "server error", details },
      { status: 500 }
    );
  }
}
