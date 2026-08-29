"use client";

import { useLang } from "@/lib/i18n/context";
import { Languages } from "lucide-react";

export default function LanguageToggle() {
  const { lang, setLang } = useLang();

  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "ur" : "en")}
      className="flex items-center gap-1.5 rounded-lg border border-divider px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface"
      aria-label={lang === "en" ? "اردو میں تبدیل کریں" : "Switch to English"}
    >
      <Languages className="h-4 w-4 text-muted" />
      <span>{lang === "en" ? "اردو" : "English"}</span>
    </button>
  );
}
