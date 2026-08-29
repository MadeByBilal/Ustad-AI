"use client";

import { useLang } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translations";

export function T({ k }: { k: TranslationKey }) {
  const { t } = useLang();
  return <>{t(k)}</>;
}
