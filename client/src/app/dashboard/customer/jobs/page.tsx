"use client";

import CustomerJobsList from "@/client/components/CustomerJobsList";
import TranslatedHeading from "@/client/components/TranslatedHeading";

export default function CustomerJobsPage() {
  return (
    <div className="relative"><div className="page-header">
        <TranslatedHeading translationKey="myJobs" />
      </div>
      <div className="page-content">
        <CustomerJobsList />
      </div>
    </div>
  );
}
