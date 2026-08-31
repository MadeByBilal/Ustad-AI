"use client";

import { useLang } from "@/client/lib/i18n/context";
import { Languages } from "lucide-react";

export default function LanguageToggle() {
  const { lang, setLang } = useLang();

  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "ur" : "en")}
      className="flex items-center gap-1 rounded-lg border-2 border-text/10 px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-accent/30 hover:bg-surface"
      aria-label={lang === "en" ? "اردو میں تبدیل کریں" : "Switch to English"}
    >
      <Languages className="h-3.5 w-3.5 text-muted" />
      <span>{lang === "en" ? "اردو" : "EN"}</span>
    </button>
  );
}
