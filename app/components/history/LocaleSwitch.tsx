"use client";

import type { HistoryLocale } from "@/lib/history/locale";

export default function LocaleSwitch({ locale }: { locale: HistoryLocale }) {
  return (
    <form className="rh-locale" action="/api/history/locale" method="post">
      <button type="submit" name="locale" value="ko" aria-pressed={locale === "ko"}>한국어</button>
      <button type="submit" name="locale" value="en" aria-pressed={locale === "en"}>English</button>
    </form>
  );
}
