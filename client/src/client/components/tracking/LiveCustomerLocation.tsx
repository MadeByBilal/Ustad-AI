"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

const LOCATION_PING_INTERVAL_MS = 3_000;

interface LiveCustomerLocationProps {
  jobId: string;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
}

/** Shares the customer's current position with the assigned worker. */
export default function LiveCustomerLocation({
  jobId,
  onLocationUpdate,
}: LiveCustomerLocationProps) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const joinPromiseRef = useRef<Promise<Socket> | null>(null);
  const joinedRef = useRef(false);
  const lastSentAtRef = useRef(0);
  const pendingLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);
  const onLocationUpdateRef = useRef(onLocationUpdate);
  onLocationUpdateRef.current = onLocationUpdate;

  const getSocket = useCallback(async (): Promise<Socket | null> => {
    if (socketRef.current) return socketRef.current;
    if (!activeRef.current) return null;
    if (joinPromiseRef.current) return joinPromiseRef.current;

    const joining = (async () => {
      const { joinJob } = await import("@/client/lib/socket-client");
      const socket = await joinJob(jobId, "customer");
      socketRef.current = socket;
      joinedRef.current = true;
      return socket;
    })();
    joinPromiseRef.current = joining;
    try {
      return await joining;
    } finally {
      if (joinPromiseRef.current === joining) joinPromiseRef.current = null;
    }
  }, [jobId]);

  const sendNow = useCallback(
    (location: { lat: number; lng: number }) => {
      if (!activeRef.current) return;
      lastSentAtRef.current = Date.now();
      pendingLocationRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      onLocationUpdateRef.current?.(location);
      void getSocket()
        .then((socket) => {
          if (socket && activeRef.current) {
            socket.emit("customer-location", { jobId, ...location });
          }
        })
        .catch(() => {
          if (activeRef.current) setError("Live location is unavailable");
        });
    },
    [getSocket, jobId],
  );

  const publish = useCallback(
    (location: { lat: number; lng: number }) => {
      const elapsed = Date.now() - lastSentAtRef.current;
      if (elapsed >= LOCATION_PING_INTERVAL_MS || lastSentAtRef.current === 0) {
        sendNow(location);
        return;
      }

      pendingLocationRef.current = location;
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          const pending = pendingLocationRef.current;
          if (pending && activeRef.current) sendNow(pending);
        }, LOCATION_PING_INTERVAL_MS - elapsed);
      }
    },
    [sendNow],
  );

  useEffect(() => {
    activeRef.current = true;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location sharing is not available on this device");
      return;
    }

    setError(null);
    setSharing(true);
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        publish({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        if (activeRef.current) {
          setSharing(false);
          setError("Allow location access to share your live position");
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 2_000 },
    );

    return () => {
      activeRef.current = false;
      navigator.geolocation.clearWatch(watchId);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (socketRef.current && joinedRef.current) {
        socketRef.current.emit("leave-job", { jobId });
      }
      socketRef.current = null;
      joinedRef.current = false;
    };
  }, [jobId, publish]);

  return (
    <p
      className={`rounded-xl px-3 py-2 text-xs ${
        error ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"
      }`}
      aria-live="polite"
    >
      {error ?? (sharing ? "Sharing your live location with the worker" : "Starting live location sharing...")}
    </p>
  );
}
