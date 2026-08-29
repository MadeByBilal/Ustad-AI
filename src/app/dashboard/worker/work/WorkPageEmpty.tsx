"use client";

import { useLang } from "@/lib/i18n/context";

export default function WorkPageEmpty() {
  const { t } = useLang();
  return (
    <div className="card flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface">
        <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17.24 8.41a4.24 4.24 0 00-6-6l-5.1 5.1m6 6l-5.1-5.1" />
        </svg>
      </div>
      <p className="text-sm font-medium text-muted">{t("noActiveJob")}</p>
      <p className="text-xs text-muted">{t("activeJobDesc")}</p>
    </div>
  );
}
