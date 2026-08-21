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

      {/* Current work status */}
      <div className="card flex items-center justify-between gap-4 border-[#0e5f44]/15 bg-[#0e5f44]/5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Work status</p>
          <p className="mt-1 text-base font-bold text-stone-800">
            {hasActiveJob ? "You have an active job" : w.is_available ? "Ready for new work" : "Not accepting jobs"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${w.is_online && w.is_available ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>
          {w.is_online && w.is_available ? "Online" : "Offline"}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card py-5 text-center">
          <p className="text-3xl font-extrabold text-[#0e5f44]">{w.ustad_score}</p>
          <p className="mt-1 text-xs text-stone-500">Ustad Score</p>
        </div>
        <div className="card py-5 text-center">
          <p className="text-3xl font-extrabold text-stone-800">{w.completed_jobs}</p>
          <p className="mt-1 text-xs text-stone-500">Jobs Done</p>
        </div>
        <div className="card py-5 text-center">
          <p className="text-3xl font-extrabold text-amber-500">{w.average_rating.toFixed(1)}</p>
          <p className="mt-1 text-xs text-stone-500">Rating</p>
        </div>
        <div className="card py-5 text-center">
          <p className="text-3xl font-extrabold text-red-500">{w.cancellation_rate}%</p>
          <p className="mt-1 text-xs text-stone-500">Cancel rate</p>
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

      {/* Fast actions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Quick actions</h2>
          <span className="text-xs text-stone-400">Important tools</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <a href="/dashboard/worker/active" className="card flex min-h-24 flex-col justify-between transition hover:border-[#0e5f44]/40 active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0e5f44]/10 text-[#0e5f44]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            </span>
            <span className="text-sm font-bold text-stone-800">Track job</span>
          </a>
          <a href="/dashboard/worker/work" className="card flex min-h-24 flex-col justify-between transition hover:border-[#0e5f44]/40 active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
            </span>
            <span className="text-sm font-bold text-stone-800">Work tools</span>
          </a>
          <a href="/dashboard/worker/jobs" className="card flex min-h-24 flex-col justify-between transition hover:border-[#0e5f44]/40 active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38" /></svg>
            </span>
            <span className="text-sm font-bold text-stone-800">Find jobs</span>
          </a>
          <a href="/dashboard/worker/profile" className="card flex min-h-24 flex-col justify-between transition hover:border-[#0e5f44]/40 active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            </span>
            <span className="text-sm font-bold text-stone-800">Settings</span>
          </a>
        </div>
      </section>

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
