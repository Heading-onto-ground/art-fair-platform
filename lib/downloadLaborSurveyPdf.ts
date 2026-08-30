import { laborSurveyPdfFilename } from "@/lib/laborSurveyPdfFilename";

export { laborSurveyPdfFilename };

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function messageForPdfFailure(status: number, error?: string): string {
  if (status === 401 || status === 403) return "로그인이 필요합니다.";
  if (status === 404) return "설문을 찾을 수 없습니다.";
  if (error === "no_responses") return "저장된 설문 응답이 없습니다.";
  return "PDF를 만들지 못했습니다.";
}

export async function downloadLaborSurveyPdf(options: {
  campaignId: string;
  filename: string;
}): Promise<void> {
  const query = options.campaignId
    ? `?campaignId=${encodeURIComponent(options.campaignId)}`
    : "";
  const res = await fetch(`/api/admin/labor-survey/pdf${query}`, {
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(messageForPdfFailure(res.status, body?.error));
  }

  const blob = await res.blob();
  triggerBrowserDownload(blob, options.filename);
}
