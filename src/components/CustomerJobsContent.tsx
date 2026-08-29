"use client";

import { useLang } from "@/lib/i18n/context";
import CustomerJobsList from "@/components/CustomerJobsList";

export default function CustomerJobsContent() {
  const { t } = useLang();

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="font-display text-lg font-bold text-text">{t("myJobsTitle")}</h1>
      </div>
      <div className="page-content">
        <CustomerJobsList />
      </div>
    </div>
  );
}
