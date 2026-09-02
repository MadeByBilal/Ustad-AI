export interface LocationPayload {
    lat: number;
    lng: number;
}
type TrackingLocation = {
    coordinates?: unknown;
} | null;
interface TrackingJobLike {
    location?: TrackingLocation;
    tracking?: {
        customer_location?: TrackingLocation;
    } | null;
}
export declare function parseLocationPayload(value: unknown): LocationPayload | null;
/** Returns GeoJSON coordinates, preferring the customer's live position. */
export declare function getTrackingTarget(job: TrackingJobLike): [number, number] | null;
export {};
//# sourceMappingURL=realtime.d.ts.map