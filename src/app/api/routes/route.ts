import { z } from "zod";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

interface CacheEntry {
  coordinates: [number, number][];
  distance_meters: number | null;
  duration_seconds: number | null;
  ts: number;
}

const routeCache = new Map<string, CacheEntry>();

function cacheKey(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  const p = ROUTE_CACHE_PRECISION;
  return `${(Math.round(fromLat * p) / p).toFixed(4)},${(Math.round(fromLng * p) / p).toFixed(4)};${(Math.round(toLat * p) / p).toFixed(4)},${(Math.round(toLng * p) / p).toFixed(4)}`;
}

function cacheGet(key: string): CacheEntry | null {
  const entry = routeCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ROUTE_CACHE_TTL_MS) {
    routeCache.delete(key);
    return null;
  }
  return entry;
}

function cacheSet(key: string, entry: CacheEntry): void {
  if (routeCache.size >= ROUTE_CACHE_MAX) {
    // evict oldest
    const oldest = routeCache.keys().next().value;
    if (oldest !== undefined) routeCache.delete(oldest);
  }
  routeCache.set(key, entry);
}

interface OsrmResponse {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: unknown };
  }>;
}

function isCoordinatePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1])
  );
}

export async function GET(request: Request) {
  try {
    await requireRole(["customer", "worker"]);
  } catch (error) {
    return authError(error);
  }

  try {
    const parsed = routeQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries())
    );
    if (!parsed.success) {
      return fail("Valid route coordinates are required", 400);
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
      });
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
      const body = (await response.json().catch(() => null)) as OsrmResponse | null;
      const route = body?.routes?.[0];
      const coordinates = Array.isArray(route?.geometry?.coordinates)
        ? route.geometry.coordinates.filter(isCoordinatePair)
        : [];

      if (!route || !response.ok || body?.code !== "Ok" || coordinates.length < 2) {
        return fail("Road route unavailable", 502);
      }

      const result = {
        coordinates,
        distance_meters: route.distance ?? null,
        duration_seconds: route.duration ?? null,
      };

      // Store in server-side cache
      cacheSet(key, { ...result, ts: Date.now() });

      return ok(result);
    } catch (error) {
      console.error("[routes] OSRM lookup failed:", error);
      return fail("Road route unavailable", 502);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[routes] error:", error);
    return fail("Internal error", 500);
  }
}
