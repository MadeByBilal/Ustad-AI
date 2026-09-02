"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useLang } from "@/client/lib/i18n/context";
import {
  Search,
  MessageSquare,
  CheckCircle2,
  Car,
  MapPin,
  Wrench,
  Clock,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const POLL_MS = 5000;

interface ActiveJob {
  job_id: string;
  status: string;
  category: string;
  original_text: string;
  worker_name: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; Icon: LucideIcon; ping: boolean }
> = {
  BROADCASTING: { label: "lookingForWorker", Icon: Search, ping: false },
  WORKER_RESPONSES: { label: "waitingForResponse", Icon: MessageSquare, ping: false },
  ACCEPTED: { label: "workerConfirmed", Icon: CheckCircle2, ping: false },
  EN_ROUTE: { label: "onTheWay", Icon: Car, ping: true },
  ARRIVED: { label: "workerArrived", Icon: MapPin, ping: true },
  IN_PROGRESS: { label: "workInProgress", Icon: Wrench, ping: false },
  AWAITING_CUSTOMER_CONFIRMATION: { label: "needsApproval", Icon: Clock, ping: true },
};

const TRACKING_STATUSES = new Set(["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION"]);

export default function ActiveJobStatusBar() {
  const { t } = useLang();
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [loading, setLoading] = useState(true);
  const prevStatusRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/requests/list", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!body?.success) return;

      const active = (body.data?.requests ?? []).find((r: { status: string }) =>
        ["BROADCASTING", "WORKER_RESPONSES", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION"].includes(r.status)
      );

      if (active) {
        const newStatus = active.status;
        const prevStatus = prevStatusRef.current;

        if (prevStatus && prevStatus !== newStatus && TRACKING_STATUSES.has(newStatus)) {
          window.location.href = `/dashboard/customer/track/${active.job_id}`;
          return;
        }

        prevStatusRef.current = newStatus;
        setJob({
          job_id: active.job_id,
          status: newStatus,
          category: active.category,
          original_text: active.original_text,
          worker_name: active.worker_name ?? t("worker"),
        });
      } else {
        prevStatusRef.current = null;
        setJob(null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  if (loading || !job) return null;

  const config = STATUS_CONFIG[job.status] ?? {
    label: "status",
    Icon: Search,
    ping: false,
  };

  const { Icon, ping } = config;
  const isTracking = ["EN_ROUTE", "ARRIVED"].includes(job.status);
  const isApproval = job.status === "AWAITING_CUSTOMER_CONFIRMATION";

  let href = "/dashboard/customer/jobs";
  if (isTracking) href = `/dashboard/customer/track/${job.job_id}`;
  if (isApproval) href = `/dashboard/customer/track/${job.job_id}`;
  if (job.status === "ACCEPTED") href = `/dashboard/customer/track/${job.job_id}`;

  return (
    <Link href={href} className="block">
      <div
        className="px-5 py-4 transition-all duration-200 hover:bg-white/[0.07] active:scale-[0.99]"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(38,166,80,0.15)" }}
          >
            <Icon className="h-5 w-5" style={{ color: "#26A650" }} />
            {ping && (
              <span className="absolute inset-0 animate-ping rounded-full" style={{ background: "rgba(38,166,80,0.2)" }} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#F1F4F1]">{t(config.label as Parameters<typeof t>[0])}</p>
            {job.worker_name && job.status !== "BROADCASTING" && (
              <p className="truncate text-xs text-[#93A396]">
                {job.worker_name}
                {job.original_text && ` · ${job.original_text}`}
              </p>
            )}
          </div>

          <ChevronRight className="h-5 w-5 shrink-0 text-[#93A396]" />
        </div>
      </div>
    </Link>
  );
}
