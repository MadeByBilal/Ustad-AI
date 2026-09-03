"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

const LOCATION_PING_INTERVAL_MS = 3_000;

interface LiveTrackerProps {
  jobId: string;
  workerId?: string;
  onLocationUpdate?: (data: {
    lat: number;
    lng: number;
    distanceKm: number;
    etaMinutes: number;
  }) => void;
  onArrived?: () => void;
}

/** Continuously publishes the assigned worker's position while en route. */
export default function LiveTracker({
  jobId,
  workerId,
  onLocationUpdate,
  onArrived,
}: LiveTrackerProps) {
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const joinPromiseRef = useRef<Promise<Socket> | null>(null);
  const joinedRef = useRef(false);
  const activeRef = useRef(true);
  const lastSentAtRef = useRef(0);
  const pendingLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLocationUpdateRef = useRef(onLocationUpdate);
  const onArrivedRef = useRef(onArrived);
  onLocationUpdateRef.current = onLocationUpdate;
  onArrivedRef.current = onArrived;

  const ensureJoined = useCallback(async (): Promise<Socket> => {
    if (socketRef.current?.connected && joinedRef.current) {
      return socketRef.current;
    }
    if (joinPromiseRef.current) return joinPromiseRef.current;

    const joining = (async () => {
      const { joinJob } = await import("@/client/lib/socket-client");
      const socket = await joinJob(jobId, "worker");
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

  const sendViaHttp = useCallback(
    async (location: { lat: number; lng: number }) => {
      const response = await fetch("/api/workers/me/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Location update failed");
    },
    [],
  );

  const sendLocation = useCallback(
    (location: { lat: number; lng: number }) => {
      const publish = (socket: Socket) => {
        if (!activeRef.current) return;
        socket.emit("worker-location", { jobId, ...location });
      };

      void (socketRef.current?.connected && joinedRef.current
        ? Promise.resolve(socketRef.current)
        : ensureJoined()
      )
        .then((socket) => {
          if (socket) publish(socket);
        })
        .catch(async () => {
          try {
            await sendViaHttp(location);
          } catch {
            if (activeRef.current) setError("Unable to publish your location");
          }
        });
    },
    [ensureJoined, jobId, sendViaHttp],
  );

  const sendThrottled = useCallback(
    (location: { lat: number; lng: number }) => {
      const elapsed = Date.now() - lastSentAtRef.current;
      if (lastSentAtRef.current === 0 || elapsed >= LOCATION_PING_INTERVAL_MS) {
        lastSentAtRef.current = Date.now();
        pendingLocationRef.current = null;
        sendLocation(location);
        setLastPing(new Date());
        return;
      }

      pendingLocationRef.current = location;
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          const pending = pendingLocationRef.current;
          if (pending && activeRef.current) {
            lastSentAtRef.current = Date.now();
            pendingLocationRef.current = null;
            sendLocation(pending);
            setLastPing(new Date());
          }
        }, LOCATION_PING_INTERVAL_MS - elapsed);
      }
    },
    [sendLocation],
  );

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingLocationRef.current = null;
    setTracking(false);
    if (socketRef.current && joinedRef.current) {
      socketRef.current.emit("leave-job", { jobId });
      joinedRef.current = false;
    }
  }, [jobId]);

  const startTracking = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not available on this device");
      return;
    }
    if (watchIdRef.current !== null) return;

    setError(null);
    setTracking(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendThrottled({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        console.error("[LiveTracker] initial GPS error:", err.code, err.message);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission denied");
        } else {
          setError("Allow location access to broadcast your position");
        }
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        sendThrottled({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (positionError) => {
        console.error("[LiveTracker] watch GPS error:", positionError.code, positionError.message);
        if (positionError.code === positionError.PERMISSION_DENIED) {
          setError("Location permission denied");
        }
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }, [sendThrottled]);

  useEffect(() => {
    activeRef.current = true;
    let listenerSocket: Socket | null = null;
    const handleArrived = () => {
      onArrivedRef.current?.();
      stopTracking();
    };
    const handleTrackingError = (payload: { message?: string }) => {
      if (activeRef.current && payload?.message) setError(payload.message);
    };
    void ensureJoined()
      .then((socket) => {
        if (!activeRef.current) return;
        listenerSocket = socket;
        socket.on("worker-arrived", handleArrived);
        socket.on("tracking-error", handleTrackingError);
      })
      .catch(() => {
        if (activeRef.current) setError("Live tracking connection unavailable");
      });

    startTracking();
    return () => {
      activeRef.current = false;
      stopTracking();
      listenerSocket?.off("worker-arrived", handleArrived);
      listenerSocket?.off("tracking-error", handleTrackingError);
      socketRef.current = null;
    };
  }, [ensureJoined, startTracking, stopTracking]);

  // Render nothing — tracking runs silently in the background.
  return null;
}
