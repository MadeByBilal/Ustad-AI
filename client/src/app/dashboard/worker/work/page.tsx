"use client";

import { useEffect, useState } from "react";
import WorkerWorkPageClient from "./WorkerWorkPageClient";
import TranslatedHeading from "@/client/components/TranslatedHeading";
import { useWorker } from "@/client/lib/session";

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

export default function WorkerWorkPage() {
  const worker = useWorker();
  const [activeJob, setActiveJob] = useState<ActiveJobData | null | undefined>(undefined);

  useEffect(() => {
    if (!worker) return;
    const jobId = worker.active_job_id;
    let cancelled = false;

    async function load() {
      if (!jobId) {
        if (!cancelled) setActiveJob(null);
        return;
      }

      try {
        const jobRes = await fetch(`/api/jobs/${jobId}`);
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
              jobId,
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
  }, [worker]);

  if (activeJob === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return (
    <div className="relative"><div className="page-header">
        <TranslatedHeading translationKey="work" />
      </div>
      <div className="page-content page-bottom-safe-inline">
        {!activeJob ? (
          <div className="card flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface">
              <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17.24 8.41a4.24 4.24 0 00-6-6l-5.1 5.1m6 6l-5.1-5.1" />
              </svg>
            </div>
            <p className="text-sm font-medium text-muted">No active job</p>
            <p className="text-xs text-muted">Accept a job to start working</p>
          </div>
        ) : (
          <WorkerWorkPageClient
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
