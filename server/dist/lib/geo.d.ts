export declare const EARTH_RADIUS_KM = 6371.0088;
export declare function kmToDegreesRadius(km: number): number;
export declare function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number;
/**
 * Axis-aligned bounding box around (lng, lat) used for $geoWithin queries.
 * Returns [minLng, minLat, maxLng, maxLat] (GeoJSON box order).
 */
export declare function buildBoundingBox(lng: number, lat: number, radiusKm: number): [number, number, number, number];
/**
 * Returns true if (lat1, lng1) is within `radiusMeters` of (lat2, lng2).
 */
export declare function isWithinRadius(lat1: number, lng1: number, lat2: number, lng2: number, radiusMeters: number): boolean;
/**
 * Estimates travel time in minutes assuming `averageSpeedKmph` (default 30 km/h
 * for urban areas).
 */
export declare function estimateETAMinutes(distanceKm: number, averageSpeedKmph?: number): number;
//# sourceMappingURL=geo.d.ts.map