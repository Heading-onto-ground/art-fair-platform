import { RetryableError } from "@workflow/errors";
import { advancePersistedJob, persistedDisposition } from "@/lib/history/researchRuntime";
import { readResearchJob } from "@/lib/history/researchStore";
import type { ResearchJobRecord } from "@/lib/history/researchJob";

function retry(job: ResearchJobRecord): never {
  throw new RetryableError(job.failureCode ?? "FETCH_FAILED", { retryAfter: "5s" });
}

async function identityPhase(jobId: string) {
  "use step";
  const current = await readResearchJob(jobId);
  if (!current || current.stage === "DONE") return "stop";
  if (current.stage !== "IDENTITY") return "continue";
  if (persistedDisposition(current) === "retry") retry(current);
  const saved = await advancePersistedJob(jobId);
  if (!saved || persistedDisposition(saved) === "retry") retry(saved ?? current);
  return saved.stage === "DONE" ? "stop" : "continue";
}

async function sourcesPhase(jobId: string) {
  "use step";
  const current = await readResearchJob(jobId);
  if (!current || current.stage === "DONE") return "stop";
  if (current.stage !== "SOURCES") return current.stage === "IDENTITY" ? "stop" : "continue";
  const saved = await advancePersistedJob(jobId);
  if (!saved || persistedDisposition(saved) === "retry") retry(saved ?? current);
  return saved.stage === "DONE" ? "stop" : "continue";
}

async function firstFactPhase(jobId: string) {
  "use step";
  let current = await readResearchJob(jobId);
  if (!current || current.stage === "DONE") return "stop";
  if (current.payload.publishedIds.length > 0) return "continue";
  for (let attempt = 0; attempt < 6 && current.stage !== "DONE" && current.payload.publishedIds.length === 0; attempt += 1) {
    if (persistedDisposition(current) === "retry") retry(current);
    const saved = await advancePersistedJob(jobId);
    if (!saved || persistedDisposition(saved) === "retry") retry(saved ?? current);
    current = saved;
  }
  if (current.stage === "DONE" || current.payload.publishedIds.length === 0) return "stop";
  return "continue";
}

async function remainingPhase(jobId: string, index: number) {
  "use step";
  if (index < 0) return "stop";
  const current = await readResearchJob(jobId);
  if (!current || current.stage === "DONE") return "stop";
  if (persistedDisposition(current) === "retry") retry(current);
  const saved = await advancePersistedJob(jobId);
  if (!saved || saved.stage === "DONE") return "stop";
  if (persistedDisposition(saved) === "retry") retry(saved);
  return "continue";
}

export async function researchDiscovery(jobId: string) {
  "use workflow";
  if ((await identityPhase(jobId)) !== "continue") return jobId;
  if ((await sourcesPhase(jobId)) !== "continue") return jobId;
  if ((await firstFactPhase(jobId)) !== "continue") return jobId;
  for (let index = 0; index < 12; index += 1) {
    if ((await remainingPhase(jobId, index)) !== "continue") break;
  }
  return jobId;
}
