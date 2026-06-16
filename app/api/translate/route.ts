import { NextResponse } from "next/server";
import { translateText, translateBatch, detectLanguage, type SupportedLang } from "@/lib/translateApi";
import { enforceRateLimit } from "@/lib/apiGuards";

export const dynamic = "force-dynamic";

const TRANSLATE_POST_MAX = 40;
const TRANSLATE_POST_WINDOW_MS = 10 * 60 * 1000;
const TRANSLATE_GET_MAX = 60;
const TRANSLATE_GET_WINDOW_MS = 10 * 60 * 1000;
const MAX_SINGLE_TEXT_LENGTH = 5000;
const MAX_BATCH_ITEMS = 20;
const MAX_BATCH_ITEM_LENGTH = 2000;

function clampText(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLen) return null;
  return trimmed;
}

// POST /api/translate
// body: { text: string, targetLang: string, sourceLang?: string }
// or: { texts: string[], targetLang: string, sourceLang?: string }
export async function POST(req: Request) {
  try {
    const limited = enforceRateLimit(req, "translate-post", TRANSLATE_POST_MAX, TRANSLATE_POST_WINDOW_MS);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const { text, texts, targetLang, sourceLang } = body;

    if (!targetLang) {
      return NextResponse.json({ error: "targetLang required" }, { status: 400 });
    }

    const single = clampText(text, MAX_SINGLE_TEXT_LENGTH);
    if (single) {
      const result = await translateText(
        single,
        targetLang as SupportedLang,
        (sourceLang as SupportedLang) || "auto",
      );
      return NextResponse.json({
        ok: true,
        translated: result.translated,
        detectedLang: result.detectedLang,
      });
    }

    if (Array.isArray(texts)) {
      if (texts.length > MAX_BATCH_ITEMS) {
        return NextResponse.json({ error: `texts limit is ${MAX_BATCH_ITEMS}` }, { status: 400 });
      }
      const sanitized = texts
        .map((t) => clampText(t, MAX_BATCH_ITEM_LENGTH))
        .filter((t): t is string => !!t);
      if (sanitized.length === 0) {
        return NextResponse.json({ error: "text or texts required" }, { status: 400 });
      }

      const results = await translateBatch(
        sanitized,
        targetLang as SupportedLang,
        (sourceLang as SupportedLang) || "auto",
      );
      return NextResponse.json({
        ok: true,
        translated: results,
      });
    }

    if (text && typeof text === "string" && text.trim().length > MAX_SINGLE_TEXT_LENGTH) {
      return NextResponse.json({ error: "text too long" }, { status: 400 });
    }

    return NextResponse.json({ error: "text or texts required" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/translate error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// GET /api/translate/detect?text=...
export async function GET(req: Request) {
  try {
    const limited = enforceRateLimit(req, "translate-get", TRANSLATE_GET_MAX, TRANSLATE_GET_WINDOW_MS);
    if (limited) return limited;

    const url = new URL(req.url);
    const text = url.searchParams.get("text");

    if (!text) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }
    if (text.length > MAX_SINGLE_TEXT_LENGTH) {
      return NextResponse.json({ error: "text too long" }, { status: 400 });
    }

    const lang = await detectLanguage(text);
    return NextResponse.json({ ok: true, lang });
  } catch (e) {
    console.error("GET /api/translate error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
