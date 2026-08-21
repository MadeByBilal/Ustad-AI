"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const TrackingMap = dynamic(() => import("@/components/tracking/TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-stone-100">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-[#0e5f44]" />
    </div>
  ),
});

interface ActiveJob {
  job_id: string;
  status: string;
  category: string;
  original_text: string;
  destination: { lat: number; lng: number; label: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACCEPTED: { label: "Ready to go", color: "text-emerald-600" },
  EN_ROUTE: { label: "On the way", color: "text-green-600" },
  ARRIVED: { label: "Arrived", color: "text-blue-600" },
  IN_PROGRESS: { label: "Working", color: "text-violet-600" },
  AWAITING_CUSTOMER_CONFIRMATION: { label: "Waiting for confirmation", color: "text-amber-600" },
};

const NEXT_ACTIONS: Record<string, { label: string; to: string }> = {
  ACCEPTED: { label: "On the way", to: "EN_ROUTE" },
  EN_ROUTE: { label: "Arrived", to: "ARRIVED" },
  ARRIVED: { label: "Start work", to: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Complete", to: "AWAITING_CUSTOMER_CONFIRMATION" },
};

export default function WorkerActiveTracking({ workerId }: { workerId: string }) {
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [workerLocation, setWorkerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | undefined>();
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers/${workerId}/dashboard`, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!body?.success) return;

      const activeJob = body.data?.active_job;
      if (!activeJob) {
        setJob(null);
        return;
      }

      // Get destination from tracking API
      const trackRes = await fetch(`/api/jobs/${activeJob._id}/tracking`);
      const trackBody = await trackRes.json().catch(() => null);
      const destinationLat = trackBody?.data?.destination_lat;
      const destinationLng = trackBody?.data?.destination_lng;
      const hasDestination =
        typeof destinationLat === "number" &&
        Number.isFinite(destinationLat) &&
        typeof destinationLng === "number" &&
        Number.isFinite(destinationLng);

      setJob({
        job_id: activeJob._id,
        status: activeJob.status,
        category: activeJob.understanding?.category ?? "",
        original_text: activeJob.input?.original_text ?? "",
        destination: hasDestination ? {
          lat: destinationLat,
          lng: destinationLng,
          label: trackBody.data.destination_label ?? "Destination",
        } : null,
      });

      // Worker's own location — prefer live tracking data, fallback to stored profile location
      if (trackBody?.data?.worker_lat && trackBody?.data?.worker_lng) {
        setWorkerLocation({ lat: trackBody.data.worker_lat, lng: trackBody.data.worker_lng });
        setDistanceKm(trackBody.data.distance_km);
        setEtaMinutes(trackBody.data.eta_minutes);
        setLastUpdate(new Date());
      } else if (body.data?.worker?.location_lat && body.data?.worker?.location_lng) {
        setWorkerLocation({ lat: body.data.worker.location_lat, lng: body.data.worker.location_lng });
        setLastUpdate(new Date());
      }
    } catch {
      // ignore
    }
  }, [workerId]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), 5000);
    return () => clearInterval(poll);
  }, [refresh]);

  // Socket.io for real-time location
  const activeJobId = job?.job_id;
  useEffect(() => {
    if (!activeJobId) return;
    let mounted = true;

    async function connect() {
      try {
        const { connectSocket } = await import("@/lib/socket-client");
        const socket = connectSocket();
        socket.emit("join-job", { jobId: activeJobId, role: "worker", workerId });

        socket.on("location-update", (data: { lat: number; lng: number; distanceKm: number; etaMinutes: number }) => {
          if (!mounted) return;
          setWorkerLocation({ lat: data.lat, lng: data.lng });
          setDistanceKm(data.distanceKm);
          setEtaMinutes(data.etaMinutes);
          setLastUpdate(new Date());
        });

        return () => {
          socket.emit("leave-job", { jobId: activeJobId });
          socket.off("location-update");
        };
      } catch {
        // Socket not available
      }
    }

    void connect();
    return () => { mounted = false; };
  }, [activeJobId, workerId]);

  // Advance job status — for "Start work" (ARRIVED→IN_PROGRESS), navigate to chat page
  async function handleAdvance() {
    if (!job) return;
    const next = NEXT_ACTIONS[job.status];
    if (!next) return;

    // When starting work, go to work page where photos + complete live
    if (job.status === "ARRIVED") {
      window.location.href = `/dashboard/worker/work`;
      return;
    }

    setAdvancing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/jobs/${job.job_id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next.to }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Status update failed");
      }
      setMessage({ ok: true, text: `${next.label} — done` });
      void refresh();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setAdvancing(false);
    }
  }

  async function handleCancel() {
    if (!job || !window.confirm("Are you sure you want to cancel this job?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/jobs/${job.job_id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by worker" }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Cancel failed");
      }
      setJob(null);
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Cancel failed" });
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // No active job
  if (!job) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-stone-50 px-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-200">
          <svg className="h-10 w-10 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17.24 8.41a4.24 4.24 0 00-6-6l-5.1 5.1m6 6l-5.1-5.1" />
          </svg>
        </div>
        <p className="mt-5 text-lg font-bold text-stone-700">No active job</p>
        <p className="mt-1 text-sm text-stone-400">
          Accept a job to start tracking
        </p>
        <Link href="/dashboard/worker/jobs" className="btn-primary mt-6">
          Browse jobs
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[job.status] ?? { label: job.status, color: "text-stone-600" };
  const nextAction = NEXT_ACTIONS[job.status];

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center gap-3 bg-white/95 px-4 py-3 backdrop-blur-lg">
        <Link
          href="/dashboard/worker"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-stone-100"
        >
          <svg className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-stone-800">Customer</p>
          <p className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="h-[65vh] w-full shrink-0">
        {mapReady ? (
          <TrackingMap
            workerLocation={workerLocation}
            destination={job.destination}
            distanceKm={distanceKm}
            perspective="worker"
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-stone-100">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-[#0e5f44]" />
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div className="flex-1 bg-white px-5 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-lg font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
            <p className="text-sm text-stone-500">
              {job.original_text ? job.original_text.slice(0, 50) : "Job in progress"}
            </p>
          </div>
          <div className="text-right">
            {distanceKm !== undefined && job.status !== "AWAITING_CUSTOMER_CONFIRMATION" && (
              <>
                <p className="text-2xl font-bold text-stone-800">
                  {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
                </p>
                {etaMinutes !== null && (
                  <p className="text-sm text-stone-500">~{etaMinutes} min</p>
                )}
              </>
            )}
          </div>
        </div>

        {message && (
          <p className={`mt-3 rounded-xl px-4 py-3 text-sm ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message.text}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          {nextAction && (
            <button
              type="button"
              onClick={() => void handleAdvance()}
              disabled={advancing}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {advancing ? "Updating..." : nextAction.label}
            </button>
          )}
          <Link
            href="/dashboard/worker/work"
            className="btn-secondary flex-1 text-center"
          >
            Work
          </Link>
        </div>

        <button
          type="button"
          onClick={() => void handleCancel()}
          disabled={cancelling}
          className="mt-3 w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          {cancelling ? "Cancelling..." : "Cancel Job"}
        </button>

        {lastUpdate && (
          <p className="mt-3 text-center text-xs text-stone-400">
            Updated {lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}
