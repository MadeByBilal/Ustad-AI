"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const POLL_MS = 5000;

interface ActiveJob {
  job_id: string;
  status: string;
  category: string;
  original_text: string;
  worker_name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  BROADCASTING: { label: "Looking for worker", color: "bg-warning", icon: "🔍" },
  WORKER_RESPONSES: { label: "Waiting for response", color: "bg-muted", icon: "💬" },
  ACCEPTED: { label: "Worker confirmed", color: "bg-success", icon: "✅" },
  EN_ROUTE: { label: "On the way", color: "bg-accent", icon: "🚗" },
  ARRIVED: { label: "Worker arrived", color: "bg-accent", icon: "📍" },
  IN_PROGRESS: { label: "Work in progress", color: "bg-accent", icon: "🔧" },
  AWAITING_CUSTOMER_CONFIRMATION: { label: "Needs your approval", color: "bg-warning", icon: "⏳" },
};

export default function ActiveJobStatusBar() {
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/requests/list", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!body?.success) return;

      const active = (body.data?.requests ?? []).find((r: { status: string }) =>
        ["BROADCASTING", "WORKER_RESPONSES", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION"].includes(r.status)
      );

      if (active) {
        setJob({
          job_id: active.job_id,
          status: active.status,
          category: active.category,
          original_text: active.original_text,
          worker_name: active.worker_name ?? "Worker",
        });
      } else {
        setJob(null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  if (loading || !job) return null;

  const config = STATUS_CONFIG[job.status] ?? {
    label: job.status.replace(/_/g, " "),
    color: "bg-muted",
    icon: "📋",
  };

  const isTracking = ["EN_ROUTE", "ARRIVED"].includes(job.status);
  const isApproval = job.status === "AWAITING_CUSTOMER_CONFIRMATION";

  // Determine where to link
  let href = "/dashboard/customer/jobs";
  if (isTracking) href = "/dashboard/customer/active";
  if (isApproval) href = "/dashboard/customer/active";

  return (
    <Link href={href}>
      <div className="border-t border-divider bg-surface px-5 py-4 transition-transform active:scale-[0.99]">
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <div className="relative">
            <span className={`block h-3 w-3 rounded-full ${config.color}`} />
            {(isTracking || isApproval) && (
              <span className={`absolute inset-0 h-3 w-3 animate-ping rounded-full ${config.color} opacity-75`} />
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text">
              {config.icon} {config.label}
            </p>
            {job.worker_name && job.status !== "BROADCASTING" && (
              <p className="truncate text-xs text-muted">
                {job.worker_name}
                {job.original_text && ` · ${job.original_text}`}
              </p>
            )}
          </div>

          {/* Arrow */}
          <svg className="h-5 w-5 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
