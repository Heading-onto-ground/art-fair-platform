import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { enforceRateLimit } from "@/lib/apiGuards";
import { PUBLIC_HISTORY_CACHE_TAG } from "@/lib/history/publicGraph";
import { projectResearchJob } from "@/lib/history/researchJob";
import { stepResearchJob } from "@/lib/history/researchRuntime";
import { readResearchJob, saveResearchJob } from "@/lib/history/researchStore";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: { jobId: string } }) {
  const limited = enforceRateLimit(req, "history-research-continue", 30, 60_000);
  if (limited) return limited;
  try {
    const current = await readResearchJob(params.jobId);
    if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (current.stage === "DONE") return NextResponse.json({ job: projectResearchJob(current) });
    const advanced = await stepResearchJob(current);
    const fresh = advanced.payload.emitted.filter((name) => !current.payload.emitted.includes(name));
    const saved = await saveResearchJob(advanced);
    for (const name of fresh) {
      try {
        await prisma.historySignal.create({ data: { name, path: `/research/${saved.id}` } });
      } catch (error) {
        if (!isHistoryUnavailable(error)) console.error("discovery signal failed", error);
      }
    }
    if (saved.resultArtistSlug && saved.resultArtistSlug !== current.resultArtistSlug) {
      try {
        revalidateTag(PUBLIC_HISTORY_CACHE_TAG);
      } catch {
        // Cache refresh is separate from the stored fact.
      }
    }
    return NextResponse.json({ job: projectResearchJob(saved) });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ unavailable: true }, { status: 503 });
    console.error("research continue failed", error);
    return NextResponse.json({ error: "research failed" }, { status: 500 });
  }
}
