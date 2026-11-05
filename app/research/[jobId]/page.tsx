import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ResearchStatus from "@/app/components/history/ResearchStatus";
import "@/app/components/history/history.css";
import { projectResearchJob, type ResearchJobRecord } from "@/lib/history/researchJob";
import { readResearchJob } from "@/lib/history/researchStore";
import { isHistoryUnavailable } from "@/lib/history/schemaError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ResearchPage({ params }: { params: { jobId: string } }) {
  let unavailable = false;
  let job: ResearchJobRecord | null = null;
  try {
    job = await readResearchJob(params.jobId);
  } catch (error) {
    if (!isHistoryUnavailable(error)) throw error;
    unavailable = true;
  }
  if (unavailable || !job) {
    if (unavailable) {
      return (
        <main className="rh-wrap" id="main-content">
          <h1 className="rh-title">ROB</h1>
          <p>Research records are not available until the research table is installed.</p>
        </main>
      );
    }
    notFound();
  }
  return <ResearchStatus initial={projectResearchJob(job)} />;
}
