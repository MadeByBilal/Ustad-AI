"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

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
