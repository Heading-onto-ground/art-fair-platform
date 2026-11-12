import { NextResponse } from "next/server";
import { enforceRateLimit, requireUserSession } from "@/lib/apiGuards";
import { isProDiscoveryEnabled } from "@/lib/pro/discoveryFlag";

export function proGate(req: Request, rateKey: string, max = 30): NextResponse | { userId: string } {
  if (!isProDiscoveryEnabled()) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const limited = enforceRateLimit(req, rateKey, max, 60_000);
  if (limited) return limited;
  const { session, error } = requireUserSession();
  if (error || !session) return error ?? NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return { userId: session.userId };
}

export function isProGateResponse(value: NextResponse | { userId: string }): value is NextResponse {
  return value instanceof NextResponse;
}
