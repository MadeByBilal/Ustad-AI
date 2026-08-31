import mongoose from "mongoose";
import type { PrecomputedRoute } from "@/client/lib/route-types";

const ROUTING_HOST = "https://router.project-osrm.org";
const ROUTE_TIMEOUT_MS = 8_000;

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

/**
 * Fetch an OSRM route, store it on the Job document, and return it so a
 * connected tracking client can receive it without waiting for a poll.
 */
export async function computeAndStoreRoute(
  jobId: string,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<PrecomputedRoute | null> {
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
    const body = (await response
      .json()
      .catch(() => null)) as OsrmResponse | null;
    const route = body?.routes?.[0];
    const coords = route?.geometry?.coordinates;

    if (
      !route ||
      !response.ok ||
      body?.code !== "Ok" ||
      !Array.isArray(coords) ||
      coords.length < 2
    ) {
      return null;
    }

    const polyline = coords
      .filter(isCoordinatePair)
      .map(([lng, lat]) => [lat, lng] as [number, number]);

    if (polyline.length < 2) return null;

    const computedRoute: PrecomputedRoute = {
      polyline,
      distanceMeters: Math.round(route.distance ?? 0),
      durationSeconds: Math.round(route.duration ?? 0),
    };

    const Job = mongoose.model("Job");
    await Job.findOneAndUpdate(
      { _id: jobId },
      {
        $set: {
          "route.polyline": computedRoute.polyline,
          "route.distance_meters": computedRoute.distanceMeters,
          "route.duration_seconds": computedRoute.durationSeconds,
          "route.computed_at": new Date(),
        },
      },
    );
    return computedRoute;
  } catch (error) {
    console.warn(
      "[route-precompute] OSRM request failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
