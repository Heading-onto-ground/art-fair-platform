export const PILOT_USER_AGENT =
  "ROBArtHistoryPilot/0.1 (local art-history research; fact extraction with attribution)";

export async function fetchText(
  url: string,
  timeoutMs = 20000,
): Promise<{ status: number; text: string; contentType: string }> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": PILOT_USER_AGENT,
      Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  return {
    status: response.status,
    text,
    contentType: response.headers.get("content-type") ?? "",
  };
}
