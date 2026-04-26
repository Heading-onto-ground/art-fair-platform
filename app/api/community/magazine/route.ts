import { NextRequest, NextResponse } from "next/server";
import { analyzeTranscript, buildMagazinePdf } from "@/lib/communityMagazine";
import { tryAnalyzeWithOpenAI } from "@/lib/communityMagazineLlm";

export const dynamic = "force-dynamic";

const MAX_TRANSCRIPT_CHARS = 200_000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcript = typeof body?.transcript === "string" ? body.transcript : "";
    const title = typeof body?.title === "string" ? body.title : undefined;

    if (!transcript.trim()) {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 });
    }
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      return NextResponse.json(
        { error: "transcript is too long" },
        { status: 400 }
      );
    }

    const fromLlm = await tryAnalyzeWithOpenAI(transcript, title);
    const report = fromLlm
      ? fromLlm.report
      : analyzeTranscript(transcript, title);
    const analysis: "llm" | "heuristic" = fromLlm ? "llm" : "heuristic";

    const pdfBytes = await buildMagazinePdf(report);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    return NextResponse.json({
      report,
      analysis,
      pdfBase64,
      fileName: `community-magazine-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  } catch (error) {
    console.error("POST /api/community/magazine error:", error);
    return NextResponse.json({ error: "failed to generate magazine" }, { status: 500 });
  }
}
