import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiGuards";
import { getAdminSession } from "@/lib/adminAuth";
import { demandWriteClass } from "@/lib/history/demandQuality";
import { historyLocale } from "@/lib/history/requestLocale";
import { normalizeResearchQuery, projectResearchJob, reuseDecision } from "@/lib/history/researchJob";
import { blankJob } from "@/lib/history/researchAdvance";
import { stepResearchJob } from "@/lib/history/researchRuntime";
import { findKnownArtist, insertResearchJob, listJobsForQuery, saveResearchJob } from "@/lib/history/researchStore";
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
      if (job) return NextResponse.json({ job: projectResearchJob(job), artistHref: job.resultArtistSlug ? `/artists/${job.resultArtistSlug}` : null });
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
    const before = job;
    const advanced = await stepResearchJob(job);
    const fresh = advanced.payload.emitted.filter((name) => !before.payload.emitted.includes(name));
    job = await saveResearchJob(advanced);
    for (const name of fresh) await remember(name, job.id);
    return NextResponse.json({ job: projectResearchJob(job), artistHref: job.resultArtistSlug ? `/artists/${job.resultArtistSlug}` : null });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ unavailable: true }, { status: 503 });
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
      const again = await listJobsForQuery(normalized);
      const job = again[0];
      if (job) return NextResponse.json({ job: projectResearchJob(job), artistHref: job.resultArtistSlug ? `/artists/${job.resultArtistSlug}` : null });
    }
    console.error("research create failed", error);
    return NextResponse.json({ error: "research failed" }, { status: 500 });
  }
}
