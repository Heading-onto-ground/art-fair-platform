import { NextResponse } from "next/server";
import { validateExternalOpenCalls } from "@/lib/openCallValidation";
import { isCronAuthorized } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const validation = await validateExternalOpenCalls();
    return NextResponse.json({
      triggeredBy: req.headers.get("x-vercel-cron") === "1" ? "vercel-cron" : "authorized",
      validation,
    });
  } catch (e) {
    console.error("GET /api/cron/validate-opencalls failed:", e);
    return NextResponse.json({ error: "validation failed" }, { status: 500 });
  }
}

