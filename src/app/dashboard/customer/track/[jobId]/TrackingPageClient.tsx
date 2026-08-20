"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const TrackingMap = dynamic(() => import("@/components/tracking/TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-2xl bg-stone-100">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-[#0e5f44]"></div>
        <p className="mt-2 text-sm text-stone-500">Loading map...</p>
      </div>
    </div>
  ),
});

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

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/customer"
          className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-[#0e5f44]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>
        <span
          className={`badge ${
            isArrived
              ? "!bg-blue-100 !text-blue-800"
              : "!bg-green-100 !text-green-800"
          }`}
        >
          {isArrived ? "Arrived" : "On the way"}
        </span>
      </div>

      {/* Status Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              isArrived ? "bg-blue-100" : "bg-green-100"
            }`}
          >
            {isArrived ? (
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-urdu text-sm font-bold text-stone-800">
              {workerName}
            </p>
            <p className="text-xs text-stone-500">
              {isArrived ? "Has arrived at your location" : "On the way to you"}
            </p>
          </div>
        </div>

        {/* Distance & ETA */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-stone-50 p-3 text-center">
            <p className="text-2xl font-bold text-stone-800">
              {distanceKm !== undefined
                ? distanceKm < 1
                  ? `${Math.round(distanceKm * 1000)}`
                  : distanceKm.toFixed(1)
                : "—"}
            </p>
            <p className="text-xs text-stone-500">
              {distanceKm !== undefined && distanceKm < 1 ? "meters" : "km"}
            </p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3 text-center">
            <p className="text-2xl font-bold text-stone-800">
              {etaMinutes !== null ? etaMinutes : "—"}
            </p>
            <p className="text-xs text-stone-500">min ETA</p>
          </div>
        </div>

        {lastUpdate && (
          <p className="mt-2 text-center text-[10px] text-stone-400">
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
          className="h-[400px]"
        />
      ) : (
        <div className="flex h-[300px] items-center justify-center rounded-2xl bg-stone-100">
          <p className="text-sm text-stone-500">Location not available</p>
        </div>
      )}

      {/* Job Info */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="badge !bg-[#0e5f44] !text-white">
            {category?.replace(/_/g, " ")}
          </span>
        </div>
        <p className="mt-2 font-urdu text-sm text-stone-700">{originalText}</p>
        {destination?.label && (
          <p className="mt-2 flex items-center gap-1 text-xs text-stone-500">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {destination.label}
          </p>
        )}
      </div>
    </div>
  );
}
