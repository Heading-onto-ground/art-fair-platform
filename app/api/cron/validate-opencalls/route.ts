import { NextResponse } from "next/server";
import { validateExternalOpenCalls } from "@/lib/openCallValidation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const isCron = req.headers.get("x-vercel-cron") === "1";
  const forceRun = url.searchParams.get("run") === "1";

  if (!isCron && !forceRun) {
    return NextResponse.json({
      message: "Use ?run=1 or Vercel cron header to run validation",
    });
  }

  try {
    const validation = await validateExternalOpenCalls();
    return NextResponse.json({
      triggeredBy: isCron ? "vercel-cron" : "query",
      validation,
    });
  } catch (e) {
    console.error("GET /api/cron/validate-opencalls failed:", e);
    return NextResponse.json({ error: "validation failed" }, { status: 500 });
  }
}

