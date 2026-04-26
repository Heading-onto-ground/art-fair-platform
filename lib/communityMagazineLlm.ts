import type { MagazineReport } from "./communityMagazine";
import { parseTranscriptInput } from "./communityMagazine";

const MAX_LLM_INPUT_CHARS = 16_000;

type LlmJson = {
  todayTopic?: string;
  goodOpinions?: string[];
  keyTakeaways?: string[];
};

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[… 내용이 길어 앞부분만 분석에 사용했습니다]`;
}

function isStringArray(value: unknown, min: number, max: number): value is string[] {
  if (!Array.isArray(value)) return false;
  const strs = value.filter((x) => typeof x === "string" && x.trim().length > 0);
  return strs.length >= min && strs.length <= max;
}

/**
 * `OPENAI_API_KEY`가 설정된 경우 OpenAI Chat Completions로 매거진 요약.
 * 실패·미설정 시 null (호출부에서 휴리스틱 분석으로 폴백).
 */
export async function tryAnalyzeWithOpenAI(
  rawTranscript: string,
  title?: string
): Promise<{ report: MagazineReport; source: "llm" } | null> {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return null;

  const base =
    String(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1")
      .replace(/\/$/, "");
  const model = String(process.env.COMMUNITY_MAGAZINE_MODEL || "gpt-4o-mini").trim();

  const normalized = parseTranscriptInput(rawTranscript).trim();
  if (!normalized) return null;
  const userBody = clip(normalized, MAX_LLM_INPUT_CHARS);

  const system = [
    "You are an editorial assistant for an art community.",
    "Read the conversation transcript and produce a short magazine-style digest.",
    "Respond with a single JSON object only, no markdown.",
    "Keys: todayTopic (one concise Korean heading line), goodOpinions (3 to 5 strings: notable positive or well-argued lines; paraphrase if needed), keyTakeaways (3 to 5 strings: main outcomes or next steps).",
    "If the conversation is in English or other languages, still keep todayTopic, goodOpinions, and keyTakeaways in Korean unless the source is clearly monolingual English — then you may use English for all values.",
  ].join(" ");

  const user = [
    title?.trim() ? `Magazine title: ${title.trim()}` : "Magazine title: (none)",
    "",
    "Transcript:",
    userBody,
  ].join("\n");

  let data: unknown;
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("communityMagazineLlm: OpenAI error", res.status, errText.slice(0, 500));
      return null;
    }
    data = await res.json();
  } catch (e) {
    console.error("communityMagazineLlm: fetch failed", e);
    return null;
  }

  const content = (data as { choices?: { message?: { content?: string } }[] })
    .choices?.[0]?.message?.content;
  if (!content) return null;

  let parsed: LlmJson;
  try {
    parsed = JSON.parse(content) as LlmJson;
  } catch {
    return null;
  }

  const todayTopic =
    typeof parsed.todayTopic === "string" ? parsed.todayTopic.replace(/\s+/g, " ").trim() : "";
  if (!todayTopic) return null;

  const good = parsed.goodOpinions;
  const take = parsed.keyTakeaways;
  if (!isStringArray(good, 1, 8) || !isStringArray(take, 1, 8)) {
    return null;
  }
  const goodOpinions = good.slice(0, 5).map((s) => s.replace(/\s+/g, " ").trim());
  const keyTakeaways = take.slice(0, 5).map((s) => s.replace(/\s+/g, " ").trim());

  const finalTitle = title?.trim() || "Community Daily Magazine";
  return {
    source: "llm",
    report: {
      title: finalTitle,
      generatedAt: new Date().toISOString(),
      todayTopic,
      goodOpinions,
      keyTakeaways,
    },
  };
}
