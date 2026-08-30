/** KST calendar date so Korean admin filenames do not shift near midnight UTC. */
export function laborSurveyPdfDate(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function laborSurveyPdfFilename(campaignTitle: string, now = new Date()): string {
  const slug =
    campaignTitle.replace(/[^\w\uAC00-\uD7A3]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) ||
    "labor-survey";
  return `${slug}_${laborSurveyPdfDate(now)}.pdf`;
}
