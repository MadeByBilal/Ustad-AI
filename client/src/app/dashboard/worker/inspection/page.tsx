"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InspectionPageClient from "./InspectionPageClient";

interface ActiveJobData {
  jobId: string;
  status: string;
  originalText: string;
  completion: {
    before_photo_id?: string | null;
    after_photo_id?: string | null;
    note?: string | null;
  } | null;
}

export default function WorkerInspectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdFromUrl = searchParams.get("jobId");
  const [activeJob, setActiveJob] = useState<ActiveJobData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meBody: { success?: boolean; data?: { user?: { id?: string } } } = await meRes.json();
        if (!meBody?.success || !meBody.data?.user) {
          router.push("/login");
          return;
        }

        const workerRes = await fetch(`/api/workers/by-user/${meBody.data.user.id}`);
        const workerBody: { success?: boolean; data?: { _id?: string; active_job_id?: string | null } } = await workerRes.json();
        if (!workerBody?.success || !workerBody.data?._id) {
          router.push("/login");
          return;
        }

        const targetJobId = jobIdFromUrl || workerBody.data.active_job_id;
        if (!targetJobId) {
          if (!cancelled) setActiveJob(null);
          return;
        }

        const jobRes = await fetch(`/api/jobs/${targetJobId}`);
        if (jobRes.status === 404) {
          if (!cancelled) setActiveJob(null);
          return;
        }
        const jobBody: {
          success?: boolean;
          data?: {
            job?: {
              status?: string;
              input?: { original_text?: string };
              completion?: ActiveJobData["completion"];
            };
          };
        } = await jobRes.json();
        if (!cancelled) {
          if (jobBody?.success && jobBody.data?.job) {
            const job = jobBody.data.job;
            setActiveJob({
              jobId: targetJobId,
              status: job.status ?? "",
              originalText: job.input?.original_text ?? "",
              completion: job.completion ?? null,
            });
          } else {
            setActiveJob(null);
          }
        }
      } catch {
        if (!cancelled) setActiveJob(null);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [router, jobIdFromUrl]);

  if (activeJob === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-warning/6 blur-3xl" />
      <div className="page-header">
        <h1 className="text-lg font-bold text-text">Inspection</h1>
      </div>
      <div className="page-content">
        {!activeJob ? (
          <div className="card flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface">
              <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17.24 8.41a4.24 4.24 0 00-6-6l-5.1 5.1m6 6l-5.1-5.1" />
              </svg>
            </div>
            <p className="text-sm font-medium text-muted">No active job to inspect</p>
            <p className="text-xs text-muted">Accept a job first</p>
          </div>
        ) : (
          <InspectionPageClient
            jobId={activeJob.jobId}
            jobStatus={activeJob.status}
            originalText={activeJob.originalText}
            completion={activeJob.completion}
          />
        )}
      </div>
    </div>
  );
}
