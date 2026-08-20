"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkerDashboardData } from "@/lib/worker/dashboard";
import WorkerAvailability from "@/components/WorkerAvailability";
import LocationUpdater from "./LocationUpdater";

const POLL_MS = 15000;

export default function WorkerHome({ workerId }: { workerId: string }) {
  const [data, setData] = useState<WorkerDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers/${workerId}/dashboard`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        data?: WorkerDashboardData;
      } | null;
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Dashboard failed to load");
      }
      setData(body.data ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    }
  }, [workerId]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-[#0e5f44]" />
      </div>
    );
  }

  const w = data.worker;
  const hasActiveJob = !!data.active_job;
  const incomingCount = data.incoming_jobs.length;
  const directCount = data.direct_requests.length;
  const pendingCount = incomingCount + directCount;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-urdu text-3xl font-bold">سلام، {w.name}!</h1>
        <p className="mt-1 text-base capitalize text-stone-500">
          {w.category.replace(/_/g, " ")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-5 text-center">
          <p className="text-3xl font-extrabold text-[#0e5f44]">{w.ustad_score}</p>
          <p className="mt-1 text-xs text-stone-500">Ustad Score</p>
        </div>
        <div className="card py-5 text-center">
          <p className="text-3xl font-extrabold text-stone-800">{w.completed_jobs}</p>
          <p className="mt-1 text-xs text-stone-500">Jobs Done</p>
        </div>
        <div className="card py-5 text-center">
          <p className="text-3xl font-extrabold text-amber-500">
            {w.average_rating.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-stone-500">Rating</p>
        </div>
      </div>

      {/* Active Job Alert */}
      {hasActiveJob && (
        <a
          href="/dashboard/worker/active"
          className="card flex items-center gap-4 border-[#0e5f44]/20 bg-[#0e5f44]/5 py-5 transition-all active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0e5f44]">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17.24 8.41a4.24 4.24 0 00-6-6l-5.1 5.1m6 6l-5.1-5.1" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-[#0e5f44]">Active Job</p>
            <p className="mt-0.5 truncate text-sm text-stone-600">
              {data.active_job?.input?.original_text ?? "Job in progress"}
            </p>
          </div>
          <svg className="h-6 w-6 shrink-0 text-[#0e5f44]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </a>
      )}

      {/* Pending Jobs Alert */}
      {pendingCount > 0 && !hasActiveJob && (
        <a
          href="/dashboard/worker/jobs"
          className="card flex items-center gap-4 border-amber-200 bg-amber-50 py-5 transition-all active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500">
            <span className="text-xl font-bold text-white">{pendingCount}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-amber-800">New jobs available</p>
            <p className="mt-0.5 text-sm text-amber-600">
              {incomingCount > 0 && `${incomingCount} nearby`}
              {incomingCount > 0 && directCount > 0 && " · "}
              {directCount > 0 && `${directCount} direct requests`}
            </p>
          </div>
          <svg className="h-6 w-6 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </a>
      )}

      {/* Availability */}
      <WorkerAvailability
        initial={{
          is_available: w.is_available,
          is_online: w.is_online,
          emergency_available: w.emergency_available,
        }}
        onChanged={() => void refresh()}
      />

      {/* Location */}
      <LocationUpdater
        lastUpdated={w.location_updated_at}
        onChanged={() => void refresh()}
      />

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
