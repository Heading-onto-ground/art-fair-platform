import { start } from "workflow/api";
import { claimResearchRun, releaseResearchRun, saveResearchRunId } from "@/lib/history/researchStore";
import { researchDiscovery } from "@/workflows/researchDiscovery";

export async function beginResearchWorkflow(jobId: string): Promise<string | null> {
  const claimed = await claimResearchRun(jobId);
  if (!claimed) return null;
  try {
    const run = await start(researchDiscovery, [jobId]);
    await saveResearchRunId(jobId, run.runId);
    return run.runId;
  } catch (error) {
    await releaseResearchRun(jobId);
    throw error;
  }
}
