"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkerDashboardData } from "@/lib/worker/dashboard";
import { useJobStream } from "@/lib/useJobStream";
import { motion } from "framer-motion";
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
      <motion.div className="card text-center text-sm text-muted" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        {error ?? "Loading dashboard…"}
      </motion.div>
    );
  }

  const w = data.worker;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-urdu text-2xl font-bold">سلام، {w.name}!</h1>
          <p className="mt-1 text-sm capitalize text-muted">
            {w.category.replace(/_/g, " ")} · {w.skills.slice(0, 3).join(", ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono badge bg-surface text-muted">
            ⭐ {w.average_rating.toFixed(1)}
          </span>
          <span className="badge bg-surface text-muted">
            {w.completed_jobs} jobs
          </span>
          <span
            className={`badge ${
              w.verification_level === "documents_verified"
                ? "bg-success text-success-fg"
                : "bg-warning/10 text-warning"
            }`}
          >
            ✓ {w.verification_level.replace("_", " ")}
          </span>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <motion.div className="card" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <h3 className="text-sm font-bold text-text">Ustad Score</h3>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-accent">
              {w.ustad_score}
              <span className="text-base font-semibold text-muted">/100</span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${w.ustad_score}%` }}
              />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-bg p-2">
                <dt className="text-muted">Completed jobs</dt>
                <dd className="font-semibold text-text">{w.completed_jobs}</dd>
              </div>
              <div className="rounded-lg bg-bg p-2">
                <dt className="text-muted">Average rating</dt>
                <dd className="font-semibold text-text">
                  {w.average_rating.toFixed(1)} ⭐
                </dd>
              </div>
              <div className="rounded-lg bg-bg p-2">
                <dt className="text-muted">Response rate</dt>
                <dd className="font-mono font-semibold text-text">{w.response_rate}%</dd>
              </div>
              <div className="rounded-lg bg-bg p-2">
                <dt className="text-muted">Cancellation</dt>
                <dd className="font-semibold text-text">{w.cancellation_rate}%</dd>
              </div>
            </dl>
          </motion.div>

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
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
              Jobs near you
            </h2>
            {data.incoming_jobs.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-divider p-4 text-sm text-muted">
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
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
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

      {error && <p className="text-xs text-warning">{error}</p>}
    </div>
  );
}
