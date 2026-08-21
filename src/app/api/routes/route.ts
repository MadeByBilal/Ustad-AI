import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  try {
    await requireRole(["customer", "worker"]);
  } catch (error) {
    return authError(error);
  }

  try {
    const parsed = routeQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    if (!parsed.success) {
      return fail("Valid route coordinates are required", 400);
    }

    const { fromLat, fromLng, toLat, toLng } = parsed.data;
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

      return ok({
        coordinates,
        distance_meters: route.distance ?? null,
        duration_seconds: route.duration ?? null,
      });
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
