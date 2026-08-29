"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import TrackingMap from "@/components/tracking/dynamicTrackingMap";
import { ArrowLeft, MapPin, CheckCircle2, Truck } from "lucide-react";

interface TrackingPageClientProps {
  jobId: string;
  jobStatus: string;
  workerName: string;
  destination: { lat: number; lng: number; label: string } | null;
  originalText: string;
  category: string;
}

export default function TrackingPageClient({
  jobId,
  jobStatus: initialStatus,
  workerName,
  destination,
  originalText,
  category,
}: TrackingPageClientProps) {
  const [workerLocation, setWorkerLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | undefined>();
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState(initialStatus);
  const [arrived, setArrived] = useState(initialStatus === "ARRIVED");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleLocationUpdate = useCallback(
    (data: { lat: number; lng: number; distanceKm: number; etaMinutes: number }) => {
      setWorkerLocation({ lat: data.lat, lng: data.lng });
      setDistanceKm(data.distanceKm);
      setEtaMinutes(data.etaMinutes);
      setLastUpdate(new Date());
    },
    []
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

    async function connect() {
      try {
        const { connectSocket } = await import("@/lib/socket-client");
        const socket = connectSocket();

        socket.emit("join-job", { jobId, role: "customer" });

        socket.on("location-update", (data: {
          lat: number;
          lng: number;
          distanceKm: number;
          etaMinutes: number;
        }) => {
          if (mounted) handleLocationUpdate(data);
        });

        socket.on("worker-arrived", () => {
          if (mounted) handleArrived();
        });

        // Also listen for job status changes via SSE
        const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);
        eventSource.addEventListener("job_event", () => {
          // Refresh page on status change
          if (mounted) window.location.reload();
        });

        return () => {
          socket.emit("leave-job", { jobId });
          socket.off("location-update");
          socket.off("worker-arrived");
          eventSource.close();
        };
      } catch {
        // Socket not available
      }
    }

    void connect();

    return () => {
      mounted = false;
    };
  }, [jobId, handleLocationUpdate, handleArrived]);

  // Fetch initial tracking data
  useEffect(() => {
    async function fetchTracking() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/tracking`);
        const body = await res.json();
        if (body?.success && body.data) {
          if (body.data.worker_lat && body.data.worker_lng) {
            setWorkerLocation({
              lat: body.data.worker_lat,
              lng: body.data.worker_lng,
            });
          }
          if (body.data.distance_km !== undefined) {
            setDistanceKm(body.data.distance_km);
          }
          if (body.data.eta_minutes !== undefined) {
            setEtaMinutes(body.data.eta_minutes);
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
        throw new Error(body?.error ?? "Cancel failed");
      }
      setJobStatus("CANCELLED");
    } catch {
      // ignore
    } finally {
      setCancelling(false);
    }
  }

  const isCancelled = jobStatus === "CANCELLED";

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/customer"
          className="flex items-center gap-1 text-sm font-medium text-muted hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
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
              isArrived ? "bg-accent/15" : isAccepted ? "bg-success" : "bg-accent/15"
            }`}
          >
            {isArrived ? (
              <MapPin className="h-6 w-6 text-accent" />
            ) : isAccepted ? (
              <CheckCircle2 className="h-6 w-6 text-success-fg" />
            ) : (
              <Truck className="h-6 w-6 text-accent" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-urdu text-sm font-bold text-text">
              {workerName}
            </p>
            <p className="text-xs text-muted">
              {isArrived ? "Has arrived at your location" : isAccepted ? "Worker accepted your job" : "On the way to you"}
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
            Last updated: {lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        )}
      </div>

      {/* Map */}
      {destination ? (
        <TrackingMap
          workerLocation={workerLocation}
          destination={destination}
          distanceKm={distanceKm}
          perspective="customer"
          className="h-[400px]"
        />
      ) : (
        <div className="flex h-[300px] items-center justify-center rounded-xl bg-surface">
          <p className="text-sm text-muted">Location not available</p>
        </div>
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
            <MapPin className="h-3 w-3" />
            {destination.label}
          </p>
        )}
      </div>

      {/* Cancel Button */}
      {!isCancelled && (
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
      )}

      {isCancelled && (
        <div className="rounded-xl border border-warning bg-warning/10 p-4 text-center">
          <p className="text-sm font-semibold text-warning">Job has been cancelled</p>
        </div>
      )}
    </div>
  );
}
