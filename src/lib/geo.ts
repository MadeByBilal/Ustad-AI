export const EARTH_RADIUS_KM = 6371.0088;
const KM_PER_DEGREE_LAT = 111.32;

export function kmToDegreesRadius(km: number): number {
  return km / KM_PER_DEGREE_LAT;
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Axis-aligned bounding box around (lng, lat) used for $geoWithin queries.
 * Returns [minLng, minLat, maxLng, maxLat] (GeoJSON box order).
 */
export function buildBoundingBox(
  lng: number,
  lat: number,
  radiusKm: number
): [number, number, number, number] {
  const degLat = kmToDegreesRadius(radiusKm);
  const degLng = radiusKm / (KM_PER_DEGREE_LAT * Math.max(Math.cos(toRad(lat)), 0.05));
  return [lng - degLng, lat - degLat, lng + degLng, lat + degLat];
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Returns true if (lat1, lng1) is within `radiusMeters` of (lat2, lng2).
 */
export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusMeters: number
): boolean {
  return haversineDistanceKm(lat1, lng1, lat2, lng2) * 1000 <= radiusMeters;
}

/**
 * Estimates travel time in minutes assuming `averageSpeedKmph` (default 30 km/h
 * for urban areas).
 */
export function estimateETAMinutes(
  distanceKm: number,
  averageSpeedKmph: number = 30
): number {
  if (distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / averageSpeedKmph) * 60));
}