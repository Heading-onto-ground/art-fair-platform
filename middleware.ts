import { NextRequest, NextResponse } from "next/server";
import { PROTECTED_PREFIXES } from "@/lib/routes";

// Admin routes (require admin session cookie)
const ADMIN_PREFIX = "/admin";
const ADMIN_LOGIN = "/admin/login";

// Auth pages — always allow access.
// Rationale: cookie presence alone does not guarantee a valid session,
// and strict redirect here can lock users out of the login screen.
const AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];

function applySecurityHeaders(res: NextResponse, isProduction: boolean, allowFraming = false) {
  if (allowFraming) {
    // Embed widget pages must be iframe-able from any site.
    // CSP frame-ancestors takes precedence over X-Frame-Options in modern browsers.
    res.headers.set("Content-Security-Policy", "frame-ancestors *");
  } else {
    res.headers.set("X-Frame-Options", "SAMEORIGIN");
  }
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (isProduction) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProduction = process.env.NODE_ENV === "production";

  // ── Embeddable widget routes (public, iframe-able) ────────────────────────
  if (pathname.startsWith("/embed/")) {
    return applySecurityHeaders(NextResponse.next(), isProduction, true);
  }

  const hasSession = req.cookies.has("afp_session");
  const hasAdminSession = req.cookies.has("afp_admin_session");
  const isAdminArtistPreview =
    pathname === "/artist/me" &&
    req.nextUrl.searchParams.get("adminView") === "1";

  // ── Admin routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith(ADMIN_PREFIX) && pathname !== ADMIN_LOGIN) {
    if (!hasAdminSession) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(ADMIN_LOGIN, req.url)),
        isProduction
      );
    }
    return applySecurityHeaders(NextResponse.next(), isProduction);
  }

  // ── Auth pages ─────────────────────────────────────────────────────────────
  if (AUTH_PATHS.some((p) => pathname === p)) {
    return applySecurityHeaders(NextResponse.next(), isProduction);
  }

  // ── Protected user routes ─────────────────────────────────────────────────
  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    // Allow admin read-only preview on artist page when admin session exists.
    if (isAdminArtistPreview && hasAdminSession) {
      return applySecurityHeaders(NextResponse.next(), isProduction);
    }
    if (!hasSession) {
      const loginUrl = new URL("/login", req.url);
      // Preserve the destination so login can redirect back after auth
      if (pathname !== "/") {
        loginUrl.searchParams.set("redirect", pathname);
      }
      return applySecurityHeaders(NextResponse.redirect(loginUrl), isProduction);
    }
    return applySecurityHeaders(NextResponse.next(), isProduction);
  }

  return applySecurityHeaders(NextResponse.next(), isProduction);
}

export const config = {
  // Run on all routes except Next.js internals, static files, and API routes
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
