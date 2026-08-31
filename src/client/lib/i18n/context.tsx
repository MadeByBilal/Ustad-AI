"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translations, type TranslationKey } from "./translations";

type Lang = "en" | "ur";

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("ustad-lang") as Lang | null;
  if (stored === "ur" || stored === "en") return stored;
  const nav = navigator.language || (navigator as { userLanguage?: string }).userLanguage || "";
  return nav.startsWith("ur") ? "ur" : "en";
}

function setLangCookie(lang: Lang) {
  document.cookie = `ustad-lang=${lang};path=/;max-age=31536000`;
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("ustad-lang", l);
    setLangCookie(l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ur" ? "rtl" : "ltr";
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[lang][key] ?? translations.en[key] ?? key;
  }, [lang]);

  const dir: "ltr" | "rtl" = lang === "ur" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const value = useMemo(() => ({ lang, setLang, t, dir }), [lang, setLang, t, dir]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    const fallback = getInitialLang();
    return {
      lang: fallback,
      setLang: () => {},
      t: (key: TranslationKey) => translations[fallback][key] ?? key,
      dir: fallback === "ur" ? "rtl" : "ltr",
    };
  }
  return ctx;
}
