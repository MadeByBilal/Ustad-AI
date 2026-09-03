"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

const LOCATION_PING_INTERVAL_MS = 3_000;
/** How many consecutive socket failures before we switch to HTTP. */
const SOCKET_FAIL_THRESHOLD = 3;
/** Interval for the HTTP fallback pings. */
const HTTP_FALLBACK_INTERVAL_MS = 5_000;

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

  // Track consecutive socket errors so we can fall back to HTTP.
  const socketFailCountRef = useRef(0);
  const useHttpFallbackRef = useRef(false);
  const httpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHttpLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const cleanupReconnectRef = useRef<(() => void) | null>(null);

  // ── HTTP fallback ──────────────────────────────────────────────────────────

  const sendViaHttp = useCallback(
    async (location: { lat: number; lng: number }) => {
      if (!activeRef.current) return;
      try {
        const res = await fetch(`/api/jobs/${jobId}/customer-location`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(location),
          credentials: "include",
        });
        if (!res.ok && activeRef.current) {
          setError("Live location update failed");
        }
      } catch {
        if (activeRef.current) setError("Live location is unavailable");
      }
    },
    [jobId],
  );

  const startHttpFallback = useCallback(() => {
    if (httpIntervalRef.current) return; // already running
    useHttpFallbackRef.current = true;

    // Send the most-recent known location immediately.
    const current = lastHttpLocationRef.current;
    if (current) void sendViaHttp(current);

    httpIntervalRef.current = setInterval(() => {
      const loc = lastHttpLocationRef.current;
      if (loc && activeRef.current) void sendViaHttp(loc);
    }, HTTP_FALLBACK_INTERVAL_MS);
  }, [sendViaHttp]);

  const stopHttpFallback = useCallback(() => {
    if (httpIntervalRef.current) {
      clearInterval(httpIntervalRef.current);
      httpIntervalRef.current = null;
    }
    useHttpFallbackRef.current = false;
  }, []);

  // ── Socket ─────────────────────────────────────────────────────────────────

  const getSocket = useCallback(async (): Promise<Socket | null> => {
    if (socketRef.current) return socketRef.current;
    if (!activeRef.current) return null;
    if (joinPromiseRef.current) return joinPromiseRef.current;

    const joining = (async () => {
      const { joinJob, attachReconnectLogic } = await import(
        "@/client/lib/socket-client"
      );
      const socket = await joinJob(jobId, "customer");
      socketRef.current = socket;
      joinedRef.current = true;
      socketFailCountRef.current = 0;

      // Attach retry logic with callbacks to switch to HTTP fallback when
      // the socket gives up, and back to socket on successful reconnection.
      cleanupReconnectRef.current = attachReconnectLogic(socket, {
        onReconnecting: () => {
          socketFailCountRef.current += 1;
          if (socketFailCountRef.current >= SOCKET_FAIL_THRESHOLD) {
            startHttpFallback();
          }
        },
        onReconnected: () => {
          socketFailCountRef.current = 0;
          stopHttpFallback();
        },
        onGiveUp: () => {
          startHttpFallback();
        },
      });

      return socket;
    })();
    joinPromiseRef.current = joining;
    try {
      return await joining;
    } finally {
      if (joinPromiseRef.current === joining) joinPromiseRef.current = null;
    }
  }, [jobId, startHttpFallback, stopHttpFallback]);

  // ── Location publishing ────────────────────────────────────────────────────

  const sendNow = useCallback(
    (location: { lat: number; lng: number }) => {
      if (!activeRef.current) return;
      lastSentAtRef.current = Date.now();
      pendingLocationRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      console.log("[LiveCustomerLocation] sending location:", location.lat, location.lng);
      onLocationUpdateRef.current?.(location);

      // Always keep the latest location for the HTTP fallback.
      lastHttpLocationRef.current = location;

      if (useHttpFallbackRef.current) {
        // HTTP path: send immediately (interval handles periodic resends).
        void sendViaHttp(location);
        return;
      }

      // Socket path.
      void getSocket()
        .then((socket) => {
          if (socket && activeRef.current) {
            socket.emit("customer-location", { jobId, ...location });
          }
        })
        .catch(() => {
          if (activeRef.current) {
            socketFailCountRef.current += 1;
            if (socketFailCountRef.current >= SOCKET_FAIL_THRESHOLD) {
              startHttpFallback();
            }
          }
        });
    },
    [getSocket, jobId, sendViaHttp, startHttpFallback],
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
    console.log("[LiveCustomerLocation] starting GPS watch for job:", jobId);
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        console.log("[LiveCustomerLocation] GPS position received:", position.coords.latitude, position.coords.longitude);
        publish({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        console.error("[LiveCustomerLocation] GPS error:", err.code, err.message);
        if (activeRef.current) {
          setSharing(false);
          setError("Allow location access to share your live position");
        }
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );

    return () => {
      activeRef.current = false;
      navigator.geolocation.clearWatch(watchId);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (httpIntervalRef.current) clearInterval(httpIntervalRef.current);
      cleanupReconnectRef.current?.();
      if (socketRef.current && joinedRef.current) {
        socketRef.current.emit("leave-job", { jobId });
      }
      socketRef.current = null;
      joinedRef.current = false;
      useHttpFallbackRef.current = false;
      socketFailCountRef.current = 0;
    };
  }, [jobId, publish]);

  return (
    <p
      className={`rounded-xl px-3 py-2 text-xs ${
        error ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"
      }`}
      aria-live="polite"
    >
      {error ??
        (sharing
          ? `Sharing your live location with the worker${useHttpFallbackRef.current ? " (offline mode)" : ""}`
          : "Starting live location sharing...")}
    </p>
  );
}
