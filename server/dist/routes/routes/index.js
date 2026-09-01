import { Router } from "express";
import { z } from "zod";
import { fail, ok } from "../../lib/api.js";
import { requireRole } from "../../lib/auth-middleware.js";
const router = Router();
const routeQuerySchema = z.object({
    fromLat: z.coerce.number().finite().min(-90).max(90),
    fromLng: z.coerce.number().finite().min(-180).max(180),
    toLat: z.coerce.number().finite().min(-90).max(90),
    toLng: z.coerce.number().finite().min(-180).max(180),
});
const ROUTING_HOST = "https://router.project-osrm.org";
const ROUTE_TIMEOUT_MS = 8_000;
// --- Server-side LRU cache ---
const ROUTE_CACHE_MAX = 1_000;
const ROUTE_CACHE_TTL_MS = 60_000;
const ROUTE_CACHE_PRECISION = 100; // meters
const routeCache = new Map();
function cacheKey(fromLat, fromLng, toLat, toLng) {
    const p = ROUTE_CACHE_PRECISION;
    return `${(Math.round(fromLat * p) / p).toFixed(4)},${(Math.round(fromLng * p) / p).toFixed(4)};${(Math.round(toLat * p) / p).toFixed(4)},${(Math.round(toLng * p) / p).toFixed(4)}`;
}
function cacheGet(key) {
    const entry = routeCache.get(key);
    if (!entry)
        return null;
    if (Date.now() - entry.ts > ROUTE_CACHE_TTL_MS) {
        routeCache.delete(key);
        return null;
    }
    return entry;
}
function cacheSet(key, entry) {
    if (routeCache.size >= ROUTE_CACHE_MAX) {
        const oldest = routeCache.keys().next().value;
        if (oldest !== undefined)
            routeCache.delete(oldest);
    }
    routeCache.set(key, entry);
}
function isCoordinatePair(value) {
    return (Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === "number" &&
        Number.isFinite(value[0]) &&
        typeof value[1] === "number" &&
        Number.isFinite(value[1]));
}
/**
 * GET / — OSRM route lookup with server-side LRU cache.
 */
router.get("/", requireRole(["customer", "worker"]), async (req, res) => {
    try {
        const parsed = routeQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return fail(res, "Valid route coordinates are required", 400);
        }
        const { fromLat, fromLng, toLat, toLng } = parsed.data;
        // Check server-side cache first
        const key = cacheKey(fromLat, fromLng, toLat, toLng);
        const cached = cacheGet(key);
        if (cached) {
            return ok({
                coordinates: cached.coordinates,
                distance_meters: cached.distance_meters,
                duration_seconds: cached.duration_seconds,
                cached: true,
            })(res);
        }
        const url = `${ROUTING_HOST}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=false`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ROUTE_TIMEOUT_MS);
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    Accept: "application/json",
                    "User-Agent": "Ustad-AI/1.0",
                },
            });
            const body = (await response.json().catch(() => null));
            const route = body?.routes?.[0];
            const coordinates = Array.isArray(route?.geometry?.coordinates)
                ? route.geometry.coordinates.filter(isCoordinatePair)
                : [];
            if (!route || !response.ok || body?.code !== "Ok" || coordinates.length < 2) {
                return fail(res, "Road route unavailable", 502);
            }
            const result = {
                coordinates,
                distance_meters: route.distance ?? null,
                duration_seconds: route.duration ?? null,
            };
            // Store in server-side cache
            cacheSet(key, { ...result, ts: Date.now() });
            return ok(result)(res);
        }
        catch (error) {
            console.error("[routes] OSRM lookup failed:", error);
            return fail(res, "Road route unavailable", 502);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    catch (error) {
        console.error("[routes] error:", error);
        return fail(res, "Internal error", 500);
    }
});
export { router as routeRoutes };
//# sourceMappingURL=index.js.map