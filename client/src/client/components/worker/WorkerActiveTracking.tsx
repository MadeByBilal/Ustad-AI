"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import TrackingMap from "@/client/components/tracking/dynamicTrackingMap";
import LiveTracker from "@/client/components/worker/LiveTracker";
import type { RouteComputedPayload } from "@/client/lib/route-types";
import { getApiErrorMessage } from "@/client/lib/api-client";

interface ActiveJob {
  job_id: string;
  status: string;
  category: string;
  original_text: string;
  destination: { lat: number; lng: number; label: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACCEPTED: { label: "Ready to go", color: "text-success-fg" },
  EN_ROUTE: { label: "On the way", color: "text-accent" },
  ARRIVED: { label: "Arrived", color: "text-accent" },
  IN_PROGRESS: { label: "Working", color: "text-accent" },
  AWAITING_CUSTOMER_CONFIRMATION: {
    label: "Waiting for confirmation",
    color: "text-warning",
  },
};

const NEXT_ACTIONS: Record<string, { label: string; to: string }> = {
  ACCEPTED: { label: "On the way", to: "EN_ROUTE" },
  EN_ROUTE: { label: "Arrived", to: "ARRIVED" },
  ARRIVED: { label: "Start work", to: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Complete", to: "AWAITING_CUSTOMER_CONFIRMATION" },
};

export default function WorkerActiveTracking({
  workerId,
}: {
  workerId: string;
}) {
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [workerLocation, setWorkerLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [customerLocation, setCustomerLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | undefined>();
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [precomputedRoute, setPrecomputedRoute] = useState<
    [number, number][] | null
  >(null);
  const activeJobIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers/${workerId}/dashboard`, {
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (!body?.success) return;

      const activeJob = body.data?.active_job;
      if (!activeJob) {
        activeJobIdRef.current = null;
      setJob(null);
      window.location.href = "/dashboard/worker";
        setPrecomputedRoute(null);
        return;
      }

      const routeFromDashboard =
        Array.isArray(activeJob.route?.polyline) &&
        activeJob.route.polyline.length >= 2
          ? activeJob.route.polyline
          : null;
      if (activeJobIdRef.current !== activeJob._id) {
        activeJobIdRef.current = activeJob._id;
        setPrecomputedRoute(routeFromDashboard);
      } else if (routeFromDashboard) {
        setPrecomputedRoute((current) => current ?? routeFromDashboard);
      }

      const hasInitialDestination =
        typeof activeJob.location?.lat === "number" &&
        Number.isFinite(activeJob.location.lat) &&
        typeof activeJob.location?.lng === "number" &&
        Number.isFinite(activeJob.location.lng);
      setJob({
        job_id: activeJob._id,
        status: activeJob.status,
        category: activeJob.understanding?.category ?? "",
        original_text: activeJob.input?.original_text ?? "",
        destination: hasInitialDestination
          ? {
              lat: activeJob.location.lat,
              lng: activeJob.location.lng,
              label: activeJob.location.address_label ?? "Destination",
            }
          : null,
      });

      if (
        typeof body.data?.worker?.location_lat === "number" &&
        Number.isFinite(body.data.worker.location_lat) &&
        typeof body.data?.worker?.location_lng === "number" &&
        Number.isFinite(body.data.worker.location_lng)
      ) {
        setWorkerLocation({
          lat: body.data.worker.location_lat,
          lng: body.data.worker.location_lng,
        });
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
        destination: hasDestination
          ? {
              lat: destinationLat,
              lng: destinationLng,
              label: trackBody.data.destination_label ?? "Destination",
            }
          : null,
      });

      // Capture precomputed route from tracking API
      if (
        trackBody?.data?.precomputed_route &&
        Array.isArray(trackBody.data.precomputed_route)
      ) {
        setPrecomputedRoute(
          (current) => current ?? trackBody.data.precomputed_route,
        );
      }

      // Worker's own location — prefer live tracking data, fallback to stored profile location
       if (trackBody?.data?.worker_lat != null && trackBody?.data?.worker_lng != null) {
        setWorkerLocation({
          lat: trackBody.data.worker_lat,
          lng: trackBody.data.worker_lng,
        });
        setDistanceKm(trackBody.data.distance_km);
        setEtaMinutes(trackBody.data.eta_minutes);
        setLastUpdate(new Date());
       } else if (
        body.data?.worker?.location_lat != null &&
        body.data?.worker?.location_lng != null
      ) {
        setWorkerLocation({
          lat: body.data.worker.location_lat,
          lng: body.data.worker.location_lng,
        });
         setLastUpdate(new Date());
       }
       if (trackBody?.data?.customer_lat != null && trackBody?.data?.customer_lng != null) {
         setCustomerLocation({
           lat: trackBody.data.customer_lat,
           lng: trackBody.data.customer_lng,
         });
       }
    } catch {
      // ignore
    }
  }, [workerId]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), 2_000);
    return () => clearInterval(poll);
  }, [refresh]);

  // Socket.io for real-time location
  const activeJobId = job?.job_id;
  useEffect(() => {
    if (!activeJobId) return;
    const jobId = activeJobId;
    let mounted = true;
    let cleanup: (() => void) | null = null;

    async function connect() {
      try {
        const { joinJob } = await import("@/client/lib/socket-client");
        if (!mounted) return;
        const socket = await joinJob(jobId, "worker");

        const handleLocationUpdate = (data: {
          jobId?: string;
          lat: number;
          lng: number;
          distanceKm: number;
          etaMinutes: number;
        }) => {
          if (!mounted || (data.jobId && data.jobId !== jobId)) return;
          setWorkerLocation({ lat: data.lat, lng: data.lng });
          setDistanceKm(data.distanceKm);
          setEtaMinutes(data.etaMinutes);
          setLastUpdate(new Date());
        };

        const handleRouteComputed = (data: RouteComputedPayload) => {
          if (
            !mounted ||
            data.jobId !== jobId ||
            !Array.isArray(data.polyline) ||
            data.polyline.length < 2
          ) {
            return;
          }
          setPrecomputedRoute(data.polyline);
        };

        const handleCustomerLocationUpdate = (data: {
          jobId?: string;
          lat?: number;
          lng?: number;
        }) => {
          if (
            mounted &&
            data.jobId === jobId &&
            typeof data.lat === "number" &&
            typeof data.lng === "number"
          ) {
            setCustomerLocation({ lat: data.lat, lng: data.lng });
          }
        };

        const handleStatusUpdate = (data: {
          jobId?: string;
          status?: string;
        }) => {
          if (!mounted || data.jobId !== jobId || !data.status) return;
          if (data.status === "CANCELLED") {
            setJob(null);
            return;
          }
          setJob((current) =>
            current ? { ...current, status: data.status! } : current,
          );
        };

        socket.on("location-update", handleLocationUpdate);
        socket.on("route-computed", handleRouteComputed);
        socket.on("customer-location-update", handleCustomerLocationUpdate);
        socket.on("job-status-update", handleStatusUpdate);
        cleanup = () => {
          socket.emit("leave-job", { jobId });
          socket.off("location-update", handleLocationUpdate);
          socket.off("route-computed", handleRouteComputed);
          socket.off("customer-location-update", handleCustomerLocationUpdate);
          socket.off("job-status-update", handleStatusUpdate);
        };
      } catch {
        // Socket not available
      }
    }

    void connect();
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [activeJobId, workerId]);

  // Advance job status
  async function handleAdvance() {
    if (!job) return;
    const next = NEXT_ACTIONS[job.status];
    if (!next) return;

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
        throw new Error(getApiErrorMessage(body, "Status update failed"));
      }

      // Navigate based on the new status
      if (next.to === "ARRIVED") {
        window.location.href = `/dashboard/worker/inspection?jobId=${job.job_id}`;
        return;
      }
      if (next.to === "IN_PROGRESS" || next.to === "AWAITING_CUSTOMER_CONFIRMATION") {
        window.location.href = `/dashboard/worker/work`;
        return;
      }

      setJob((prev) => (prev ? { ...prev, status: next.to } : prev));
      void refresh();
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setAdvancing(false);
    }
  }

  async function handleCancel() {
    if (!job || !window.confirm("Are you sure you want to cancel this job?"))
      return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/jobs/${job.job_id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by worker" }),
      });
      const body = await res.json().catch(() => null);
      // Treat already-cancelled (409 invalid_status) as success — job is gone.
      if (!res.ok && !(res.status === 409 && body?.details?.code === "invalid_status")) {
        throw new Error(getApiErrorMessage(body, "Cancel failed"));
      }
      window.location.href = "/dashboard/worker";
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof Error ? e.message : "Cancel failed",
      });
    } finally {
      setCancelling(false);
    }
  }

  // No active job
  if (!job) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-bg px-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface">
          <svg
            className="h-10 w-10 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17l-5.1-5.1m5.1 5.1L17.24 8.41a4.24 4.24 0 00-6-6l-5.1 5.1m6 6l-5.1-5.1"
            />
          </svg>
        </div>
        <p className="mt-5 text-lg font-bold text-text">No active job</p>
        <p className="mt-1 text-sm text-muted">
          Accept a job to start tracking
        </p>
        <Link href="/dashboard/worker/jobs" className="btn-primary mt-6">
          Browse jobs
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[job.status] ?? {
    label: job.status,
    color: "text-muted",
  };
  const nextAction = NEXT_ACTIONS[job.status];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center gap-3 bg-surface/95 px-4 py-3 backdrop-blur-lg">
        <Link
          href="/dashboard/worker"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface"
        >
          <svg
            className="h-5 w-5 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text">Customer</p>
          <p className={`text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </p>
        </div>
        {job && (
          <Link
            href={`/dashboard/worker/chat/${job.job_id}`}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface"
          >
            <svg
              className="h-5 w-5 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 20.105V4.875A2.625 2.625 0 016.375 2.25h11.25A2.625 2.625 0 0120.25 4.875v10.5A2.625 2.625 0 0117.625 18H7.5l-3.75 2.105z"
              />
            </svg>
          </Link>
        )}
      </div>

      {/* Map */}
      <div className="h-[65vh] w-full shrink-0">
        <TrackingMap
          workerLocation={workerLocation}
          userLocation={customerLocation}
          destination={job.destination}
          distanceKm={distanceKm}
          perspective="worker"
          className="h-full w-full"
          precomputedRoute={precomputedRoute}
        />
      </div>

      {/* Silent GPS broadcaster — no UI, just broadcasts location via socket */}
      <div className="sr-only" aria-hidden="true">
        <LiveTracker
          jobId={job.job_id}
          workerId={workerId}
          onArrived={() => void refresh()}
        />
      </div>

      {/* Bottom Panel */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-surface px-5 pt-4 pb-32">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-lg font-bold ${statusInfo.color}`}>
              {statusInfo.label}
            </p>
            <p className="text-sm text-muted">
              {job.category || "Job in progress"}
            </p>
          </div>
          <div className="text-right">
            {distanceKm !== undefined &&
              job.status !== "AWAITING_CUSTOMER_CONFIRMATION" && (
                <>
                  <p className="text-2xl font-bold text-text">
                    {distanceKm < 1
                      ? `${Math.round(distanceKm * 1000)}m`
                      : `${distanceKm.toFixed(1)}km`}
                  </p>
                  {etaMinutes !== null && (
                    <p className="text-sm text-muted">~{etaMinutes} min</p>
                  )}
                </>
              )}
          </div>
        </div>

        {message && (
          <p
            className={`mt-3 rounded-xl px-4 py-3 text-sm ${message.ok ? "bg-success/15 text-success-fg" : "bg-warning/10 text-warning"}`}
          >
            {message.text}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-4">
          <div className="flex gap-3">
            {nextAction && (
              <motion.button
                type="button"
                onClick={() => void handleAdvance()}
                disabled={advancing}
                className="btn-primary flex-1 disabled:opacity-60"
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {advancing ? "Updating..." : nextAction.label}
              </motion.button>
            )}
            {job && (
              <Link
                href={`/dashboard/worker/chat/${job.job_id}`}
                className="btn-secondary flex-1 text-center"
              >
                Chat
              </Link>
            )}
          </div>

          <motion.button
            type="button"
            onClick={() => void handleCancel()}
            disabled={cancelling}
            className="w-full rounded-xl border border-warning px-4 py-2.5 text-sm font-semibold text-warning transition-colors hover:bg-warning/10 disabled:opacity-60"
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {cancelling ? "Cancelling..." : "Cancel Job"}
          </motion.button>

          {lastUpdate && (
            <p className="text-center text-xs text-muted">
              Updated{" "}
              {lastUpdate.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
