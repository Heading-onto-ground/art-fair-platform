import { cookies, headers } from "next/headers";
import { ROB_LOCALE_COOKIE, resolveHistoryLocale, type HistoryLocale } from "@/lib/history/locale";
import { prefixPublicPath } from "@/lib/history/localeUrl";

export function pinnedLocale(): HistoryLocale | null {
  const list = headers();
  if (list.get("x-rob-locale-pinned") !== "1") return null;
  const value = list.get("x-rob-locale");
  return value === "ko" || value === "en" ? value : null;
}

export function historyLocale(): HistoryLocale {
  const pinned = pinnedLocale();
  if (pinned) return pinned;
  const cookie = cookies().get(ROB_LOCALE_COOKIE)?.value;
  return resolveHistoryLocale(cookie, headers().get("accept-language"));
}

export function pinnedPath(path: string): string {
  return prefixPublicPath(path, pinnedLocale());
}
