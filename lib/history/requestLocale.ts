import { cookies, headers } from "next/headers";
import { ROB_LOCALE_COOKIE, resolveHistoryLocale, type HistoryLocale } from "@/lib/history/locale";

export function historyLocale(): HistoryLocale {
  const cookie = cookies().get(ROB_LOCALE_COOKIE)?.value;
  return resolveHistoryLocale(cookie, headers().get("accept-language"));
}
