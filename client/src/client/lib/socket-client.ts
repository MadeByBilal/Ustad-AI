"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Maximum number of automatic reconnection attempts before giving up and
 * letting the caller decide (e.g. fall back to HTTP polling).
 */
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Base delay (ms) for exponential back-off reconnection.
 * Attempt n waits min(BASE_RECONNECT_DELAY * 2^n, MAX_RECONNECT_DELAY) ms.
 */
const BASE_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export function getSocket(): Socket {
  if (socket) return socket;

  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const url =
    configuredUrl ??
    (typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : typeof window !== "undefined"
        ? window.location.origin
        : "");
  socket = io(url, {
    path: "/api/socketio",
    transports: ["websocket", "polling"],
    autoConnect: false,
    withCredentials: true,
    // Disable the built-in reconnection so we can apply our own back-off logic.
    reconnection: false,
  });

  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

/**
 * Attach exponential back-off reconnection to a socket instance.
 *
 * Call this once after obtaining a socket. The returned cleanup function
 * removes all reconnect listeners and cancels any pending retry timer.
 */
export function attachReconnectLogic(
  s: Socket,
  opts?: {
    maxAttempts?: number;
    onReconnecting?: (attempt: number) => void;
    onReconnected?: () => void;
    onGiveUp?: () => void;
  },
): () => void {
  const maxAttempts = opts?.maxAttempts ?? MAX_RECONNECT_ATTEMPTS;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let active = true;

  function scheduleReconnect() {
    if (!active || attempt >= maxAttempts) {
      opts?.onGiveUp?.();
      return;
    }
    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * 2 ** attempt,
      MAX_RECONNECT_DELAY_MS,
    );
    attempt += 1;
    opts?.onReconnecting?.(attempt);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (active && !s.connected) {
        s.connect();
      }
    }, delay);
  }

  function onConnect() {
    attempt = 0;
    opts?.onReconnected?.();
  }

  function onDisconnect(reason: string) {
    // "io server disconnect" means the server intentionally closed the
    // connection (e.g. auth failure).  Don't retry in that case.
    if (!active || reason === "io server disconnect") return;
    scheduleReconnect();
  }

  s.on("connect", onConnect);
  s.on("disconnect", onDisconnect);

  return () => {
    active = false;
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    s.off("connect", onConnect);
    s.off("disconnect", onDisconnect);
  };
}

export async function joinJob(
  jobId: string,
  role: "customer" | "worker",
): Promise<Socket> {
  const s = connectSocket();
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("Tracking connection timed out")),
      5_000,
    );
    s.emit(
      "join-job",
      { jobId, role },
      (result: { ok?: boolean; message?: string }) => {
        window.clearTimeout(timeout);
        if (result?.ok) resolve();
        else reject(new Error(result?.message ?? "Unable to join tracking"));
      },
    );
  });
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
