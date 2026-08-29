import mongoose from "mongoose";

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
 * Fetch an OSRM route and store it on the Job document.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function computeAndStoreRoute(
  jobId: string,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<void> {
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
    const coords = route?.geometry?.coordinates;

    if (!route || !response.ok || body?.code !== "Ok" || !Array.isArray(coords) || coords.length < 2) {
      return;
    }

    const polyline = coords
      .filter(isCoordinatePair)
      .map(([lng, lat]) => [lat, lng] as [number, number]);

    if (polyline.length < 2) return;

    const Job = mongoose.model("Job");
    await Job.findOneAndUpdate(
      { _id: jobId },
      {
        $set: {
          "route.polyline": polyline,
          "route.distance_meters": Math.round(route.distance ?? 0),
          "route.duration_seconds": Math.round(route.duration ?? 0),
          "route.computed_at": new Date(),
        },
      }
    );
  } catch {
    // OSRM failed — TrackingMap will fall back to live fetch or dashed line
  } finally {
    clearTimeout(timeout);
  }
}
