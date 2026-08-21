"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface LiveTrackerProps {
  jobId: string;
  onLocationUpdate?: (data: {
    lat: number;
    lng: number;
    distanceKm: number;
    etaMinutes: number;
  }) => void;
  onArrived?: () => void;
}

/**
 * Continuous GPS tracker for workers en route to a job.
 * Uses watchPosition with throttled pings via Socket.io.
 */
export default function LiveTracker({
  jobId,
  onLocationUpdate,
  onArrived,
}: LiveTrackerProps) {
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const socketRef = useRef<unknown>(null);
  const onLocationUpdateRef = useRef(onLocationUpdate);
  const onArrivedRef = useRef(onArrived);

  onLocationUpdateRef.current = onLocationUpdate;
  onArrivedRef.current = onArrived;

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);

    try {
      import("@/lib/socket-client").then(({ disconnectSocket }) => {
        disconnectSocket();
      });
    } catch {
      // ignore
    }
  }, []);

  const sendLocation = useCallback(
    (lat: number, lng: number) => {
      try {
        import("@/lib/socket-client").then(({ connectSocket }) => {
          const socket = connectSocket();
          socketRef.current = socket;

          socket.emit("worker-location", { jobId, lat, lng });

          socket.off("worker-arrived");
          socket.on("worker-arrived", () => {
            onArrivedRef.current?.();
            stopTracking();
          });
        });
      } catch {
        // Socket not available
      }
    },
    [jobId, stopTracking]
  );

  const startTracking = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation not available");
      return;
    }

    setError(null);
    setTracking(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        sendLocation(latitude, longitude);
        setLastPing(new Date());
      },
      () => {
        setError("Could not read your location");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        sendLocation(latitude, longitude);
        setLastPing(new Date());
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission denied");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, [sendLocation]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Auto-start tracking on mount (when status becomes EN_ROUTE)
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (!hasAutoStarted.current) {
      hasAutoStarted.current = true;
      startTracking();
    }
  }, [startTracking]);

  return (
    <motion.div className="card" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-text">Live Tracking</h3>
          <p className="text-xs text-muted">
            {tracking
              ? lastPing
                ? `Last ping: ${lastPing.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "Starting..."
              : "Tracking paused"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tracking && (
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-accent"></span>
            </span>
          )}
          <motion.button
            type="button"
            onClick={tracking ? stopTracking : startTracking}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tracking
                ? "border border-warning text-warning hover:bg-warning/10"
                : "bg-accent text-bg hover:bg-accent/90"
            }`}
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {tracking ? "Stop" : "Start tracking"}
          </motion.button>
        </div>
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs text-warning">
          {error}
        </p>
      )}

      {tracking && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-accent/15 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-accent"></div>
          <span className="text-xs font-medium text-accent">
            Broadcasting your location to the customer
          </span>
        </div>
      )}
    </motion.div>
  );
}
