"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
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
  { label: string; color: string; Icon: LucideIcon; ping: boolean }
> = {
  BROADCASTING: {
    label: "lookingForWorker",
    color: "bg-warning",
    Icon: Search,
    ping: false,
  },
  WORKER_RESPONSES: {
    label: "waitingForResponse",
    color: "bg-muted",
    Icon: MessageSquare,
    ping: false,
  },
  ACCEPTED: {
    label: "workerConfirmed",
    color: "bg-success",
    Icon: CheckCircle2,
    ping: false,
  },
  EN_ROUTE: {
    label: "onTheWay",
    color: "bg-accent",
    Icon: Car,
    ping: true,
  },
  ARRIVED: {
    label: "workerArrived",
    color: "bg-accent",
    Icon: MapPin,
    ping: true,
  },
  IN_PROGRESS: {
    label: "workInProgress",
    color: "bg-accent",
    Icon: Wrench,
    ping: false,
  },
  AWAITING_CUSTOMER_CONFIRMATION: {
    label: "needsApproval",
    color: "bg-warning",
    Icon: Clock,
    ping: true,
  },
};

export default function ActiveJobStatusBar() {
  const { t } = useLang();
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/requests/list", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!body?.success) return;

      const active = (body.data?.requests ?? []).find(
        (r: { status: string }) =>
          [
            "BROADCASTING",
            "WORKER_RESPONSES",
            "ACCEPTED",
            "EN_ROUTE",
            "ARRIVED",
            "IN_PROGRESS",
            "AWAITING_CUSTOMER_CONFIRMATION",
          ].includes(r.status)
      );

      if (active) {
        setJob({
          job_id: active.job_id,
          status: active.status,
          category: active.category,
          original_text: active.original_text,
          worker_name: active.worker_name ?? t("worker"),
        });
      } else {
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
    color: "bg-muted",
    Icon: Search,
    ping: false,
  };

  const { Icon, ping } = config;
  const isTracking = ["EN_ROUTE", "ARRIVED"].includes(job.status);
  const isApproval = job.status === "AWAITING_CUSTOMER_CONFIRMATION";

  let href = "/dashboard/customer/jobs";
  if (isTracking) href = "/dashboard/customer/active";
  if (isApproval) href = "/dashboard/customer/active";

  return (
    <Link href={href} className="block">
      <div className="border-t border-divider bg-surface px-5 py-4 transition-colors hover:bg-surface/80 active:scale-[0.99]">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15">
            <Icon className="h-5 w-5 text-accent" />
            {ping && (
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text">{t(config.label)}</p>
            {job.worker_name && job.status !== "BROADCASTING" && (
              <p className="truncate text-xs text-muted">
                {job.worker_name}
                {job.original_text && ` · ${job.original_text}`}
              </p>
            )}
          </div>

          <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
        </div>
      </div>
    </Link>
  );
}
