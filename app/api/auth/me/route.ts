import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeProfile(profile: any, lite: boolean) {
  if (!profile) return null;
  if (!lite) return profile;

  // TopBar and lightweight callers don't need heavy text/blob-like fields.
  const cloned = { ...profile };
  delete (cloned as any).bio;
  delete (cloned as any).profileImage;

  const portfolioUrl = String((cloned as any).portfolioUrl || "");
  if (portfolioUrl.startsWith("data:")) {
    delete (cloned as any).portfolioUrl;
  }
  return cloned;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lite = searchParams.get("lite") === "1";
    const session = getServerSession();

    if (!session) {
      const res = NextResponse.json(
        { session: null, profile: null },
        { status: 200 }
      );
      if (lite) {
        res.headers.set("Cache-Control", "private, max-age=20, stale-while-revalidate=60");
      }
      return res;
    }

    const profile = await getProfileByUserId(session.userId);

    const res = NextResponse.json(
      { session, profile: sanitizeProfile(profile ?? null, lite) },
      { status: 200 }
    );
    if (lite) {
      res.headers.set("Cache-Control", "private, max-age=20, stale-while-revalidate=60");
    }
    return res;
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
