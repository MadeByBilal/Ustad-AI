import type { Server, Socket } from "socket.io";
import {
  Job,
  JobEvent,
  Message,
  Session,
  User,
  Worker,
  SYSTEM_SENDER_ID,
} from "../models/index.js";
import { connectDB } from "./mongodb.js";
import {
  isSessionExpired,
  isSessionTokenValid,
  SESSION_COOKIE_NAME,
} from "./auth/session.js";
import { haversineDistanceKm, estimateETAMinutes } from "./geo.js";
import type { RouteComputedPayload, RoutePoint } from "./route-types.js";
import {
  getTrackingTarget,
  parseLocationPayload,
} from "./tracking/realtime.js";
import { computeAndStoreRoute } from "./job/route-precompute.js";

const ARRIVAL_THRESHOLD_KM = 0.1;
const ROUTE_DEVIATION_THRESHOLD_KM = 0.2; // 200m — re-route if worker deviates this far
const LOCATION_RATE_LIMIT_MS = 2000;
const TRACKING_STATUSES = new Set([
  "ACCEPTED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "AWAITING_CUSTOMER_CONFIRMATION",
]);

// --- In-memory location cache with periodic DB flush ---
const LOCATION_FLUSH_INTERVAL_MS = 30_000;
const LOCATION_STALENESS_MS = 120_000;

interface CachedLocation {
  lat: number;
  lng: number;
  updatedAt: number;
}

interface CachedWorkerLocation extends CachedLocation {
  workerId: string;
  userId: string;
}

interface CachedCustomerLocation extends CachedLocation {
  jobId: string;
  userId: string;
}

// jobId -> worker location (single worker per job)
const workerLocationCache = new Map<string, CachedWorkerLocation>();
// jobId -> customer location
const customerLocationCache = new Map<string, CachedCustomerLocation>();
// socket.id -> jobId (tracks which job room each socket is in)
const socketJobMap = new Map<string, string>();
// jobId -> Set<socket.id> (tracks active sockets per job for staleness)
const jobSocketsMap = new Map<string, Set<string>>();

function cacheWorkerLocation(
  jobId: string,
  workerId: string,
  userId: string,
  lat: number,
  lng: number,
): void {
  workerLocationCache.set(jobId, {
    workerId,
    userId,
    lat,
    lng,
    updatedAt: Date.now(),
  });
}

function cacheCustomerLocation(
  jobId: string,
  userId: string,
  lat: number,
  lng: number,
): void {
  customerLocationCache.set(jobId, {
    jobId,
    userId,
    lat,
    lng,
    updatedAt: Date.now(),
  });
}

async function flushLocationCache(): Promise<void> {
  const now = Date.now();
  const workerWrites: Promise<any>[] = [];
  const customerWrites: Promise<any>[] = [];

  for (const [jobId, loc] of workerLocationCache) {
    if (now - loc.updatedAt < LOCATION_FLUSH_INTERVAL_MS) continue;
    workerWrites.push(
      Worker.updateOne(
        { _id: loc.workerId, user_id: loc.userId },
        {
          $set: {
            "location.type": "Point",
            "location.coordinates": [loc.lng, loc.lat],
            location_updated_at: new Date(loc.updatedAt),
          },
        },
      ).catch((err) =>
        console.error(`[location-cache] failed to flush worker ${loc.workerId}:`, err),
      ),
    );
    // Mark as flushed by resetting updatedAt to now
    loc.updatedAt = now;
  }

  for (const [jobId, loc] of customerLocationCache) {
    if (now - loc.updatedAt < LOCATION_FLUSH_INTERVAL_MS) continue;
    customerWrites.push(
      Job.updateOne(
        { _id: jobId },
        {
          $set: {
            "tracking.customer_location": {
              type: "Point",
              coordinates: [loc.lng, loc.lat],
            },
            "tracking.customer_location_updated_at": new Date(loc.updatedAt),
          },
        },
      ).catch((err) =>
        console.error(`[location-cache] failed to flush customer for job ${jobId}:`, err),
      ),
    );
    loc.updatedAt = now;
  }

  if (workerWrites.length || customerWrites.length) {
    await Promise.all([...workerWrites, ...customerWrites]);
  }
}

// Flush cache periodically
const flushTimer = setInterval(() => {
  void flushLocationCache();
}, LOCATION_FLUSH_INTERVAL_MS);

// Clean up stale entries where no sockets are connected
function cleanStaleLocations(): void {
  const now = Date.now();
  for (const [jobId] of workerLocationCache) {
    if (!jobSocketsMap.has(jobId)) {
      workerLocationCache.delete(jobId);
    }
  }
  for (const [jobId] of customerLocationCache) {
    if (!jobSocketsMap.has(jobId)) {
      customerLocationCache.delete(jobId);
    }
  }
}

// --- Rate limiting ---
const lastLocationTime = new Map<string, number>();

function isLocationRateLimited(socketId: string): boolean {
  const now = Date.now();
  const last = lastLocationTime.get(socketId) ?? 0;
  if (now - last < LOCATION_RATE_LIMIT_MS) return true;
  lastLocationTime.set(socketId, now);
  return false;
}

function cleanupRateLimitEntry(socketId: string): void {
  lastLocationTime.delete(socketId);
}

// --- Session validation (once on connect, cached on socket.data) ---
interface SocketIdentity {
  userId: string;
  role: "customer" | "worker" | "admin";
  workerId?: string;
  jobId?: string;
}

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const entry = cookieHeader.split(";").find((part) => {
    const separator = part.indexOf("=");
    return separator >= 0 && part.slice(0, separator).trim() === name;
  });
  if (!entry) return null;
  const value = entry.slice(entry.indexOf("=") + 1).trim();
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

async function authenticateSocket(socket: Socket): Promise<SocketIdentity | null> {
  const token =
    typeof socket.handshake.auth?.token === "string"
      ? socket.handshake.auth.token
      : readCookie(socket.handshake.headers.cookie, SESSION_COOKIE_NAME);
  if (!isSessionTokenValid(token)) return null;

  await connectDB();
  const session = await Session.findOne({ token })
    .select("user_id role expires_at")
    .lean();
  if (!session || isSessionExpired(session.expires_at)) return null;

  const user = await User.findById(session.user_id).select("role").lean();
  if (!user) return null;

  const identity: SocketIdentity = {
    userId: String(session.user_id),
    role: user.role,
  };
  if (identity.role === "worker") {
    const worker = await Worker.findOne({ user_id: session.user_id })
      .select("_id")
      .lean();
    if (!worker) return null;
    identity.workerId = String(worker._id);
  }
  return identity;
}

function isRoutePoint(value: unknown): value is RoutePoint {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1])
  );
}

function toRoutePayload(
  jobId: string,
  route: unknown,
): RouteComputedPayload | null {
  if (!route || typeof route !== "object") return null;
  const storedRoute = route as {
    polyline?: unknown;
    distance_meters?: unknown;
    duration_seconds?: unknown;
  };
  const polyline = Array.isArray(storedRoute.polyline)
    ? storedRoute.polyline.filter(isRoutePoint)
    : [];
  if (polyline.length < 2) return null;

  return {
    jobId,
    polyline,
    distanceMeters:
      typeof storedRoute.distance_meters === "number" &&
      Number.isFinite(storedRoute.distance_meters)
        ? storedRoute.distance_meters
        : null,
    durationSeconds:
      typeof storedRoute.duration_seconds === "number" &&
      Number.isFinite(storedRoute.duration_seconds)
        ? storedRoute.duration_seconds
        : null,
  };
}

function isJobParticipant(job: any, identity: SocketIdentity): boolean {
  if (identity.role === "customer") {
    return String(job.customer_id) === identity.userId;
  }
  if (identity.role !== "worker" || !identity.workerId) return false;
  return String(job.matching?.selected_worker_id ?? "") === identity.workerId;
}

function emitTrackingUpdate(
  io: Server,
  socket: Socket,
  jobId: string,
  workerId: string,
  workerLocation: { lat: number; lng: number },
  job: any,
): void {
  const target = getTrackingTarget(job);
  if (!target) return;
  const [targetLng, targetLat] = target;
  const distanceKm = haversineDistanceKm(
    workerLocation.lat,
    workerLocation.lng,
    targetLat,
    targetLng,
  );

  // Prefer route duration when available (more accurate than straight-line estimate)
  let etaMinutes: number;
  const routeDuration = job.route?.duration_seconds;
  if (
    typeof routeDuration === "number" &&
    Number.isFinite(routeDuration) &&
    routeDuration > 0
  ) {
    // Scale route duration by how much of the route remains
    // (rough heuristic: distance-based fraction of total route)
    const totalRouteDistance = job.route?.distance_meters
      ? job.route.distance_meters / 1000
      : null;
    if (totalRouteDistance && totalRouteDistance > 0) {
      const fractionRemaining = Math.min(1, distanceKm / totalRouteDistance);
      etaMinutes = Math.max(1, Math.round((routeDuration / 60) * fractionRemaining));
    } else {
      etaMinutes = Math.max(1, Math.round(routeDuration / 60));
    }
  } else {
    etaMinutes = estimateETAMinutes(distanceKm);
  }

  // Emit to everyone in the room EXCEPT the sender
  socket.to(`job:${jobId}`).emit("location-update", {
    jobId,
    workerId,
    lat: workerLocation.lat,
    lng: workerLocation.lng,
    targetLat,
    targetLng,
    distanceKm: Math.round(distanceKm * 100) / 100,
    distanceMeters: Math.round(distanceKm * 1000),
    etaMinutes,
    timestamp: new Date().toISOString(),
  });
}

function emitSocketError(socket: Socket, message: string): void {
  socket.emit("tracking-error", { message });
}

function trackSocketForJob(socketId: string, jobId: string): void {
  socketJobMap.set(socketId, jobId);
  let sockets = jobSocketsMap.get(jobId);
  if (!sockets) {
    sockets = new Set();
    jobSocketsMap.set(jobId, sockets);
  }
  sockets.add(socketId);
}

function untrackSocket(socketId: string): void {
  const jobId = socketJobMap.get(socketId);
  if (jobId) {
    socketJobMap.delete(socketId);
    const sockets = jobSocketsMap.get(jobId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        jobSocketsMap.delete(jobId);
        // No more sockets for this job — flush any pending location writes immediately
        void flushLocationCache();
        cleanStaleLocations();
      }
    }
  }
}

export function registerSocketHandlers(io: Server): void {
  io.use((socket, next) => {
    void authenticateSocket(socket)
      .then((identity) => {
        if (!identity) {
          next(new Error("Unauthorized"));
          return;
        }
        socket.data.identity = identity;
        next();
      })
      .catch(() => next(new Error("Unauthorized")));
  });

  io.on("connection", (socket) => {
    const identity = socket.data.identity as SocketIdentity;
    console.log(`[socket] connected: ${socket.id}`);

    socket.on(
      "join-job",
      async (
        data: { jobId?: unknown; role?: unknown },
        acknowledge?: (result: { ok: boolean; message?: string }) => void,
      ) => {
        const respond = (ok: boolean, message?: string) =>
          acknowledge?.({ ok, ...(message ? { message } : {}) });
        const jobId = typeof data?.jobId === "string" ? data.jobId.trim() : "";
        if (!jobId || data.role !== identity.role) {
          respond(false, "Invalid tracking room");
          emitSocketError(socket, "Invalid tracking room");
          return;
        }

        try {
          const job = await Job.findById(jobId).lean();
          if (!job || !isJobParticipant(job, identity)) {
            respond(false, "You do not have access to this tracking room");
            emitSocketError(socket, "You do not have access to this tracking room");
            return;
          }
          if (identity.role !== "customer" && !TRACKING_STATUSES.has(job.status)) {
            respond(false, "Tracking is not active for this job");
            emitSocketError(socket, "Tracking is not active for this job");
            return;
          }

          // Leave previous room if any
          if (identity.jobId) {
            socket.leave(`job:${identity.jobId}`);
            untrackSocket(socket.id);
          }

          socket.join(`job:${jobId}`);
          identity.jobId = jobId;
          socket.data.identity = identity;
          trackSocketForJob(socket.id, jobId);

          const route = toRoutePayload(jobId, job.route);
          if (route) socket.emit("route-computed", route);

          // Send current customer location to the worker on join
          // Try cache first, fall back to DB
          const cached = customerLocationCache.get(jobId);
          if (identity.role === "worker" && cached) {
            socket.emit("customer-location-update", {
              jobId,
              lat: cached.lat,
              lng: cached.lng,
            });
          } else {
            const customerCoords = job.tracking?.customer_location?.coordinates;
            if (
              identity.role === "worker" &&
              Array.isArray(customerCoords) &&
              customerCoords.length === 2
            ) {
              socket.emit("customer-location-update", {
                jobId,
                lat: customerCoords[1],
                lng: customerCoords[0],
              });
            }
          }

          // Send cached worker location to customer on join
          if (identity.role === "customer") {
            const wCached = workerLocationCache.get(jobId);
            if (wCached) {
              const target = getTrackingTarget(job);
              const [tLng, tLat] = target ?? [0, 0];
              const distanceKm = haversineDistanceKm(
                wCached.lat,
                wCached.lng,
                tLat,
                tLng,
              );
              socket.emit("location-update", {
                jobId,
                workerId: wCached.workerId,
                lat: wCached.lat,
                lng: wCached.lng,
                targetLat: tLat,
                targetLng: tLng,
                distanceKm: Math.round(distanceKm * 100) / 100,
                distanceMeters: Math.round(distanceKm * 1000),
                etaMinutes: estimateETAMinutes(distanceKm),
                timestamp: new Date().toISOString(),
              });
            }
          }

          respond(true);
        } catch (error) {
          console.error("[socket] join-job error:", error);
          respond(false, "Unable to join tracking");
          emitSocketError(socket, "Unable to join tracking");
        }
      },
    );

    socket.on("leave-job", (data: { jobId?: unknown }) => {
      if (typeof data?.jobId !== "string" || data.jobId !== identity.jobId) return;
      socket.leave(`job:${data.jobId}`);
      untrackSocket(socket.id);
      identity.jobId = undefined;
      socket.data.identity = identity;
    });

    socket.on(
      "worker-location",
      async (data: { jobId?: unknown; lat?: unknown; lng?: unknown }) => {
        const jobId = typeof data?.jobId === "string" ? data.jobId.trim() : "";
        const location = parseLocationPayload(data);
        if (
          identity.role !== "worker" ||
          !identity.workerId ||
          identity.jobId !== jobId ||
          !location
        ) {
          emitSocketError(socket, "Invalid worker location update");
          return;
        }

        if (isLocationRateLimited(socket.id)) return;

        try {
          // Cache location in memory (no DB write here)
          cacheWorkerLocation(jobId, identity.workerId, identity.userId, location.lat, location.lng);

          // Fetch job for target calculation and geofence check
          const job = await Job.findById(jobId).lean();
          if (!job || !isJobParticipant(job, identity) || !TRACKING_STATUSES.has(job.status)) {
            emitSocketError(socket, "Worker is not assigned to this job");
            return;
          }

          // Broadcast to room (excluding sender)
          emitTrackingUpdate(io, socket, jobId, identity.workerId, location, job);

          // Resolve target once for deviation check and geofence detection
          const target = getTrackingTarget(job);

          // Route deviation check: recompute route if worker strays from precomputed path
          if (job.status === "EN_ROUTE" || job.status === "ACCEPTED") {
            const existingRoute = job.route?.polyline;
            if (Array.isArray(existingRoute) && existingRoute.length >= 2 && target) {
              // Find closest point on precomputed route
              let minDeviation = Infinity;
              for (const pt of existingRoute) {
                if (!Array.isArray(pt) || pt.length !== 2) continue;
                const ptLat = pt[0] as number;
                const ptLng = pt[1] as number;
                if (!Number.isFinite(ptLat) || !Number.isFinite(ptLng)) continue;
                const devKm = haversineDistanceKm(location.lat, location.lng, ptLat, ptLng);
                if (devKm < minDeviation) minDeviation = devKm;
              }
              // If deviated beyond threshold, re-route from current position
              if (minDeviation > ROUTE_DEVIATION_THRESHOLD_KM) {
                const [destLng, destLat] = target;
                computeAndStoreRoute(jobId, location.lat, location.lng, destLat, destLng)
                  .then((route) => {
                    if (!route) return;
                    io.to(`job:${jobId}`).emit("route-computed", {
                      jobId,
                      ...route,
                    });
                  })
                  .catch(() => {}); // fire-and-forget
              }
            }
          }

          // Geofence arrival detection
          if (
            target &&
            job.status === "EN_ROUTE" &&
            haversineDistanceKm(location.lat, location.lng, target[1], target[0]) <=
              ARRIVAL_THRESHOLD_KM
          ) {
            const arrived = await Job.findOneAndUpdate(
              {
                _id: jobId,
                status: "EN_ROUTE",
                "matching.selected_worker_id": identity.workerId,
              },
              { $set: { status: "ARRIVED" } },
              { new: true },
            );
            if (!arrived) return;

            // Flush location to DB immediately on status change
            await flushLocationCache();

            const distanceMeters = Math.round(
              haversineDistanceKm(location.lat, location.lng, target[1], target[0]) *
                1000,
            );
            await JobEvent.create({
              job_id: jobId,
              from_state: "EN_ROUTE",
              to_state: "ARRIVED",
              actor_id: identity.workerId,
              actor_type: "system",
              metadata: { reason: "geofence-arrival", distance_meters: distanceMeters },
            });
            await Message.create({
              job_id: jobId,
              sender_id: SYSTEM_SENDER_ID,
              sender_type: "system",
              content: "Worker has arrived at the location",
            });
            io.to(`job:${jobId}`).emit("job-status-update", {
              jobId,
              fromStatus: "EN_ROUTE",
              status: "ARRIVED",
              actorType: "system",
              timestamp: new Date().toISOString(),
            });
            io.to(`job:${jobId}`).emit("worker-arrived", {
              jobId,
              distanceMeters,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("[socket] worker-location error:", error);
          emitSocketError(socket, "Unable to publish worker location");
        }
      },
    );

    socket.on(
      "customer-location",
      async (data: { jobId?: unknown; lat?: unknown; lng?: unknown }) => {
        const jobId = typeof data?.jobId === "string" ? data.jobId.trim() : "";
        const location = parseLocationPayload(data);
        if (
          identity.role !== "customer" ||
          identity.jobId !== jobId ||
          !location
        ) {
          emitSocketError(socket, "Invalid customer location update");
          return;
        }

        if (isLocationRateLimited(socket.id)) return;

        try {
          // Cache location in memory (no DB write here)
          cacheCustomerLocation(jobId, identity.userId, location.lat, location.lng);

          // Broadcast to room EXCLUDING the sender
          socket.to(`job:${jobId}`).emit("customer-location-update", {
            jobId,
            lat: location.lat,
            lng: location.lng,
            timestamp: new Date().toISOString(),
          });

          // Re-emit worker location to customer with fresh distance/ETA
          // Use cache first, fall back to DB
          const wCached = workerLocationCache.get(jobId);
          if (wCached) {
            const job = await Job.findById(jobId).lean();
            if (job) {
              emitTrackingUpdate(io, socket, jobId, wCached.workerId, wCached, job);
            }
          } else {
            const job = await Job.findById(jobId).lean();
            if (!job || !TRACKING_STATUSES.has(job.status)) {
              emitSocketError(socket, "Customer tracking is not active for this job");
              return;
            }
            const workerId = job.matching?.selected_worker_id;
            if (workerId) {
              const worker = await Worker.findById(workerId).select("location").lean();
              const coordinates = worker?.location?.coordinates;
              if (coordinates?.length === 2) {
                emitTrackingUpdate(
                  io,
                  socket,
                  jobId,
                  String(workerId),
                  { lat: coordinates[1], lng: coordinates[0] },
                  job,
                );
              }
            }
          }
        } catch (error) {
          console.error("[socket] customer-location error:", error);
          emitSocketError(socket, "Unable to publish customer location");
        }
      },
    );

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      cleanupRateLimitEntry(socket.id);
      untrackSocket(socket.id);
    });
  });
}
