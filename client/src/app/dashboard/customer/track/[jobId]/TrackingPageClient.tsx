"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import TrackingMap from "@/client/components/tracking/dynamicTrackingMap";
import LiveCustomerLocation from "@/client/components/tracking/LiveCustomerLocation";
import type { RouteComputedPayload } from "@/client/lib/route-types";
import { getApiErrorMessage } from "@/client/lib/api-client";

interface TrackingPageClientProps {
  jobId: string;
  jobStatus: string;
  workerName: string;
  destination: { lat: number; lng: number; label: string } | null;
  initialWorkerLocation: { lat: number; lng: number } | null;
  initialCustomerLocation?: { lat: number; lng: number } | null;
  initialPrecomputedRoute: [number, number][] | null;
  originalText: string;
  category: string;
}

export default function TrackingPageClient({
  jobId,
  jobStatus: initialStatus,
  workerName,
  destination,
  initialWorkerLocation,
  initialCustomerLocation = null,
  initialPrecomputedRoute,
  originalText,
  category,
}: TrackingPageClientProps) {
  const [workerLocation, setWorkerLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(initialWorkerLocation);
  const [customerLocation, setCustomerLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(initialCustomerLocation);
  const [distanceKm, setDistanceKm] = useState<number | undefined>();
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState(initialStatus);
  const [arrived, setArrived] = useState(initialStatus === "ARRIVED");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [precomputedRoute, setPrecomputedRoute] = useState<
    [number, number][] | null
  >(initialPrecomputedRoute);

  const handleLocationUpdate = useCallback(
    (data: {
      lat: number;
      lng: number;
      distanceKm: number;
      etaMinutes: number;
    }) => {
      setWorkerLocation({ lat: data.lat, lng: data.lng });
      setDistanceKm(data.distanceKm);
      setEtaMinutes(data.etaMinutes);
      setLastUpdate(new Date());
    },
    [],
  );

  const handleArrived = useCallback(() => {
    setArrived(true);
    setJobStatus("ARRIVED");
    setDistanceKm(0);
    setEtaMinutes(0);
  }, []);

  // Connect to Socket.io for real-time updates
  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | null = null;

    async function connect() {
      try {
        const { joinJob } = await import("@/client/lib/socket-client");
        if (!mounted) return;
        const socket = await joinJob(jobId, "customer");

        const handleSocketLocationUpdate = (data: {
          jobId?: string;
          lat: number;
          lng: number;
          distanceKm: number;
          etaMinutes: number;
        }) => {
          if (mounted && (!data.jobId || data.jobId === jobId)) {
            handleLocationUpdate(data);
          }
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
          if (mounted) handleArrived();
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
          setJobStatus(data.status);
          if (data.status === "ARRIVED") handleArrived();
        };

        socket.on("location-update", handleSocketLocationUpdate);
        socket.on("route-computed", handleRouteComputed);
        socket.on("worker-arrived", handleWorkerArrived);
        socket.on("customer-location-update", handleCustomerLocationUpdate);
        socket.on("job-status-update", handleStatusUpdate);
        // Also listen for job status changes via SSE
        const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);
        eventSource.addEventListener("job_event", (event) => {
          if (!mounted) return;
          try {
            const events = JSON.parse(event.data) as Array<{ to_state?: string }>;
            const latest = events.at(-1)?.to_state;
            if (latest) {
              setJobStatus(latest);
              if (latest === "ARRIVED") handleArrived();
            }
          } catch {
            // Polling remains the fallback for malformed stream data.
          }
        });

        cleanup = () => {
          socket.emit("leave-job", { jobId });
          socket.off("location-update", handleSocketLocationUpdate);
          socket.off("route-computed", handleRouteComputed);
          socket.off("worker-arrived", handleWorkerArrived);
          socket.off("customer-location-update", handleCustomerLocationUpdate);
          socket.off("job-status-update", handleStatusUpdate);
          eventSource.close();
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
  }, [jobId, handleLocationUpdate, handleArrived]);

  // Fetch initial tracking data
  useEffect(() => {
    async function fetchTracking() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/tracking`);
        const body = await res.json();
        if (body?.success && body.data) {
          if (body.data.status) {
            setJobStatus(body.data.status);
            if (body.data.status === "ARRIVED") setArrived(true);
          }
          if (body.data.worker_lat != null && body.data.worker_lng != null) {
            setWorkerLocation({
              lat: body.data.worker_lat,
              lng: body.data.worker_lng,
            });
          }
          if (body.data.customer_lat != null && body.data.customer_lng != null) {
            setCustomerLocation({
              lat: body.data.customer_lat,
              lng: body.data.customer_lng,
            });
          }
          if (body.data.distance_km !== undefined && body.data.distance_km !== null) {
            setDistanceKm(body.data.distance_km);
          }
          if (body.data.eta_minutes !== undefined && body.data.eta_minutes !== null) {
            setEtaMinutes(body.data.eta_minutes);
          }
          // Capture precomputed route from tracking API
          if (
            body.data.precomputed_route &&
            Array.isArray(body.data.precomputed_route)
          ) {
            setPrecomputedRoute(
              (current) => current ?? body.data.precomputed_route,
            );
          }
          setLastUpdate(new Date());
        }
      } catch {
        // ignore
      }
    }
    void fetchTracking();
    const poll = setInterval(() => void fetchTracking(), 5000);
    return () => clearInterval(poll);
  }, [jobId]);

  const isArrived = arrived || jobStatus === "ARRIVED";
  const isAccepted = jobStatus === "ACCEPTED";

  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this job?")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by customer" }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Cancel failed"));
      }
      window.location.href = "/dashboard/customer";
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }

  const isCancelled = jobStatus === "CANCELLED";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-3 sm:p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/customer"
          className="flex items-center gap-1 text-sm font-medium text-muted hover:text-accent"
        >
          <svg
            className="h-4 w-4"
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
          Back
        </Link>
        <span
          className={`badge ${
            isArrived
              ? "!bg-accent/15 !text-accent"
              : isAccepted
                ? "!bg-success !text-success-fg"
                : "!bg-accent/15 !text-accent"
          }`}
        >
          {isArrived ? "Arrived" : isAccepted ? "Accepted" : "On the way"}
        </span>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border border-divider bg-surface p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              isArrived
                ? "bg-accent/15"
                : isAccepted
                  ? "bg-success"
                  : "bg-accent/15"
            }`}
          >
            {isArrived ? (
              <svg
                className="h-6 w-6 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
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
            ) : isAccepted ? (
              <svg
                className="h-6 w-6 text-success-fg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-urdu text-sm font-bold text-text">
              {workerName}
            </p>
            <p className="text-xs text-muted">
              {isArrived
                ? "Has arrived at your location"
                : isAccepted
                  ? "Worker accepted your job"
                  : "On the way to you"}
            </p>
          </div>
        </div>

        {/* Distance & ETA */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-bg p-3 text-center">
            <p className="text-2xl font-bold text-text">
              {distanceKm !== undefined
                ? distanceKm < 1
                  ? `${Math.round(distanceKm * 1000)}`
                  : distanceKm.toFixed(1)
                : "—"}
            </p>
            <p className="text-xs text-muted">
              {distanceKm !== undefined && distanceKm < 1 ? "meters" : "km"}
            </p>
          </div>
          <div className="rounded-xl bg-bg p-3 text-center">
            <p className="text-2xl font-bold text-text">
              {etaMinutes !== null ? etaMinutes : "—"}
            </p>
            <p className="text-xs text-muted">min ETA</p>
          </div>
        </div>

        {lastUpdate && (
          <p className="mt-2 text-center text-xs text-muted">
            Last updated:{" "}
            {lastUpdate.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* Map — always render; TrackingMap handles null destination gracefully */}
      <TrackingMap
        workerLocation={workerLocation}
        userLocation={customerLocation}
        destination={destination}
        distanceKm={distanceKm}
        perspective="customer"
        className="h-[400px]"
        precomputedRoute={precomputedRoute}
      />

      {!isCancelled && (
        <LiveCustomerLocation
          jobId={jobId}
          onLocationUpdate={setCustomerLocation}
        />
      )}

      {/* Job Info */}
      <div className="rounded-xl border border-divider bg-surface p-4">
        <div className="flex items-center gap-2">
          <span className="badge bg-accent text-bg">
            {category?.replace(/_/g, " ")}
          </span>
        </div>
        <p className="mt-2 font-urdu text-sm text-text">{originalText}</p>
        {destination?.label && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
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
            {destination.label}
          </p>
        )}
      </div>

      {/* Cancel Button */}
      {!isCancelled && (
        <>
          <motion.button
            type="button"
            onClick={() => void handleCancel()}
            disabled={cancelling}
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full rounded-xl border border-warning bg-surface px-4 py-3 text-sm font-semibold text-warning transition-colors hover:bg-warning/10 disabled:opacity-60"
          >
            {cancelling ? "Cancelling…" : "Cancel Job"}
          </motion.button>
          {cancelError && (
            <p className="mt-2 text-center text-sm text-red-500">
              {cancelError}
            </p>
          )}
        </>
      )}

      {isCancelled && (
        <div className="rounded-xl border border-warning bg-warning/10 p-4 text-center">
          <p className="text-sm font-semibold text-warning">
            Job has been cancelled
          </p>
        </div>
      )}
    </div>
  );
}
