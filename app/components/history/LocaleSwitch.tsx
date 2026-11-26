"use client";

import type { HistoryLocale } from "@/lib/history/locale";
import { productionLocaleList } from "@/lib/i18n/registry";

export default function LocaleSwitch({ locale }: { locale: HistoryLocale }) {
  return (
    <form className="rh-locale" action="/api/history/locale" method="post">
      {productionLocaleList().map((item) => (
        <button key={item.code} type="submit" name="locale" value={item.code} aria-pressed={locale === item.code}>
          {item.nativeName}
        </button>
      ))}
    </form>
  );
}
