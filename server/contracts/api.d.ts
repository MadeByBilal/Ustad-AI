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
export declare const EARTH_RADIUS_KM = 6371.0088;
export declare function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number;
export declare function buildBoundingBox(lng: number, lat: number, radiusKm: number): [number, number, number, number];
export declare function estimateETAMinutes(distanceKm: number, averageSpeedKmph?: number): number;
export type RoutePoint = [number, number];
export interface PrecomputedRoute {
    polyline: RoutePoint[];
    distanceMeters: number | null;
    durationSeconds: number | null;
}
export interface RouteComputedPayload extends PrecomputedRoute {
    jobId: string;
}
export declare const OFFER_LOW_FACTOR = 0.5;
export declare const COUNTER_LOW_FACTOR = 0.5;
export declare const COUNTER_HIGH_FACTOR = 2;
export interface OfferValidation {
    valid: boolean;
    reason?: "too_low" | "too_high";
    min_allowed: number;
    max_allowed: number;
}
export declare function validateCustomerOffer(amount: number, estimateMin: number, estimateMax: number): OfferValidation;
export declare function roundTo50(n: number): number;
export declare function midpointOffer(estimateMin: number, estimateMax: number): number;
export declare function validateWorkerCounter(amount: number, customerOffer: number, estimateMax?: number): OfferValidation;
export declare function offerIsExpired(expiresAt: Date | null | undefined, now?: Date): boolean;
//# sourceMappingURL=api.d.ts.map