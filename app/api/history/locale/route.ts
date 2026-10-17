import { NextResponse } from "next/server";
import { ROB_LOCALE_COOKIE } from "@/lib/history/locale";

export async function POST(request: Request) {
  const form = await request.formData();
  const value = form.get("locale");
  const locale = value === "ko" || value === "en" ? value : null;
  const next = safeReturn(request);
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  if (locale) {
    response.cookies.set(ROB_LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}

function safeReturn(request: Request): string {
  const referer = request.headers.get("referer");
  if (!referer) return "/";
  try {
    const from = new URL(referer);
    const here = new URL(request.url);
    if (from.origin !== here.origin) return "/";
    return `${from.pathname}${from.search}`;
  } catch {
    return "/";
  }
}
