import { NextResponse } from "next/server";
import { findUserByEmailRole, getProfileByUserId } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { verifyByToken } from "@/lib/emailVerification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "artist" | "gallery";

function redirectToLogin(status: "success" | "expired" | "invalid" | "server") {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.rob-roleofbridge.com";
  return NextResponse.redirect(`${appUrl}/login?verified=${status}`);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = String(url.searchParams.get("token") || "").trim();
    const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
    const role = String(url.searchParams.get("role") || "").trim() as Role;

    if (!token || !email || (role !== "artist" && role !== "gallery")) {
      return redirectToLogin("invalid");
    }

    const result = await verifyByToken({ token, email, role });
    if (!result.ok) {
      return redirectToLogin(result.reason === "expired" ? "expired" : "invalid");
    }

    if (!result.alreadyVerified) {
      const user = await findUserByEmailRole(email, role);
      if (user) {
        const profile = await getProfileByUserId(user.id).catch(() => null);
        const name =
          role === "artist"
            ? (profile as any)?.name || ""
            : (profile as any)?.name || "";
        sendWelcomeEmail({ to: email, role, name, lang: "en" }).catch(() => null);
      }
    }
    return redirectToLogin("success");
  } catch (e) {
    console.error("GET /api/auth/verify failed:", e);
    return redirectToLogin("server");
  }
}

