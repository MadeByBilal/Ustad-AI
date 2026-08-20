# Real-Time GPS Tracking Integration Plan

## Overview

Add live GPS tracking to Ustad AI so customers can see their worker's location on a map in real-time, view distance remaining, and get auto-arrival notifications when the worker is within 100m.

**Architecture:** Socket.io for real-time location broadcasting + Leaflet/OpenStreetMap for map rendering + existing Haversine distance calculation.

---

## Phase 1: Socket.io Server Setup

### 1.1 Install Dependencies

```bash
npm install socket.io
```

### 1.2 Create Socket.io Server (`src/lib/socket.ts`)

Create a singleton Socket.io server that attaches to the Next.js HTTP server.

```typescript
// src/lib/socket.ts
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

export function getIO(server?: HTTPServer): SocketIOServer {
  if (!io && server) {
    io = new SocketIOServer(server, {
      path: "/api/socketio",
      cors: { origin: process.env.NEXT_PUBLIC_APP_URL || "*" },
    });
  }
  return io!;
}
```

### 1.3 Create Socket.io API Route (`src/app/api/socketio/route.ts`)

Next.js App Router doesn't natively support WebSocket upgrade. Use a custom server approach or the `socket.io` integration pattern for Next.js:

- Create `server.ts` at project root as a custom Node.js server
- Or use the `pages/api` pattern for socket initialization (if mixing with App Router)
- **Recommended:** Custom server file that wraps Next.js and attaches Socket.io

### 1.4 Socket.io Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `join-job` | Client → Server | `{ jobId, role, workerId? }` | Join a job-specific room |
| `worker-location` | Client → Server | `{ jobId, lat, lng }` | Worker sends GPS ping |
| `location-update` | Server → Client | `{ jobId, workerId, lat, lng, timestamp }` | Broadcast to customer |
| `distance-update` | Server → Client | `{ jobId, distanceKm, etaMinutes }` | Computed distance + ETA |
| `worker-arrived` | Server → Client | `{ jobId }` | Proximity trigger notification |
| `leave-job` | Client → Server | `{ jobId }` | Leave room on unmount |

### 1.5 Room Isolation

Each job gets its own Socket.io room: `job:${jobId}`. Only the assigned worker and the job's customer join the room. This prevents cross-job location leaking.

---

## Phase 2: Worker-Side Continuous Tracking

### 2.1 New Component: `src/components/worker/LiveTracker.tsx`

Replace the one-shot `LocationUpdater` with a continuous tracker when job is `EN_ROUTE`:

- Use `navigator.geolocation.watchPosition()` with `{ enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }`
- Throttle pings to every 5 seconds (don't flood Socket.io)
- Emit `worker-location` via Socket.io on each ping
- Stop tracking when status advances to `ARRIVED` or job is cancelled
- Show a "Tracking active" indicator with accuracy info
- Graceful fallback: if geolocation fails, show manual entry option

### 2.2 Integration with `ActiveJobPanel.tsx`

- When worker taps "On the way" (EN_ROUTE), auto-start `LiveTracker`
- When worker taps "Arrived" (ARRIVED), stop `LiveTracker`
- Show current distance to job site in the panel

---

## Phase 3: Map Component (Leaflet + OpenStreetMap)

### 3.1 Install React Leaflet

```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

### 3.2 Create `src/components/tracking/TrackingMap.tsx`

A reusable Leaflet map component:

- Initialize map with OpenStreetMap tiles (free, no API key)
- Show **worker marker** (custom animated marker from realtime-tracker's Lottie approach, or a pulsing dot)
- Show **job site marker** (destination pin)
- Auto-fit bounds to show both markers with padding
- Show a **polyline** between worker and destination (straight line, orOSRM routing if desired later)
- Responsive: fullscreen on mobile, contained on desktop

### 3.3 Custom Markers

- **Worker:** Green pulsing dot (or Lottie animated pin from `public/animation/marker.json`)
- **Destination:** Red pin with house icon
- **Worker arrival zone:** Semi-transparent circle (100m radius) around destination

### 3.4 Map Styles

```css
/* src/app/globals.css additions */
.tracking-map { height: 100%; width: 100%; }
.worker-marker { /* pulsing green dot */ }
.destination-marker { /* red pin */ }
.arrival-zone { /* 100m radius circle */ }
```

---

## Phase 4: Customer Tracking UI

### 4.1 Small Preview Widget: `src/components/tracking/TrackingPreview.tsx`

Embedded in the customer dashboard for active `EN_ROUTE`/`ARRIVED` jobs:

- Compact card (e.g., 300x200px) showing mini map
- Worker dot moving toward destination
- Distance label: "2.3 km away"
- Status: "Worker is on the way" / "Worker has arrived!"
- Click → navigates to full tracking page
- Only visible when a job is in `EN_ROUTE` or `ARRIVED` status

### 4.2 Full Tracking Page: `src/app/dashboard/customer/track/[jobId]/page.tsx`

Full-page tracking view:

- Fullscreen Leaflet map
- Worker marker with real-time position
- Destination marker with 100m arrival zone circle
- Info overlay panel:
  - Worker name + photo
  - Distance remaining (e.g., "1.2 km")
  - ETA estimate (e.g., "~5 min")
  - Status badge ("On the way" / "Arrived!")
  - Chat button (link to existing `WorkerChat`)
- Back button to dashboard
- Auto-redirect to job detail when status changes to `IN_PROGRESS`

### 4.3 Customer Dashboard Integration

Modify `src/app/dashboard/customer/page.tsx`:

- Add `TrackingPreview` component
- Fetch active jobs with `EN_ROUTE`/`ARRIVED` status
- Show preview widget for each active tracking job

---

## Phase 5: Distance & Arrival Detection

### 5.1 Extend `src/lib/geo.ts`

Add helper functions:

```typescript
export function isWithinRadius(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  radiusMeters: number
): boolean {
  return haversineDistanceKm(lat1, lng1, lat2, lng2) * 1000 <= radiusMeters;
}

export function estimateETAMinutes(
  distanceKm: number,
  averageSpeedKmph: number = 30
): number {
  return Math.round((distanceKm / averageSpeedKmph) * 60);
}
```

### 5.2 Server-Side Arrival Detection

In the Socket.io `worker-location` handler:

1. Receive `{ jobId, lat, lng }` from worker
2. Fetch job's `location.coordinates` from MongoDB
3. Calculate distance using Haversine
4. If distance <= 100m AND job status is `EN_ROUTE`:
   - Auto-advance job to `ARRIVED` via `workerUpdateJobStatus()`
   - Emit `worker-arrived` event to the room
   - Record `JobEvent` with `actor_type: "system"`
5. Always emit `distance-update` with computed distance + ETA

### 5.3 State Machine Modification

In `src/lib/job/state-machine.ts`:

- Add `"system"` to `ACTOR_ALLOWANCES["EN_ROUTE"]` to allow geofence-triggered arrival
- The auto-arrival should only trigger once (guard against repeated triggers)

---

## Phase 6: API & Data Changes

### 6.1 New API Endpoint: `src/app/api/jobs/[id]/tracking/route.ts`

`GET /api/jobs/[id]/tracking` — Returns current tracking snapshot:

```json
{
  "worker": { "lat": 33.6, "lng": 73.0, "name": "Ahmed", "updated_at": "..." },
  "destination": { "lat": 33.61, "lng": 73.02, "address_label": "..." },
  "distance_km": 1.2,
  "eta_minutes": 5,
  "status": "EN_ROUTE"
}
```

### 6.2 Optional: Location History Model

Create `src/models/LocationPing.ts` for route history:

```typescript
const LocationPingSchema = new Schema({
  job_id: { type: ObjectId, ref: "Job", required: true, index: true },
  worker_id: { type: ObjectId, ref: "Worker", required: true },
  location: { type: GeoJsonPoint, required: true },
  accuracy: Number,
  speed: Number,
  created_at: { type: Date, default: Date.now, index: true },
});
```

This enables route replay and analytics later.

### 6.3 Modify Existing Files

| File | Change |
|------|--------|
| `src/lib/job/stream.ts` | Add `location_update` SSE event type as fallback for Socket.io |
| `src/lib/useJobStream.ts` | Add `location_update` to event type union |
| `src/components/worker/ActiveJobPanel.tsx` | Integrate `LiveTracker` for EN_ROUTE status |
| `src/app/dashboard/customer/page.tsx` | Add `TrackingPreview` component |
| `src/components/CustomerRequestsPanel.tsx` | Add EN_ROUTE/ARRIVED status labels + track link |
| `src/lib/job/state-machine.ts` | Add `"system"` actor for EN_ROUTE→ARRIVED |
| `src/lib/job/flow.ts` | Support system-triggered arrival in `workerUpdateJobStatus` |

---

## File Structure (New Files)

```
src/
├── app/
│   ├── api/
│   │   ├── socketio/
│   │   │   └── route.ts              # Socket.io initialization endpoint
│   │   └── jobs/[id]/
│   │       └── tracking/
│   │           └── route.ts          # GET tracking snapshot
│   └── dashboard/customer/track/
│       └── [jobId]/
│           └── page.tsx              # Full tracking page
├── components/
│   ├── tracking/
│   │   ├── TrackingMap.tsx           # Leaflet map component
│   │   ├── TrackingPreview.tsx       # Dashboard preview widget
│   │   └── TrackingOverlay.tsx       # Info panel overlay
│   └── worker/
│       └── LiveTracker.tsx           # Continuous GPS tracker
├── lib/
│   ├── socket.ts                     # Socket.io singleton
│   └── socket-client.ts             # Client-side socket helper
├── models/
│   └── LocationPing.ts              # Optional: location history
public/
├── animation/
│   └── marker.json                   # Lottie marker (from realtime-tracker)
└── css/
    └── leaflet.css                   # Leaflet styles (or via npm)
server.ts                             # Custom Next.js server with Socket.io
```

---

## Implementation Order

1. **Socket.io server setup** (server.ts + socket.ts + API route)
2. **Geo utility extensions** (isWithinRadius, estimateETA)
3. **Worker LiveTracker component** (watchPosition + Socket.io emit)
4. **TrackingMap component** (Leaflet + OpenStreetMap)
5. **Customer TrackingPreview** (dashboard widget)
6. **Full tracking page** (/dashboard/customer/track/[jobId])
7. **Server-side arrival detection** (geofence + auto-ARRIVED)
8. **State machine modification** (system actor for EN_ROUTE→ARRIVED)
9. **API endpoint** (GET /api/jobs/[id]/tracking)
10. **Testing** (unit tests for geo, socket events, arrival detection)

---

## Dependencies Summary

| Package | Purpose | Cost |
|---------|---------|------|
| `socket.io` | Real-time WebSocket server + client | Free (MIT) |
| `react-leaflet` | React wrapper for Leaflet | Free (BSD-2) |
| `leaflet` | Map rendering engine | Free (BSD-2) |
| `@types/leaflet` | TypeScript types | Free |

**No paid API keys required.** OpenStreetMap tiles are free.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Socket.io + Next.js App Router complexity | Custom server.ts wrapping Next.js is a proven pattern |
| Battery drain from continuous GPS | Throttle to 5s intervals, stop on ARRIVED, show accuracy toggle |
| Geolocation permission denied | Fallback to manual location entry (existing pattern) |
| Map tiles slow on poor connections | Show last known position with "stale" indicator |
| Socket.io connection drops | Auto-reconnect built-in, plus SSE fallback for status events |
| Multiple workers in same area | Room isolation ensures each customer only sees their worker |

---

## Testing Plan

- **Unit:** `isWithinRadius`, `estimateETAMinutes`, Socket.io event handlers
- **Integration:** Location ping flow (worker → server → customer), arrival detection
- **Component:** TrackingMap renders with mock markers, TrackingPreview shows correct state
- **E2E:** Worker goes EN_ROUTE → location updates stream → customer sees map → distance decreases → auto-arrival triggers
