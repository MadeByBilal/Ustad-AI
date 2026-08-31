export type RoutePoint = [number, number];

export interface PrecomputedRoute {
  polyline: RoutePoint[];
  distanceMeters: number | null;
  durationSeconds: number | null;
}

export interface RouteComputedPayload extends PrecomputedRoute {
  jobId: string;
}
