import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import type { Lang } from "./i18n";

const STORAGE_KEY = "@rob_lang";

function getDeviceLang(): Lang {
  try {
    const [locale] = Localization.getLocales();
    const code = locale?.languageCode ?? "en";
    return code.startsWith("ko") ? "ko" : "en";
  } catch {
    return "en";
  }
}

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => Promise<void>;
  init: () => Promise<void>;
}

export const useLanguage = create<LanguageState>((set) => ({
  lang: "en",
  setLang: async (lang) => {
    set({ lang });
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  },
  init: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ko") {
        set({ lang: stored as Lang });
      } else {
        set({ lang: getDeviceLang() });
      }
    } catch {
      set({ lang: getDeviceLang() });
    }
  },
}));
