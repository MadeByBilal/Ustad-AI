"use client";

import CustomerJobsList from "@/client/components/CustomerJobsList";
import TranslatedHeading from "@/client/components/TranslatedHeading";

export default function CustomerJobsPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-warning/6 blur-3xl" />
      <div className="page-header">
        <TranslatedHeading translationKey="myJobs" />
      </div>
      <div className="page-content">
        <CustomerJobsList />
      </div>
    </div>
  );
}
