"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkerDashboardData } from "@/lib/worker/dashboard";
import { useJobStream } from "@/lib/useJobStream";
import WorkerAvailability from "@/components/WorkerAvailability";
import LocationUpdater from "./LocationUpdater";
import IncomingJobCard from "./IncomingJobCard";
import DirectRequestCard from "./DirectRequestCard";
import ActiveJobPanel from "./ActiveJobPanel";

const POLL_MS = 15000;

export default function WorkerDashboard({ workerId }: { workerId: string }) {
  const [data, setData] = useState<WorkerDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [refresh]);

  useJobStream(data?.active_job?._id ?? null, () => void refresh());

  if (!data) {
    return (
      <div className="card p-8 text-center text-sm text-stone-500">
        {error ?? "Loading dashboard…"}
      </div>
    );
  }

  const w = data.worker;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-urdu text-2xl font-bold">سلام، {w.name}!</h1>
          <p className="mt-1 text-sm capitalize text-stone-500">
            {w.category.replace(/_/g, " ")} · {w.skills.slice(0, 3).join(", ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge !bg-stone-100 !text-stone-700">
            ⭐ {w.average_rating.toFixed(1)}
          </span>
          <span className="badge !bg-stone-100 !text-stone-700">
            {w.completed_jobs} jobs
          </span>
          <span
            className={`badge ${
              w.verification_level === "documents_verified"
                ? "!bg-emerald-100 !text-emerald-800"
                : "!bg-amber-100 !text-amber-800"
            }`}
          >
            ✓ {w.verification_level.replace("_", " ")}
          </span>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="card">
            <h3 className="text-sm font-bold text-stone-800">Ustad Score</h3>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-[#0e5f44]">
              {w.ustad_score}
              <span className="text-base font-semibold text-stone-400">/100</span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-[#0e5f44]"
                style={{ width: `${w.ustad_score}%` }}
              />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-stone-50 p-2">
                <dt className="text-stone-400">Completed jobs</dt>
                <dd className="font-semibold text-stone-800">{w.completed_jobs}</dd>
              </div>
              <div className="rounded-lg bg-stone-50 p-2">
                <dt className="text-stone-400">Average rating</dt>
                <dd className="font-semibold text-stone-800">
                  {w.average_rating.toFixed(1)} ⭐
                </dd>
              </div>
              <div className="rounded-lg bg-stone-50 p-2">
                <dt className="text-stone-400">Response rate</dt>
                <dd className="font-semibold text-stone-800">{w.response_rate}%</dd>
              </div>
              <div className="rounded-lg bg-stone-50 p-2">
                <dt className="text-stone-400">Cancellation</dt>
                <dd className="font-semibold text-stone-800">{w.cancellation_rate}%</dd>
              </div>
            </dl>
          </div>

          <WorkerAvailability
            initial={{
              is_available: w.is_available,
              is_online: w.is_online,
              emergency_available: w.emergency_available,
            }}
            onChanged={() => void refresh()}
          />

          <LocationUpdater
            lastUpdated={w.location_updated_at}
            onChanged={() => void refresh()}
          />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <ActiveJobPanel job={data.active_job} onChanged={() => void refresh()} />

          <section className="card">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Jobs near you
            </h2>
            {data.incoming_jobs.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-stone-200 p-4 text-sm text-stone-400">
                Nothing broadcasting right now — check back soon.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {data.incoming_jobs.map((job) => (
                  <IncomingJobCard
                    key={job.id}
                    job={job}
                    now={now}
                    onChanged={() => void refresh()}
                  />
                ))}
              </div>
            )}
          </section>

          {data.direct_requests.length > 0 && (
            <section className="card">
              <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
                Direct Requests from Customers
              </h2>
              <div className="mt-3 space-y-3">
                {data.direct_requests.map((req) => (
                  <DirectRequestCard
                    key={req.offer_id}
                    request={req}
                    onChanged={() => void refresh()}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </section>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}