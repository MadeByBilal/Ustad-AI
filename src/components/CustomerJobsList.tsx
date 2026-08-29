"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { parseApiResponse } from "@/lib/api-client";
import type { LucideIcon } from "lucide-react";
import { Search, MessageSquare, Hand, Car, MapPin, Wrench, Clock, CheckCircle2, XCircle, Timer, ClipboardList } from "lucide-react";

const POLL_MS = 10000;

const STATUS_LABELS: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  BROADCASTING: { label: "Looking for worker", color: "bg-warning/10 text-warning", icon: Search },
  WORKER_RESPONSES: { label: "Negotiating", color: "bg-surface text-muted", icon: MessageSquare },
  CUSTOMER_SELECTING: { label: "Choose worker", color: "bg-surface text-accent", icon: Hand },
  ACCEPTED: { label: "Confirmed", color: "bg-success text-success-fg", icon: CheckCircle2 },
  EN_ROUTE: { label: "Worker on the way", color: "bg-accent/15 text-accent", icon: Car },
  ARRIVED: { label: "Worker arrived", color: "bg-accent/15 text-accent", icon: MapPin },
  IN_PROGRESS: { label: "Work in progress", color: "bg-accent/15 text-accent", icon: Wrench },
  AWAITING_CUSTOMER_CONFIRMATION: { label: "Confirm completion", color: "bg-warning/10 text-warning", icon: Clock },
  COMPLETED: { label: "Completed", color: "bg-success text-success-fg", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "bg-warning/10 text-warning", icon: XCircle },
  EXPIRED: { label: "Expired", color: "bg-surface text-muted", icon: Timer },
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <motion.div className="card flex flex-col items-center gap-3 py-12 text-center" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface">
          <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-muted">No jobs yet</p>
        <p className="text-xs text-muted">Tap &ldquo;New Job&rdquo; to get started</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">{error}</p>
      )}

      {jobs.map((job) => {
        const status = STATUS_LABELS[job.status] ?? {
          label: job.status.replace(/_/g, " "),
          color: "bg-surface text-muted",
          icon: ClipboardList,
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
            <motion.div className="card transition-all active:scale-[0.98]" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <status.icon className="h-5 w-5 text-muted" />
                  <div className="min-w-0">
                    <p className="font-urdu line-clamp-1 text-sm font-bold text-text">
                      {job.original_text}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {job.category?.replace(/_/g, " ")}
                      {job.worker_name && ` · ${job.worker_name}`}
                    </p>
                  </div>
                </div>
                <span className={`badge shrink-0 ${status.color}`}>
                  {status.label}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-divider pt-3">
                <span className="font-mono text-sm font-bold text-text">
                  Rs {price?.toLocaleString("en-PK") ?? "—"}
                </span>
                <span className="text-xs text-muted">
                  {new Date(job.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>

              {isTracking && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-accent/15 px-3 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
                  </span>
                  <span className="text-xs font-medium text-accent">
                    Tap to track live location
                  </span>
                </div>
              )}
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
