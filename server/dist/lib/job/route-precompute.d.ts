import type { PrecomputedRoute } from "../route-types.js";
/**
 * Fetch an OSRM route, store it on the Job document, and return it so a
 * connected tracking client can receive it without waiting for a poll.
 */
export declare function computeAndStoreRoute(jobId: string, fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<PrecomputedRoute | null>;
//# sourceMappingURL=route-precompute.d.ts.map