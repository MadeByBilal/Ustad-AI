// ─── API Response Envelope ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    message_ur: string;
  };
  details?: unknown;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

// ─── Geo Utils ───────────────────────────────────────────────────────────────

export const EARTH_RADIUS_KM = 6371.0088;

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

export function buildBoundingBox(
  lng: number,
  lat: number,
  radiusKm: number
): [number, number, number, number] {
  const KM_PER_DEGREE_LAT = 111.32;
  const degLat = radiusKm / KM_PER_DEGREE_LAT;
  const degLng =
    radiusKm / (KM_PER_DEGREE_LAT * Math.max(Math.cos((lat * Math.PI) / 180), 0.05));
  return [lng - degLng, lat - degLat, lng + degLng, lat + degLat];
}

export function estimateETAMinutes(
  distanceKm: number,
  averageSpeedKmph: number = 30
): number {
  if (distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / averageSpeedKmph) * 60));
}

// ─── Route Types ─────────────────────────────────────────────────────────────

export type RoutePoint = [number, number];

export interface PrecomputedRoute {
  polyline: RoutePoint[];
  distanceMeters: number | null;
  durationSeconds: number | null;
}

export interface RouteComputedPayload extends PrecomputedRoute {
  jobId: string;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export const OFFER_LOW_FACTOR = 0.5;
export const COUNTER_LOW_FACTOR = 0.5;
export const COUNTER_HIGH_FACTOR = 2.0;

export interface OfferValidation {
  valid: boolean;
  reason?: "too_low" | "too_high";
  min_allowed: number;
  max_allowed: number;
}

export function validateCustomerOffer(
  amount: number,
  estimateMin: number,
  estimateMax: number
): OfferValidation {
  void estimateMax;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, reason: "too_low", min_allowed: 1, max_allowed: 0 };
  }

  const max_allowed = 0;
  const min_allowed =
    estimateMin > 0 ? Math.round(estimateMin * OFFER_LOW_FACTOR) : 0;

  if (min_allowed > 0 && amount < min_allowed) {
    return { valid: false, reason: "too_low", min_allowed, max_allowed };
  }
  return { valid: true, min_allowed, max_allowed };
}

export function roundTo50(n: number): number {
  return Math.round(n / 50) * 50;
}

export function midpointOffer(estimateMin: number, estimateMax: number): number {
  if (estimateMax <= 0) return 0;
  return roundTo50((estimateMin + estimateMax) / 2);
}

export function validateWorkerCounter(
  amount: number,
  customerOffer: number,
  estimateMax = 0
): OfferValidation {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, reason: "too_low", min_allowed: 1, max_allowed: 0 };
  }

  if (customerOffer > 0) {
    const min_allowed = Math.round(customerOffer * COUNTER_LOW_FACTOR);
    const max_allowed = Math.round(customerOffer * COUNTER_HIGH_FACTOR);
    if (amount < min_allowed) {
      return { valid: false, reason: "too_low", min_allowed, max_allowed };
    }
    if (amount > max_allowed) {
      return { valid: false, reason: "too_high", min_allowed, max_allowed };
    }
    return { valid: true, min_allowed, max_allowed };
  }

  if (estimateMax > 0) {
    const max_allowed = Math.round(estimateMax * COUNTER_HIGH_FACTOR);
    if (amount > max_allowed) {
      return { valid: false, reason: "too_high", min_allowed: 1, max_allowed };
    }
    return { valid: true, min_allowed: 1, max_allowed };
  }

  return { valid: true, min_allowed: 1, max_allowed: 0 };
}

export function offerIsExpired(
  expiresAt: Date | null | undefined,
  now: Date = new Date()
): boolean {
  return expiresAt != null && now.getTime() > expiresAt.getTime();
}
