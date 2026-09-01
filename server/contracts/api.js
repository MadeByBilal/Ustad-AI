// ─── API Response Envelope ───────────────────────────────────────────────────
// ─── Geo Utils ───────────────────────────────────────────────────────────────
export const EARTH_RADIUS_KM = 6371.0088;
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}
export function buildBoundingBox(lng, lat, radiusKm) {
    const KM_PER_DEGREE_LAT = 111.32;
    const degLat = radiusKm / KM_PER_DEGREE_LAT;
    const degLng = radiusKm / (KM_PER_DEGREE_LAT * Math.max(Math.cos((lat * Math.PI) / 180), 0.05));
    return [lng - degLng, lat - degLat, lng + degLng, lat + degLat];
}
export function estimateETAMinutes(distanceKm, averageSpeedKmph = 30) {
    if (distanceKm <= 0)
        return 0;
    return Math.max(1, Math.round((distanceKm / averageSpeedKmph) * 60));
}
// ─── Validation ──────────────────────────────────────────────────────────────
export const OFFER_LOW_FACTOR = 0.5;
export const COUNTER_LOW_FACTOR = 0.5;
export const COUNTER_HIGH_FACTOR = 2.0;
export function validateCustomerOffer(amount, estimateMin, estimateMax) {
    void estimateMax;
    if (!Number.isFinite(amount) || amount <= 0) {
        return { valid: false, reason: "too_low", min_allowed: 1, max_allowed: 0 };
    }
    const max_allowed = 0;
    const min_allowed = estimateMin > 0 ? Math.round(estimateMin * OFFER_LOW_FACTOR) : 0;
    if (min_allowed > 0 && amount < min_allowed) {
        return { valid: false, reason: "too_low", min_allowed, max_allowed };
    }
    return { valid: true, min_allowed, max_allowed };
}
export function roundTo50(n) {
    return Math.round(n / 50) * 50;
}
export function midpointOffer(estimateMin, estimateMax) {
    if (estimateMax <= 0)
        return 0;
    return roundTo50((estimateMin + estimateMax) / 2);
}
export function validateWorkerCounter(amount, customerOffer, estimateMax = 0) {
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
export function offerIsExpired(expiresAt, now = new Date()) {
    return expiresAt != null && now.getTime() > expiresAt.getTime();
}
//# sourceMappingURL=api.js.map