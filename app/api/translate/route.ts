import { NextResponse } from "next/server";
import { translateText, translateBatch, detectLanguage, type SupportedLang } from "@/lib/translateApi";

export const dynamic = "force-dynamic";

// POST /api/translate
// body: { text: string, targetLang: string, sourceLang?: string }
// or: { texts: string[], targetLang: string, sourceLang?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text, texts, targetLang, sourceLang } = body;

    if (!targetLang) {
      return NextResponse.json({ error: "targetLang required" }, { status: 400 });
    }

    // 단일 텍스트 번역
    if (text) {
      const result = await translateText(
        text,
        targetLang as SupportedLang,
        (sourceLang as SupportedLang) || "auto"
      );
      return NextResponse.json({
        ok: true,
        translated: result.translated,
        detectedLang: result.detectedLang,
      });
    }

    // 여러 텍스트 일괄 번역
    if (Array.isArray(texts)) {
      const results = await translateBatch(
        texts,
        targetLang as SupportedLang,
        (sourceLang as SupportedLang) || "auto"
      );
      return NextResponse.json({
        ok: true,
        translated: results,
      });
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
    const url = new URL(req.url);
    const text = url.searchParams.get("text");

    if (!text) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const lang = await detectLanguage(text);
    return NextResponse.json({ ok: true, lang });
  } catch (e) {
    console.error("GET /api/translate error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
