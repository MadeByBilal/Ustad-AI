"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { parseApiResponse } from "@/lib/api-client";

const POLL_MS = 10000;

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  BROADCASTING: { label: "Looking for worker", color: "bg-amber-100 text-amber-800", icon: "🔍" },
  WORKER_RESPONSES: { label: "Negotiating", color: "bg-blue-100 text-blue-800", icon: "💬" },
  CUSTOMER_SELECTING: { label: "Choose worker", color: "bg-purple-100 text-purple-800", icon: "👆" },
  ACCEPTED: { label: "Confirmed", color: "bg-emerald-100 text-emerald-800", icon: "✅" },
  EN_ROUTE: { label: "Worker on the way", color: "bg-green-100 text-green-800", icon: "🚗" },
  ARRIVED: { label: "Worker arrived", color: "bg-blue-100 text-blue-800", icon: "📍" },
  IN_PROGRESS: { label: "Work in progress", color: "bg-violet-100 text-violet-800", icon: "🔧" },
  AWAITING_CUSTOMER_CONFIRMATION: { label: "Confirm completion", color: "bg-orange-100 text-orange-800", icon: "⏳" },
  COMPLETED: { label: "Completed", color: "bg-stone-100 text-stone-600", icon: "✅" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: "❌" },
  EXPIRED: { label: "Expired", color: "bg-stone-100 text-stone-500", icon: "⏰" },
};

interface JobItem {
  job_id: string;
  status: string;
  category: string;
  description: string;
  original_text: string;
  urgency: string;
  customer_offer: number;
  final_price: number | null;
  address_label: string;
  created_at: string;
  worker_name: string | null;
}

export default function CustomerJobsList() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const body = await parseApiResponse<{ requests: JobItem[] }>(
        await fetch("/api/requests/list", { cache: "no-store" })
      );
      setJobs(body.requests ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-[#0e5f44]" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
          <svg className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-stone-600">No jobs yet</p>
        <p className="text-xs text-stone-400">Tap &ldquo;New Job&rdquo; to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {jobs.map((job) => {
        const status = STATUS_LABELS[job.status] ?? {
          label: job.status.replace(/_/g, " "),
          color: "bg-stone-100 text-stone-600",
          icon: "📋",
        };
        const price = job.final_price ?? job.customer_offer;
        const isTracking = ["EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(job.status);

        return (
          <Link
            key={job.job_id}
            href={
              isTracking
                ? `/dashboard/customer/track/${job.job_id}`
                : `/dashboard/customer/jobs`
            }
            className="block"
          >
            <div className="card transition-all active:scale-[0.98]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{status.icon}</span>
                  <div className="min-w-0">
                    <p className="font-urdu text-sm font-bold text-stone-800 line-clamp-1">
                      {job.original_text}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {job.category?.replace(/_/g, " ")}
                      {job.worker_name && ` · ${job.worker_name}`}
                    </p>
                  </div>
                </div>
                <span className={`badge shrink-0 ${status.color}`}>
                  {status.label}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
                <span className="text-sm font-bold text-stone-800">
                  Rs {price?.toLocaleString("en-PK") ?? "—"}
                </span>
                <span className="text-xs text-stone-400">
                  {new Date(job.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>

              {isTracking && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  <span className="text-xs font-medium text-green-700">
                    Tap to track live location
                  </span>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
