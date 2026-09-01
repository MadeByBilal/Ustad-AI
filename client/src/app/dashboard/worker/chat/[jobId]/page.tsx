"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import WorkerChatPageClient from "./WorkerChatPageClient";

interface JobData {
  status: string;
  originalText: string;
  completion: {
    before_photo_id?: string | null;
    after_photo_id?: string | null;
    note?: string | null;
  } | null;
}

export default function WorkerChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          router.push("/login");
          return null;
        }
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((body: { success?: boolean; data?: JobData } | null) => {
        if (body?.success && body.data) {
          const status = body.data.status;
          if (!["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION"].includes(status)) {
            setNotFound(true);
            return;
          }
          setJobData(body.data);
        }
      })
      .catch(() => setNotFound(true));
  }, [jobId, router]);

  if (notFound) {
    return <div className="p-4 text-sm text-warning">Job not found</div>;
  }

  if (!jobData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return (
    <WorkerChatPageClient
      jobId={jobId}
      jobStatus={jobData.status}
      originalText={jobData.originalText}
      completion={jobData.completion}
    />
  );
}
