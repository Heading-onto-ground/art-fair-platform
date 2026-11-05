import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiGuards";
import { getAdminSession } from "@/lib/adminAuth";
import { demandWriteClass } from "@/lib/history/demandQuality";
import { historyLocale } from "@/lib/history/requestLocale";
import { jobIsOpen, normalizeResearchQuery, projectResearchJob, reuseDecision, workflowOwned } from "@/lib/history/researchJob";
import { blankJob } from "@/lib/history/researchAdvance";
import { beginResearchWorkflow } from "@/lib/history/startResearchWorkflow";
import { findKnownArtist, insertResearchJob, listJobsForQuery } from "@/lib/history/researchStore";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function remember(name: string, id: string) {
  try {
    await prisma.historySignal.create({ data: { name, path: `/research/${id}` } });
  } catch (error) {
    if (!isHistoryUnavailable(error)) console.error("discovery signal failed", error);
  }
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "history-research-create", 8, 10 * 60_000);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const query = body && typeof body.query === "string" ? body.query : "";
  const normalized = normalizeResearchQuery(query);
  if (!normalized) return NextResponse.json({ error: "query" }, { status: 400 });
  const expand = Boolean(body && body.expand === true);
  try {
    const known = await findKnownArtist(query);
    if (known && known.exhibitionCount > 0 && !expand) {
      return NextResponse.json({ artistHref: `/artists/${known.slug}`, job: null });
    }
    const existing = await listJobsForQuery(normalized);
    const reuse = reuseDecision(existing);
    if (reuse !== "create") {
      const job = existing.find((item) => item.id === reuse.id);
      if (job) {
        if (jobIsOpen(job) && !workflowOwned(job.payload.workflowRunId)) {
          try {
            await beginResearchWorkflow(job.id);
          } catch (error) {
            console.error("research workflow start failed", error);
          }
        }
        return NextResponse.json({ job: projectResearchJob(job), artistHref: job.resultArtistSlug ? `/artists/${job.resultArtistSlug}` : null });
      }
    }
    const demand = demandWriteClass({ adminSession: Boolean(getAdminSession()), nodeEnv: process.env.NODE_ENV ?? "production" });
    let job = blankJob({
      id: randomUUID(),
      query,
      normalizedQuery: normalized,
      locale: historyLocale(),
      demandQuality: demand,
      expand,
      now: new Date(),
    });
    job = await insertResearchJob(job);
    await remember("DISCOVERY_REQUESTED", job.id);
    try {
      await beginResearchWorkflow(job.id);
    } catch (error) {
      console.error("research workflow start failed", error);
    }
    return NextResponse.json({ job: projectResearchJob(job), artistHref: job.resultArtistSlug ? `/artists/${job.resultArtistSlug}` : null });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ unavailable: true }, { status: 503 });
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
      const again = await listJobsForQuery(normalized);
      const job = again[0];
      if (job) {
        if (jobIsOpen(job) && !workflowOwned(job.payload.workflowRunId)) {
          try {
            await beginResearchWorkflow(job.id);
          } catch (startError) {
            console.error("research workflow start failed", startError);
          }
        }
        return NextResponse.json({ job: projectResearchJob(job), artistHref: job.resultArtistSlug ? `/artists/${job.resultArtistSlug}` : null });
      }
    }
    console.error("research create failed", error);
    return NextResponse.json({ error: "research failed" }, { status: 500 });
  }
}
