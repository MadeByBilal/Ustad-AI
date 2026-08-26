"use client";

import { useLang } from "@/lib/i18n/context";
import { motion } from "framer-motion";

export default function LanguageToggle() {
  const { lang, setLang } = useLang();

  return (
    <motion.button
      type="button"
      onClick={() => setLang(lang === "en" ? "ur" : "en")}
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="flex items-center gap-1.5 rounded-xl border border-divider px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-surface"
      aria-label={lang === "en" ? "اردو میں تبدیل کریں" : "Switch to English"}
    >
      <span className="text-base">{lang === "en" ? "🌐" : "🌐"}</span>
      <span>{lang === "en" ? "اردو" : "English"}</span>
    </motion.button>
  );
}
