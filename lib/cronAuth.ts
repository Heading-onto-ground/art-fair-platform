import { verifySession } from "@/lib/session";

type CronAuthOptions = {
  allowDevWithoutSecret?: boolean;
  allowAdminSession?: boolean;
};

function extractBearerToken(req: Request): string {
  const auth = String(req.headers.get("authorization") || "").trim();
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function readCookie(req: Request, name: string): string {
  const header = String(req.headers.get("cookie") || "");
  if (!header) return "";
  const parts = header.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k !== name) continue;
    return decodeURIComponent(rest.join("=") || "");
  }
  return "";
}

function hasValidAdminSession(req: Request): boolean {
  try {
    const token = readCookie(req, "afp_admin_session");
    if (!token) return false;
    const session = verifySession<{ role?: string; isAdmin?: boolean }>(token);
    return !!session && session.role === "admin" && session.isAdmin === true;
  } catch {
    return false;
  }
}

export function isCronAuthorized(req: Request, options?: CronAuthOptions): boolean {
  const expected = String(process.env.CRON_SECRET || "").trim();
  const allowDevWithoutSecret = options?.allowDevWithoutSecret ?? true;
  const allowAdminSession = options?.allowAdminSession ?? false;

  if (allowAdminSession && hasValidAdminSession(req)) {
    return true;
  }

  if (!expected) {
    return allowDevWithoutSecret && process.env.NODE_ENV !== "production";
  }

  const bearer = extractBearerToken(req);
  const headerSecret = String(req.headers.get("x-cron-secret") || "").trim();

  return bearer === expected || headerSecret === expected;
}
