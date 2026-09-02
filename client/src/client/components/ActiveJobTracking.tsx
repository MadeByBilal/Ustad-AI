"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import ReviewScreen from "./ReviewScreen";
import { motion } from "framer-motion";
import TrackingMap from "@/client/components/tracking/dynamicTrackingMap";
import LiveCustomerLocation from "@/client/components/tracking/LiveCustomerLocation";
import type { RouteComputedPayload } from "@/client/lib/route-types";
import { getApiErrorMessage } from "@/client/lib/api-client";

interface ActiveJob {
  job_id: string;
  status: string;
  category: string;
  original_text: string;
  worker_name: string;
  destination: { lat: number; lng: number; label: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACCEPTED: { label: "Worker accepted", color: "text-success-fg" },
  EN_ROUTE: { label: "On the way", color: "text-accent" },
  ARRIVED: { label: "Arrived", color: "text-accent" },
  IN_PROGRESS: { label: "Work in progress", color: "text-accent" },
  AWAITING_CUSTOMER_CONFIRMATION: {
    label: "Needs your approval",
    color: "text-warning",
  },
};

export default function ActiveJobTracking() {
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
  const [approving, setApproving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [showReview, setShowReview] = useState(false);
  const [precomputedRoute, setPrecomputedRoute] = useState<
    [number, number][] | null
  >(null);
  const activeJobIdRef = useRef<string | null>(null);

  // Fetch active job
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/requests/list", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!body?.success) return;

      const active = (body.data?.requests ?? []).find((r: { status: string }) =>
        [
          "ACCEPTED",
          "EN_ROUTE",
          "ARRIVED",
          "IN_PROGRESS",
          "AWAITING_CUSTOMER_CONFIRMATION",
        ].includes(r.status),
      );

      if (active) {
        const routeFromList =
          Array.isArray(active.precomputed_route) &&
          active.precomputed_route.length >= 2
            ? active.precomputed_route
            : null;
        if (activeJobIdRef.current !== active.job_id) {
          activeJobIdRef.current = active.job_id;
          setPrecomputedRoute(routeFromList);
        } else if (routeFromList) {
          setPrecomputedRoute((current) => current ?? routeFromList);
        }

        const hasInitialDestination =
          typeof active.destination_lat === "number" &&
          Number.isFinite(active.destination_lat) &&
          typeof active.destination_lng === "number" &&
          Number.isFinite(active.destination_lng);
        setJob({
          job_id: active.job_id,
          status: active.status,
          category: active.category,
          original_text: active.original_text,
          worker_name: active.worker_name ?? "Worker",
          destination: hasInitialDestination
            ? {
                lat: active.destination_lat,
                lng: active.destination_lng,
                label: active.address_label ?? "Destination",
              }
            : null,
        });

        if (
          typeof active.worker_lat === "number" &&
          Number.isFinite(active.worker_lat) &&
          typeof active.worker_lng === "number" &&
          Number.isFinite(active.worker_lng)
        ) {
          setWorkerLocation({ lat: active.worker_lat, lng: active.worker_lng });
        }

        // Get destination from job detail
        const jobRes = await fetch(`/api/jobs/${active.job_id}/tracking`);
        const jobBody = await jobRes.json().catch(() => null);

        setJob({
          job_id: active.job_id,
          status: active.status,
          category: active.category,
          original_text: active.original_text,
          worker_name: active.worker_name ?? "Worker",
          destination: jobBody?.data?.destination_lat
            ? {
                lat: jobBody.data.destination_lat,
                lng: jobBody.data.destination_lng,
                label: jobBody.data.destination_label ?? "Destination",
              }
            : null,
        });

        // Capture precomputed route from tracking API
        if (
          jobBody?.data?.precomputed_route &&
          Array.isArray(jobBody.data.precomputed_route)
        ) {
          setPrecomputedRoute(
            (current) => current ?? jobBody.data.precomputed_route,
          );
        }

        if (jobBody?.data?.worker_lat != null && jobBody?.data?.worker_lng != null) {
          setWorkerLocation({
            lat: jobBody.data.worker_lat,
            lng: jobBody.data.worker_lng,
          });
          setDistanceKm(jobBody.data.distance_km);
          setEtaMinutes(jobBody.data.eta_minutes);
          setLastUpdate(new Date());
        }
        if (jobBody?.data?.customer_lat != null && jobBody?.data?.customer_lng != null) {
          setCustomerLocation({
            lat: jobBody.data.customer_lat,
            lng: jobBody.data.customer_lng,
          });
        }
      } else {
        activeJobIdRef.current = null;
        setPrecomputedRoute(null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(poll);
  }, [refresh]);

  // Socket.io for real-time updates
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
        const socket = await joinJob(jobId, "customer");

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

        const handleWorkerArrived = () => {
          if (!mounted) return;
          setDistanceKm(0);
          setEtaMinutes(0);
          void refresh();
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
        socket.on("worker-arrived", handleWorkerArrived);
        socket.on("customer-location-update", handleCustomerLocationUpdate);
        socket.on("job-status-update", handleStatusUpdate);
        cleanup = () => {
          socket.emit("leave-job", { jobId });
          socket.off("location-update", handleLocationUpdate);
          socket.off("route-computed", handleRouteComputed);
          socket.off("worker-arrived", handleWorkerArrived);
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
  }, [activeJobId, refresh]);

  // Approve work
  async function handleApprove(action: "approve" | "dispute") {
    if (!job) return;
    setApproving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/jobs/${job.job_id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Action failed"));
      }
      setMessage({
        ok: true,
        text: action === "approve" ? "Work approved!" : "Dispute submitted",
      });
      if (action === "approve") {
        setTimeout(() => setShowReview(true), 1000);
      } else {
        setTimeout(() => void refresh(), 1000);
      }
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof Error ? e.message : "Action failed",
      });
    } finally {
      setApproving(false);
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
        body: JSON.stringify({ reason: "Cancelled by customer" }),
      });
      const body = await res.json().catch(() => null);
      // Treat both success and already-cancelled (409 invalid_status) as done.
      if (!res.ok && !(res.status === 409 && body?.details?.code === "invalid_status")) {
        throw new Error(getApiErrorMessage(body, "Cancel failed"));
      }
      // Redirect to home regardless — job is gone.
      window.location.href = "/dashboard/customer";
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof Error ? e.message : "Cancel failed",
      });
    } finally {
      setCancelling(false);
    }
  }

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
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
        </div>
        <p className="mt-5 text-lg font-bold text-text">No active job</p>
        <p className="mt-1 text-sm text-muted">
          Tracking will appear here when a worker is on the way
        </p>
        <Link href="/dashboard/customer" className="btn-primary mt-6">
          Back to home
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[job.status] ?? {
    label: job.status,
    color: "text-muted",
  };
  const isApproval = job.status === "AWAITING_CUSTOMER_CONFIRMATION";

  // Show review screen after approval
  if (showReview) {
    return (
      <ReviewScreen
        jobId={job.job_id}
        workerName={job.worker_name}
        onDone={() => {
          setShowReview(false);
      setJob(null);
      window.location.href = "/dashboard/customer";
        }}
      />
    );
  }

  // Show completion screen after dispute
  if (message?.ok && message.text === "Dispute submitted") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-bg px-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
          <svg
            className="h-10 w-10 text-warning"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold text-text">
          Dispute submitted
        </h1>
        <p className="mt-2 text-center text-base text-muted">
          We will review your dispute and get back to you.
        </p>
        <Link href="/dashboard/customer" className="btn-primary mt-8">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-bg">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center gap-3 bg-surface/95 px-4 py-3 backdrop-blur-lg">
        <Link
          href="/dashboard/customer"
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
          <p className="text-sm font-bold text-text">{job.worker_name}</p>
          <p className={`text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </p>
        </div>
        {!isApproval && (
          <Link
            href={`/dashboard/customer/chat/${job.job_id}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-bg"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
          </Link>
        )}
      </div>

      {/* Map - Always render, show waiting message inside */}
      <div className="h-[65vh] w-full shrink-0">
        <TrackingMap
          workerLocation={workerLocation}
          userLocation={customerLocation}
          destination={job.destination}
          distanceKm={distanceKm}
          perspective="customer"
          className="h-full w-full"
          precomputedRoute={precomputedRoute}
        />
      </div>

      <LiveCustomerLocation
        jobId={job.job_id}
        onLocationUpdate={setCustomerLocation}
      />

      {/* Bottom Panel */}
      <div className="flex-1 bg-surface px-5 pt-4 pb-6">
        {/* Status + Distance */}
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-lg font-bold ${statusInfo.color}`}>
              {isApproval ? "Work Complete" : statusInfo.label}
            </p>
            <p className="text-sm text-muted">{job.worker_name}</p>
          </div>
          <div className="text-right">
            {distanceKm !== undefined && !isApproval && (
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

        {/* Message */}
        {message && (
          <p
            className={`mt-3 rounded-xl px-4 py-3 text-sm ${message.ok ? "bg-success/15 text-success-fg" : "bg-warning/10 text-warning"}`}
          >
            {message.text}
          </p>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex gap-3">
          {isApproval ? (
            <>
              <motion.button
                type="button"
                onClick={() => void handleApprove("approve")}
                disabled={approving}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="btn-primary flex-1 disabled:opacity-60"
              >
                {approving ? "Approving..." : "Approve Work"}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => void handleApprove("dispute")}
                disabled={approving}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="btn-danger flex-1 disabled:opacity-60"
              >
                {approving ? "Submitting..." : "Dispute"}
              </motion.button>
            </>
          ) : (
            <Link
              href={`/dashboard/customer/chat/${job.job_id}`}
              className="btn-primary flex-1 text-center"
            >
              <svg
                className="mr-2 inline h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
              Chat with worker
            </Link>
          )}
        </div>

        {!isApproval && (
          <motion.button
            type="button"
            onClick={() => void handleCancel()}
            disabled={cancelling}
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="mt-3 w-full rounded-xl border border-warning px-4 py-2.5 text-sm font-semibold text-warning transition-colors hover:bg-warning/10 disabled:opacity-60"
          >
            {cancelling ? "Cancelling..." : "Cancel Job"}
          </motion.button>
        )}

        {lastUpdate && (
          <p className="mt-3 text-center text-xs text-muted">
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
  );
}
