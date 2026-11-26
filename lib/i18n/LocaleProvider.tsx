"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROB_LOCALE_COOKIE } from "@/lib/history/locale";
import { prefixPublicPath, splitLocalePath, swapLocalePrefix } from "@/lib/history/localeUrl";
import { isProductionLocale, localeDefinition, type ProductionLocale } from "@/lib/i18n/registry";

export const ROB_LOCALE_SOURCE_COOKIE = "rob_locale_src";

type LocaleContextValue = {
  locale: ProductionLocale;
  setLocale: (next: string) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function writeChoice(locale: ProductionLocale) {
  const cookie = `${ROB_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  const source = `${ROB_LOCALE_SOURCE_COOKIE}=user; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.cookie = cookie;
  document.cookie = source;
  try {
    localStorage.setItem("afp_lang", locale);
  } catch {
    // Storage can be blocked. The cookie is the server-visible choice.
  }
}

export function LocaleProvider({
  locale: initial,
  children,
}: {
  locale: ProductionLocale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [locale, setCurrent] = useState<ProductionLocale>(initial);

  useEffect(() => {
    setCurrent(initial);
  }, [initial]);

  const setLocale = (next: string) => {
    const known = localeDefinition(next);
    const resolved: ProductionLocale | null = isProductionLocale(next)
      ? next
      : known && !known.productionEnabled
        ? known.fallback
        : null;
    if (!resolved) return;
    writeChoice(resolved);
    setCurrent(resolved);
    const search = typeof window !== "undefined" ? window.location.search : "";
    const current = `${pathname}${search}`;
    const { locale: urlLocale } = splitLocalePath(pathname);
    const destination = urlLocale ? swapLocalePrefix(current, resolved) : prefixPublicPath(current, resolved);
    if (destination !== current) router.push(destination);
    else router.refresh();
  };

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocaleState(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (value) return value;
  return { locale: "en", setLocale: () => {} };
}
