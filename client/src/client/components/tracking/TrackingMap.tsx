"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type L from "leaflet";
import { haversineDistanceKm } from "@/client/lib/geo";
import { getCachedRoute, setCachedRoute } from "@/client/lib/route-cache";

export interface TrackingMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color: string;
}

interface TrackingMapProps {
  workerLocation: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number; label?: string } | null;
  distanceKm?: number;
  showArrivalZone?: boolean;
  className?: string;
  perspective?: "customer" | "worker";
  precomputedRoute?: [number, number][] | null;
}

const ARRIVAL_ZONE_RADIUS = 100; // meters
const DEVIATION_THRESHOLD_METERS = 30;
const MAX_REFRESH_INTERVAL_MS = 15_000;
const MIN_REFRESH_INTERVAL_MS = 5_000;

function hasValidCoordinate(
  point: { lat: number; lng: number } | null,
): point is { lat: number; lng: number } {
  return Boolean(
    point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180,
  );
}

function isRouteCoordinate(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1])
  );
}

/** Perpendicular distance from a point to a line segment (in meters). */
function perpendicularDistanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineDistanceKm(px, py, ax, ay) * 1000;
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return haversineDistanceKm(px, py, projX, projY) * 1000;
}

/** Minimum distance from a point to a polyline (in meters). */
function distanceFromPolyline(
  px: number,
  py: number,
  polyline: [number, number][],
): number {
  if (polyline.length < 2) return Infinity;
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const [ax, ay] = polyline[i];
    const [bx, by] = polyline[i + 1];
    const d = perpendicularDistanceToSegment(px, py, ax, ay, bx, by);
    if (d < min) min = d;
  }
  return min;
}

export default function TrackingMap({
  workerLocation,
  userLocation = null,
  destination,
  distanceKm,
  showArrivalZone = true,
  className = "",
  perspective = "worker",
  precomputedRoute = null,
}: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const workerMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const arrivalCircleRef = useRef<L.Circle | null>(null);
  const roadPolylineRef = useRef<L.Polyline | null>(null);
  const routeRequestIdRef = useRef(0);
  const lastRouteOriginRef = useRef<[number, number] | null>(null);
  const lastRouteDestinationRef = useRef<[number, number] | null>(null);
  const lastRefreshTimeRef = useRef(0);
  const currentRouteRef = useRef<[number, number][] | null>(null);
  const lastPrecomputedRouteRef = useRef<[number, number][] | null>(null);
  const workerAnimationFrameRef = useRef<number | null>(null);
  const [leaflet, setLeaflet] = useState<typeof L | null>(null);
  /** True once the map has been given its initial fit-bounds view. */
  const hasCenteredMapRef = useRef(false);
  /** Worker location at the time of the last map pan-to-follow. */
  const lastFollowedLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Load Leaflet dynamically (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    async function loadLeaflet() {
      const L = await import("leaflet");

      // Fix default marker icons (webpack/next.js issue)
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      setLeaflet(L);
    }

    void loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leaflet || !mapRef.current || mapInstanceRef.current) return;

    const map = leaflet.map(mapRef.current, {
      center: [31.5204, 74.3587], // default: Lahore
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    leaflet
      .tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
          minZoom: 2,
          subdomains: "abcd",
        },
      )
      .addTo(map);

    leaflet.control.zoom({ position: "bottomright" }).addTo(map);

    // Invalidate size after a delay to ensure container is fully rendered
    setTimeout(() => map.invalidateSize(), 300);
    setTimeout(() => map.invalidateSize(), 1000);

    mapInstanceRef.current = map;

    return () => {
      if (workerAnimationFrameRef.current !== null) {
        cancelAnimationFrame(workerAnimationFrameRef.current);
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leaflet]);

  // Create custom icons
  const getWorkerIcon = useCallback(
    (L: typeof import("leaflet")) => {
      const isCustomerPerspective = perspective === "customer";
      return L.divIcon({
        html: `
          <div style="
            width: 32px; height: 32px;
            display: flex; align-items: center; justify-content: center;
             background: #C97A3D;
             border: 3px solid #F5EDE0;
             border-radius: 50%;
             box-shadow: 0 0 0 3px rgba(201,122,61,0.25), 0 2px 8px rgba(0,0,0,0.3);
            animation: moving-worker-pulse 1.8s infinite;
          ">
             <span aria-hidden="true" style="font-size: 18px; line-height: 1;">🧑‍🔧</span>
          </div>
          <style>
            @keyframes moving-worker-pulse {
               0%, 100% { box-shadow: 0 0 0 3px rgba(201,122,61,0.25), 0 2px 8px rgba(0,0,0,0.3); }
               50% { box-shadow: 0 0 0 9px rgba(201,122,61,0.12), 0 2px 8px rgba(0,0,0,0.3); }
            }
          </style>
        `,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
    },
    [perspective],
  );

  const getDestIcon = useCallback(
    (L: typeof import("leaflet")) => {
      if (perspective === "customer") {
        return L.divIcon({
          html: `
            <div style="
              width: 24px; height: 24px;
               background: #E8A93C;
               border: 4px solid #F5EDE0;
               border-radius: 50%;
               box-shadow: 0 0 0 3px rgba(232,169,60,0.3), 0 2px 8px rgba(0,0,0,0.3);
            "></div>
          `,
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
      }

      // Worker perspective: black flag destination
      return L.divIcon({
        html: `
          <div style="
            width: 32px; height: 40px;
            position: relative;
          ">
            <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#1a1a1a"/>
              <circle cx="12" cy="12" r="5" fill="#F5EDE0"/>
            </svg>
          </div>
        `,
        className: "",
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });
    },
    [perspective],
  );

  const getCustomerIcon = useCallback((L: typeof import("leaflet")) => {
    return L.divIcon({
      html: `
        <div style="
          width: 28px; height: 34px; position: relative;
          filter: drop-shadow(0 3px 5px rgba(0,0,0,0.28));
        ">
          <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#2F6B5F"/>
            <circle cx="12" cy="12" r="5" fill="#F5EDE0"/>
          </svg>
        </div>
      `,
      className: "",
      iconSize: [28, 34],
      iconAnchor: [14, 34],
    });
  }, []);

  // Update markers
  useEffect(() => {
    if (!leaflet || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const hasUser = hasValidCoordinate(userLocation);
    const hasDest = hasValidCoordinate(destination);
    const hasWorker = hasValidCoordinate(workerLocation);

    if (!hasDest && !hasUser) {
      roadPolylineRef.current?.remove();
      roadPolylineRef.current = null;
      lastRouteOriginRef.current = null;
      lastRouteDestinationRef.current = null;
      currentRouteRef.current = null;
      lastPrecomputedRouteRef.current = null;
    }

    // ── Destination marker — always show at the job destination ──
    if (hasDest) {
      const targetIcon = getDestIcon(leaflet);
      const safeLabel = destination?.label
        ? destination.label.replace(/[<>&"']/g, (ch) =>
            ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch,
          )
        : null;
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([destination!.lat, destination!.lng]);
        destMarkerRef.current.setIcon(targetIcon);
        if (safeLabel) destMarkerRef.current.setTooltipContent(safeLabel);
      } else {
        destMarkerRef.current = leaflet
          .marker([destination!.lat, destination!.lng], { icon: targetIcon })
          .addTo(map);
        if (safeLabel) {
          destMarkerRef.current.bindTooltip(safeLabel, {
            permanent: true,
            direction: "top",
            offset: [0, -30],
            className: "dest-tooltip",
          });
        }
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    // ── Customer location marker — green pin ──
    if (hasUser) {
      console.log("[TrackingMap] rendering customer pin at:", userLocation!.lat, userLocation!.lng);
      const customerIcon = getCustomerIcon(leaflet);
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setLatLng([userLocation!.lat, userLocation!.lng]);
        customerMarkerRef.current.setIcon(customerIcon);
      } else {
        customerMarkerRef.current = leaflet
          .marker([userLocation!.lat, userLocation!.lng], { icon: customerIcon })
          .addTo(map)
          .bindTooltip("Customer", {
            permanent: true,
            direction: "top",
            offset: [0, -30],
            className: "dest-tooltip",
          });
      }
    } else if (customerMarkerRef.current) {
      customerMarkerRef.current.remove();
      customerMarkerRef.current = null;
    }

    // ── Arrival zone circle — at destination ──
    if (showArrivalZone && hasDest) {
      if (arrivalCircleRef.current) {
        arrivalCircleRef.current.setLatLng([destination!.lat, destination!.lng]);
      } else {
        arrivalCircleRef.current = leaflet
          .circle([destination!.lat, destination!.lng], {
            radius: ARRIVAL_ZONE_RADIUS,
            color: "#C97A3D",
            fillColor: "#C97A3D",
            fillOpacity: 0.08,
            weight: 2,
            dashArray: "6 4",
          })
          .addTo(map);
      }
    } else if (arrivalCircleRef.current) {
      arrivalCircleRef.current.remove();
      arrivalCircleRef.current = null;
    }

    // ── Worker marker — orange emoji at worker position ──
    if (hasWorker) {
      const latlng: [number, number] = [workerLocation.lat, workerLocation.lng];

      if (workerMarkerRef.current) {
        workerMarkerRef.current.setIcon(getWorkerIcon(leaflet));
        const marker = workerMarkerRef.current;
        const current = marker.getLatLng();
        if (current.lat === latlng[0] && current.lng === latlng[1]) {
          marker.setLatLng(latlng);
        } else {
          if (workerAnimationFrameRef.current !== null) {
            cancelAnimationFrame(workerAnimationFrameRef.current);
          }
          const startedAt = performance.now();
          const startLat = current.lat;
          const startLng = current.lng;
          const duration = 900;
          const animate = (now: number) => {
            const progress = Math.min((now - startedAt) / duration, 1);
            const eased = 1 - (1 - progress) ** 3;
            marker.setLatLng([
              startLat + (latlng[0] - startLat) * eased,
              startLng + (latlng[1] - startLng) * eased,
            ]);
            if (progress < 1) {
              workerAnimationFrameRef.current = requestAnimationFrame(animate);
            } else {
              workerAnimationFrameRef.current = null;
            }
          };
          workerAnimationFrameRef.current = requestAnimationFrame(animate);
        }
      } else {
        workerMarkerRef.current = leaflet
          .marker(latlng, { icon: getWorkerIcon(leaflet) })
          .addTo(map);
      }

      // ── Map centering / follow logic ──
      if (!hasCenteredMapRef.current) {
        const bounds = leaflet.latLngBounds([latlng]);
        if (hasDest) bounds.extend([destination!.lat, destination!.lng]);
        if (hasUser) bounds.extend([userLocation!.lat, userLocation!.lng]);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        hasCenteredMapRef.current = true;
        lastFollowedLocationRef.current = workerLocation;
      } else {
        const workerLatLng = leaflet.latLng(latlng);
        if (!map.getBounds().contains(workerLatLng)) {
          map.panTo(workerLatLng, { animate: true, duration: 0.6 });
          lastFollowedLocationRef.current = workerLocation;
        }
      }
    } else if (!hasCenteredMapRef.current) {
      // No worker location yet — center on destination or user
      const centerTarget = hasDest ? destination : hasUser ? userLocation : null;
      if (centerTarget) {
        map.setView([centerTarget.lat, centerTarget.lng], 15);
        hasCenteredMapRef.current = true;
      }
    }

    return () => {
      if (workerAnimationFrameRef.current !== null) {
        cancelAnimationFrame(workerAnimationFrameRef.current);
        workerAnimationFrameRef.current = null;
      }
    };
  }, [
    leaflet,
    workerLocation,
    userLocation,
    destination,
    getWorkerIcon,
    getDestIcon,
    getCustomerIcon,
    showArrivalZone,
    perspective,
  ]);

  // Render a road-following route. Uses precomputed route from DB first,
  // then client-side cache, then live OSRM fetch with adaptive refresh.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const leafletModule = leaflet;
    if (!leafletModule || !map) return;
    const routingLeaflet = leafletModule;
    const routingMap = map;

    const targetLocation = hasValidCoordinate(destination) ? destination : null;
    const hasDest = hasValidCoordinate(targetLocation);
    const hasWorker = hasValidCoordinate(workerLocation);
    if (!hasDest || !hasWorker) return;

    const origin: [number, number] = [workerLocation.lat, workerLocation.lng];
    const target: [number, number] = [targetLocation.lat, targetLocation.lng];

    // Helper: render a solid road polyline
    function renderRoadRoute(points: [number, number][]) {
      roadPolylineRef.current?.remove();
      roadPolylineRef.current = routingLeaflet
        .polyline(points, {
          color: "#C97A3D",
          weight: 5,
          opacity: 0.9,
          dashArray: "",
        })
        .addTo(routingMap)
        .bringToFront();
      currentRouteRef.current = points;
    }

    const hasPrecomputedRoute =
      precomputedRoute && precomputedRoute.length >= 2
        ? precomputedRoute
        : null;

    // --- Layer 1: Pre-computed route from DB (instant) ---
    if (hasPrecomputedRoute) {
      const isNewPrecomputedRoute =
        lastPrecomputedRouteRef.current !== hasPrecomputedRoute;
      if (isNewPrecomputedRoute || !roadPolylineRef.current) {
        renderRoadRoute(hasPrecomputedRoute);
        lastPrecomputedRouteRef.current = hasPrecomputedRoute;
        lastRouteOriginRef.current = origin;
        lastRouteDestinationRef.current = target;
        lastRefreshTimeRef.current = Date.now();
        return;
      }
    } else {
      lastPrecomputedRouteRef.current = null;
    }

    // --- Layer 2: Client-side SessionStorage cache ---
    const cached = hasPrecomputedRoute
      ? null
      : getCachedRoute(origin[0], origin[1], target[0], target[1]);
    if (cached && cached.coordinates.length >= 2) {
      renderRoadRoute(cached.coordinates);
      lastRouteOriginRef.current = origin;
      lastRouteDestinationRef.current = target;
      lastRefreshTimeRef.current = Date.now();
      // Still check for refresh below if needed
    }

    // --- Adaptive refresh: check if we need to re-fetch ---
    const previousTarget = lastRouteDestinationRef.current;
    const now = Date.now();

    const destinationChanged =
      !previousTarget ||
      previousTarget[0] !== target[0] ||
      previousTarget[1] !== target[1];

    const routeOrigin = lastRouteOriginRef.current;
    const workerMovedEnough =
      !routeOrigin ||
      haversineDistanceKm(
        origin[0],
        origin[1],
        routeOrigin[0],
        routeOrigin[1],
      ) *
        1000 >
        35;

    // Deviation: worker is off the current route polyline
    const isOffRoute =
      currentRouteRef.current &&
      distanceFromPolyline(origin[0], origin[1], currentRouteRef.current) >
        DEVIATION_THRESHOLD_METERS;

    // Time-based: enough time has passed since last refresh
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    const refreshIntervalExceeded =
      timeSinceLastRefresh >= MAX_REFRESH_INTERVAL_MS;

    // Minimum interval guard: don't spam OSRM
    const minIntervalPassed = timeSinceLastRefresh >= MIN_REFRESH_INTERVAL_MS;

    const shouldRefresh =
      !cached &&
      minIntervalPassed &&
      (destinationChanged ||
        workerMovedEnough ||
        isOffRoute ||
        refreshIntervalExceeded);

    if (!shouldRefresh) return;

    lastRouteOriginRef.current = origin;
    lastRouteDestinationRef.current = target;
    lastRefreshTimeRef.current = now;

    const requestId = ++routeRequestIdRef.current;
    const controller = new AbortController();
    const query = new URLSearchParams({
      fromLat: String(origin[0]),
      fromLng: String(origin[1]),
      toLat: String(target[0]),
      toLng: String(target[1]),
    });

    async function loadRoute() {
      try {
        const response = await fetch(`/api/routes?${query.toString()}`, {
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        const coordinates = body?.data?.coordinates;
        if (
          requestId !== routeRequestIdRef.current ||
          !response.ok ||
          !body?.success ||
          !Array.isArray(coordinates)
        ) {
          return;
        }

        const routePoints = coordinates
          .filter((point: unknown): point is [number, number] =>
            isRouteCoordinate(point),
          )
          .map(([lng, lat]) => [lat, lng] as [number, number]);
        if (routePoints.length < 2) return;

        // Render the road route
        renderRoadRoute(routePoints);

        // Store in client-side cache
        setCachedRoute(origin[0], origin[1], target[0], target[1], {
          coordinates: routePoints,
          distance_meters: body?.data?.distance_meters ?? null,
          duration_seconds: body?.data?.duration_seconds ?? null,
        });
      } catch {
        // Keep the current road route; show no line if routing is unavailable.
      }
    }

    void loadRoute();
    return () => controller.abort();
  }, [leaflet, workerLocation, userLocation, destination, precomputedRoute]);

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-divider bg-[rgb(var(--surface))] shadow-[0_18px_50px_rgba(40,31,25,0.08)] ${className}`}
    >
      <div
        ref={mapRef}
        className="h-full w-full"
        style={{ minHeight: "320px" }}
      />

      {distanceKm !== undefined && (
        <div className="absolute left-3 top-3 z-[1000] rounded-xl bg-[rgb(var(--surface))]/95 px-3 py-2 shadow-lg backdrop-blur-sm ring-1 ring-divider">
          <p className="text-xs font-bold text-text">
            {distanceKm < 1
              ? `${Math.round(distanceKm * 1000)} m`
              : `${distanceKm.toFixed(1)} km`}
          </p>
          <p className="text-xs text-muted">away</p>
        </div>
      )}

      <style>{`
        .leaflet-container {
          background: #f5f3ef;
          font: inherit;
          touch-action: pan-y;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 8px 18px rgba(17, 18, 19, 0.12) !important;
          border-radius: 14px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: rgba(255, 255, 255, 0.94) !important;
          color: #26211f !important;
          border-bottom-color: rgba(30, 28, 26, 0.12) !important;
          line-height: 28px !important;
          width: 30px !important;
          height: 30px !important;
          font-weight: 700 !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(255, 255, 255, 1) !important;
        }
        .dest-tooltip {
          background: rgba(36, 28, 21, 0.94) !important;
          border: none !important;
          box-shadow: 0 8px 18px rgba(0,0,0,0.12) !important;
          border-radius: 10px !important;
          padding: 5px 9px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #F5EDE0 !important;
        }
        .dest-tooltip::before {
          border-top-color: rgba(36, 28, 21, 0.94) !important;
        }
      `}</style>
    </div>
  );
}
