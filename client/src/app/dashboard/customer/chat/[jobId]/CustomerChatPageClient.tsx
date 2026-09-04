"use client";

import WorkerChat from "@/client/components/worker/WorkerChat";
import { motion } from "framer-motion";

export default function CustomerChatPageClient({
  jobId,
  originalText,
}: {
  jobId: string;
  originalText: string;
}) {
  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-divider bg-surface px-4 py-3">
        <a
          href={`/dashboard/customer/track/${jobId}`}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-bg"
        >
          <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </a>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-text">Worker</p>
          <p className="truncate text-sm text-muted">{originalText}</p>
        </div>
        <a
          href={`/dashboard/customer/track/${jobId}`}
          className="rounded-full border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
        >
          Tracking
        </a>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <WorkerChat jobId={jobId} />
      </div>
    </div>
  );
}
