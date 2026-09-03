"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACCEPTED: { label: "Worker accepted", color: "text-success-fg" },
  EN_ROUTE: { label: "On the way to you", color: "text-accent" },
  ARRIVED: { label: "Has arrived", color: "text-accent" },
  IN_PROGRESS: { label: "Working", color: "text-accent" },
  AWAITING_CUSTOMER_CONFIRMATION: {
    label: "Waiting for your confirmation",
    color: "text-warning",
  },
};

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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [precomputedRoute, setPrecomputedRoute] = useState<
    [number, number][] | null
  >(initialPrecomputedRoute);
  const lastWorkerLocRef = useRef<string | null>(null);

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

  // Socket.io for real-time updates
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
          if (mounted) setJobStatus("ARRIVED");
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
        };

        socket.on("location-update", handleSocketLocationUpdate);
        socket.on("route-computed", handleRouteComputed);
        socket.on("worker-arrived", handleWorkerArrived);
        socket.on("customer-location-update", handleCustomerLocationUpdate);
        socket.on("job-status-update", handleStatusUpdate);

        cleanup = () => {
          socket.emit("leave-job", { jobId });
          socket.off("location-update", handleSocketLocationUpdate);
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
  }, [jobId, handleLocationUpdate]);

  // Fetch initial tracking data
  useEffect(() => {
    async function fetchTracking() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/tracking`);
        const body = await res.json();
        if (body?.success && body.data) {
          if (body.data.status) setJobStatus(body.data.status);
          if (body.data.worker_lat != null && body.data.worker_lng != null) {
            const wKey = `${body.data.worker_lat.toFixed(6)},${body.data.worker_lng.toFixed(6)}`;
            if (lastWorkerLocRef.current !== wKey) {
              lastWorkerLocRef.current = wKey;
              setWorkerLocation({
                lat: body.data.worker_lat,
                lng: body.data.worker_lng,
              });
            }
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

  const isCancelled = jobStatus === "CANCELLED";

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this job?")) return;
    setCancelling(true);
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
    } catch {
      // ignore
    } finally {
      setCancelling(false);
    }
  }

  const statusInfo = STATUS_LABELS[jobStatus] ?? {
    label: jobStatus,
    color: "text-muted",
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
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
          <p className="text-sm font-bold text-text">{workerName}</p>
          <p className={`text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </p>
        </div>
        <Link
          href={`/dashboard/customer/chat/${jobId}`}
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
      </div>

      {/* Map */}
      <div className="h-[65vh] w-full shrink-0">
        <TrackingMap
          workerLocation={workerLocation}
          userLocation={customerLocation}
          destination={destination}
          distanceKm={distanceKm}
          perspective="customer"
          className="h-full w-full"
          precomputedRoute={precomputedRoute}
        />
      </div>

      {/* Live customer GPS */}
      {!isCancelled && (
        <LiveCustomerLocation
          jobId={jobId}
          onLocationUpdate={setCustomerLocation}
        />
      )}

      {/* Bottom Panel */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-surface px-5 pt-4 pb-32">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-lg font-bold ${statusInfo.color}`}>
              {statusInfo.label}
            </p>
            <p className="text-sm text-muted">
              {category?.replace(/_/g, " ") || "Job in progress"}
            </p>
          </div>
          <div className="text-right">
            {distanceKm !== undefined && (
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

        {/* Job Info */}
        <p className="mt-3 font-urdu text-sm text-text/80 line-clamp-2">
          {originalText}
        </p>

        {/* Action Buttons */}
        {!isCancelled && (
          <div className="mt-auto flex flex-col gap-3 pt-4">
            <div className="flex gap-3">
              <a
                href={`/dashboard/customer/chat/${jobId}`}
                className="btn-secondary flex-1 text-center"
              >
                Chat
              </a>
              <motion.button
                type="button"
                onClick={() => void handleCancel()}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-warning px-4 py-2.5 text-sm font-semibold text-warning transition-colors hover:bg-warning/10 disabled:opacity-60"
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {cancelling ? "Cancelling..." : "Cancel Job"}
              </motion.button>
            </div>

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
        )}

        {isCancelled && (
          <div className="mt-auto rounded-xl border border-warning bg-warning/10 p-4 text-center">
            <p className="text-sm font-semibold text-warning">
              Job has been cancelled
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
