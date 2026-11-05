import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiGuards";
import { projectResearchJob } from "@/lib/history/researchJob";
import { readResearchJob } from "@/lib/history/researchStore";
import { isHistoryUnavailable } from "@/lib/history/schemaError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  const limited = enforceRateLimit(req, "history-research-read", 60, 60_000);
  if (limited) return limited;
  try {
    const job = await readResearchJob(params.jobId);
    if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ job: projectResearchJob(job) });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ unavailable: true }, { status: 503 });
    console.error("research read failed", error);
    return NextResponse.json({ error: "research failed" }, { status: 500 });
  }
}
