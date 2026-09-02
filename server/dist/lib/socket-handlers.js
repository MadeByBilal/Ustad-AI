import { Job, JobEvent, Message, Session, User, Worker, SYSTEM_SENDER_ID, } from "../models/index.js";
import { connectDB } from "./mongodb.js";
import { isSessionExpired, isSessionTokenValid, SESSION_COOKIE_NAME, } from "./auth/session.js";
import { haversineDistanceKm, estimateETAMinutes } from "./geo.js";
import { getTrackingTarget, parseLocationPayload, } from "./tracking/realtime.js";
const ARRIVAL_THRESHOLD_KM = 0.1;
const LOCATION_RATE_LIMIT_MS = 2000;
const SESSION_REVALIDATE_INTERVAL_MS = 30_000;
const TRACKING_STATUSES = new Set([
    "ACCEPTED",
    "EN_ROUTE",
    "ARRIVED",
    "IN_PROGRESS",
    "AWAITING_CUSTOMER_CONFIRMATION",
]);
const lastLocationTime = new Map();
function isLocationRateLimited(socketId) {
    const now = Date.now();
    const last = lastLocationTime.get(socketId) ?? 0;
    if (now - last < LOCATION_RATE_LIMIT_MS)
        return true;
    lastLocationTime.set(socketId, now);
    return false;
}
function cleanupRateLimitEntry(socketId) {
    lastLocationTime.delete(socketId);
}
async function revalidateSession(userId) {
    try {
        const user = await User.findById(userId).select("role").lean();
        return user ? { valid: true, role: user.role } : { valid: false };
    }
    catch {
        return { valid: false };
    }
}
function readCookie(cookieHeader, name) {
    if (!cookieHeader)
        return null;
    const entry = cookieHeader.split(";").find((part) => {
        const separator = part.indexOf("=");
        return separator >= 0 && part.slice(0, separator).trim() === name;
    });
    if (!entry)
        return null;
    const value = entry.slice(entry.indexOf("=") + 1).trim();
    try {
        return decodeURIComponent(value);
    }
    catch {
        return null;
    }
}
async function authenticateSocket(socket) {
    const token = typeof socket.handshake.auth?.token === "string"
        ? socket.handshake.auth.token
        : readCookie(socket.handshake.headers.cookie, SESSION_COOKIE_NAME);
    if (!isSessionTokenValid(token))
        return null;
    await connectDB();
    const session = await Session.findOne({ token })
        .select("user_id role expires_at")
        .lean();
    if (!session || isSessionExpired(session.expires_at))
        return null;
    const user = await User.findById(session.user_id).select("role").lean();
    if (!user)
        return null;
    const identity = {
        userId: String(session.user_id),
        role: user.role,
    };
    if (identity.role === "worker") {
        const worker = await Worker.findOne({ user_id: session.user_id })
            .select("_id")
            .lean();
        if (!worker)
            return null;
        identity.workerId = String(worker._id);
    }
    return identity;
}
function isRoutePoint(value) {
    return (Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === "number" &&
        Number.isFinite(value[0]) &&
        typeof value[1] === "number" &&
        Number.isFinite(value[1]));
}
function toRoutePayload(jobId, route) {
    if (!route || typeof route !== "object")
        return null;
    const storedRoute = route;
    const polyline = Array.isArray(storedRoute.polyline)
        ? storedRoute.polyline.filter(isRoutePoint)
        : [];
    if (polyline.length < 2)
        return null;
    return {
        jobId,
        polyline,
        distanceMeters: typeof storedRoute.distance_meters === "number" &&
            Number.isFinite(storedRoute.distance_meters)
            ? storedRoute.distance_meters
            : null,
        durationSeconds: typeof storedRoute.duration_seconds === "number" &&
            Number.isFinite(storedRoute.duration_seconds)
            ? storedRoute.duration_seconds
            : null,
    };
}
function isJobParticipant(job, identity) {
    if (identity.role === "customer") {
        return String(job.customer_id) === identity.userId;
    }
    if (identity.role !== "worker" || !identity.workerId)
        return false;
    return String(job.matching?.selected_worker_id ?? "") === identity.workerId;
}
function emitTrackingUpdate(io, jobId, workerId, workerLocation, job) {
    const target = getTrackingTarget(job);
    if (!target)
        return;
    const [targetLng, targetLat] = target;
    const distanceKm = haversineDistanceKm(workerLocation.lat, workerLocation.lng, targetLat, targetLng);
    io.to(`job:${jobId}`).emit("location-update", {
        jobId,
        workerId,
        lat: workerLocation.lat,
        lng: workerLocation.lng,
        targetLat,
        targetLng,
        distanceKm: Math.round(distanceKm * 100) / 100,
        distanceMeters: Math.round(distanceKm * 1000),
        etaMinutes: estimateETAMinutes(distanceKm),
        timestamp: new Date().toISOString(),
    });
}
function emitSocketError(socket, message) {
    socket.emit("tracking-error", { message });
}
export function registerSocketHandlers(io) {
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
        const identity = socket.data.identity;
        console.log(`[socket] connected: ${socket.id}`);
        socket.on("join-job", async (data, acknowledge) => {
            const respond = (ok, message) => acknowledge?.({ ok, ...(message ? { message } : {}) });
            const jobId = typeof data?.jobId === "string" ? data.jobId.trim() : "";
            if (!jobId || data.role !== identity.role) {
                respond(false, "Invalid tracking room");
                emitSocketError(socket, "Invalid tracking room");
                return;
            }
            try {
                const sessionCheck = await revalidateSession(identity.userId);
                if (!sessionCheck.valid) {
                    respond(false, "Session expired");
                    socket.disconnect(true);
                    return;
                }
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
                if (identity.jobId)
                    socket.leave(`job:${identity.jobId}`);
                socket.join(`job:${jobId}`);
                identity.jobId = jobId;
                socket.data.identity = identity;
                const route = toRoutePayload(jobId, job.route);
                if (route)
                    socket.emit("route-computed", route);
                respond(true);
            }
            catch (error) {
                console.error("[socket] join-job error:", error);
                respond(false, "Unable to join tracking");
                emitSocketError(socket, "Unable to join tracking");
            }
        });
        socket.on("leave-job", (data) => {
            if (typeof data?.jobId !== "string" || data.jobId !== identity.jobId)
                return;
            socket.leave(`job:${data.jobId}`);
            identity.jobId = undefined;
            socket.data.identity = identity;
        });
        socket.on("worker-location", async (data) => {
            const jobId = typeof data?.jobId === "string" ? data.jobId.trim() : "";
            const location = parseLocationPayload(data);
            if (identity.role !== "worker" ||
                !identity.workerId ||
                identity.jobId !== jobId ||
                !location) {
                emitSocketError(socket, "Invalid worker location update");
                return;
            }
            if (isLocationRateLimited(socket.id))
                return;
            try {
                const sessionCheck = await revalidateSession(identity.userId);
                if (!sessionCheck.valid) {
                    socket.disconnect(true);
                    return;
                }
                const job = await Job.findById(jobId).lean();
                if (!job || !isJobParticipant(job, identity) || !TRACKING_STATUSES.has(job.status)) {
                    emitSocketError(socket, "Worker is not assigned to this job");
                    return;
                }
                await Worker.updateOne({ _id: identity.workerId, user_id: identity.userId }, {
                    $set: {
                        "location.type": "Point",
                        "location.coordinates": [location.lng, location.lat],
                        location_updated_at: new Date(),
                    },
                });
                emitTrackingUpdate(io, jobId, identity.workerId, location, job);
                const target = getTrackingTarget(job);
                if (target &&
                    job.status === "EN_ROUTE" &&
                    haversineDistanceKm(location.lat, location.lng, target[1], target[0]) <=
                        ARRIVAL_THRESHOLD_KM) {
                    const arrived = await Job.findOneAndUpdate({
                        _id: jobId,
                        status: "EN_ROUTE",
                        "matching.selected_worker_id": identity.workerId,
                    }, { $set: { status: "ARRIVED" } }, { new: true });
                    if (!arrived)
                        return;
                    const distanceMeters = Math.round(haversineDistanceKm(location.lat, location.lng, target[1], target[0]) *
                        1000);
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
            }
            catch (error) {
                console.error("[socket] worker-location error:", error);
                emitSocketError(socket, "Unable to publish worker location");
            }
        });
        socket.on("customer-location", async (data) => {
            const jobId = typeof data?.jobId === "string" ? data.jobId.trim() : "";
            const location = parseLocationPayload(data);
            if (identity.role !== "customer" ||
                identity.jobId !== jobId ||
                !location) {
                emitSocketError(socket, "Invalid customer location update");
                return;
            }
            if (isLocationRateLimited(socket.id))
                return;
            try {
                const sessionCheck = await revalidateSession(identity.userId);
                if (!sessionCheck.valid) {
                    socket.disconnect(true);
                    return;
                }
                const job = await Job.findOneAndUpdate({
                    _id: jobId,
                    customer_id: identity.userId,
                    status: { $in: [...TRACKING_STATUSES] },
                }, {
                    $set: {
                        "tracking.customer_location": {
                            type: "Point",
                            coordinates: [location.lng, location.lat],
                        },
                        "tracking.customer_location_updated_at": new Date(),
                    },
                }, { new: true }).lean();
                if (!job || !TRACKING_STATUSES.has(job.status)) {
                    emitSocketError(socket, "Customer tracking is not active for this job");
                    return;
                }
                io.to(`job:${jobId}`).emit("customer-location-update", {
                    jobId,
                    lat: location.lat,
                    lng: location.lng,
                    timestamp: new Date().toISOString(),
                });
                const workerId = job.matching?.selected_worker_id;
                if (workerId) {
                    const worker = await Worker.findById(workerId).select("location").lean();
                    const coordinates = worker?.location?.coordinates;
                    if (coordinates?.length === 2) {
                        emitTrackingUpdate(io, jobId, String(workerId), { lat: coordinates[1], lng: coordinates[0] }, job);
                    }
                }
            }
            catch (error) {
                console.error("[socket] customer-location error:", error);
                emitSocketError(socket, "Unable to publish customer location");
            }
        });
        socket.on("disconnect", () => {
            console.log(`[socket] disconnected: ${socket.id}`);
            cleanupRateLimitEntry(socket.id);
        });
    });
}
//# sourceMappingURL=socket-handlers.js.map