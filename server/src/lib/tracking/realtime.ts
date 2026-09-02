export interface LocationPayload {
  lat: number;
  lng: number;
}

type TrackingLocation = {
  coordinates?: unknown;
} | null;

interface TrackingJobLike {
  location?: TrackingLocation;
  tracking?: { customer_location?: TrackingLocation } | null;
}

function isCoordinates(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]) &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

export function parseLocationPayload(value: unknown): LocationPayload | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as { lat?: unknown; lng?: unknown };
  if (
    typeof payload.lat !== "number" ||
    !Number.isFinite(payload.lat) ||
    payload.lat < -90 ||
    payload.lat > 90 ||
    typeof payload.lng !== "number" ||
    !Number.isFinite(payload.lng) ||
    payload.lng < -180 ||
    payload.lng > 180
  ) {
    return null;
  }
  return { lat: payload.lat, lng: payload.lng };
}

/** Returns GeoJSON coordinates, preferring the customer's live position. */
export function getTrackingTarget(
  job: TrackingJobLike,
): [number, number] | null {
  const liveCustomerCoordinates = job.tracking?.customer_location?.coordinates;
  if (isCoordinates(liveCustomerCoordinates)) return liveCustomerCoordinates;

  const destinationCoordinates = job.location?.coordinates;
  return isCoordinates(destinationCoordinates) ? destinationCoordinates : null;
}
