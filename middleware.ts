import { NextRequest, NextResponse } from "next/server";

// Routes that require a logged-in user session
const PROTECTED_PREFIXES = [
  "/artist/me",
  "/gallery/me",
  "/curator/me",
  "/chat",
  "/shipments",
  "/feed",
  "/network",
  "/discover",
  "/exhibitions/new",
];

// Admin routes (require admin session cookie)
const ADMIN_PREFIX = "/admin";
const ADMIN_LOGIN = "/admin/login";

// Auth pages — redirect away if already logged in
const AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasSession = req.cookies.has("afp_session");
  const hasAdminSession = req.cookies.has("afp_admin_session");

  // ── Admin routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith(ADMIN_PREFIX) && pathname !== ADMIN_LOGIN) {
    if (!hasAdminSession) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN, req.url));
    }
    return NextResponse.next();
  }

  // ── Redirect logged-in users away from auth pages ─────────────────────────
  if (AUTH_PATHS.some((p) => pathname === p)) {
    if (hasSession) {
      // Let client-side handle role-based destination — just go home
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // ── Protected user routes ─────────────────────────────────────────────────
  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (!hasSession) {
      const loginUrl = new URL("/login", req.url);
      // Preserve the destination so login can redirect back after auth
      if (pathname !== "/") {
        loginUrl.searchParams.set("redirect", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals, static files, and API routes
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
