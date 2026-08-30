"use client";

import { useLang } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translations";

export default function TranslatedHeading({ translationKey }: { translationKey: TranslationKey }) {
  const { t, lang } = useLang();
  return (
    <h1 className={`font-display text-lg font-bold text-text ${lang === "ur" ? "font-urdu" : ""}`}>
      {t(translationKey)}
    </h1>
  );
}
