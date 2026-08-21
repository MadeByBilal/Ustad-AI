"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type L from "leaflet";
import { haversineDistanceKm } from "@/lib/geo";

export interface TrackingMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color: string;
}

interface TrackingMapProps {
  workerLocation: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number; label?: string } | null;
  distanceKm?: number;
  showArrivalZone?: boolean;
  className?: string;
  perspective?: "customer" | "worker";
}

const ARRIVAL_ZONE_RADIUS = 100; // meters
const ROUTE_REFRESH_DISTANCE_KM = 0.15;

function hasValidCoordinate(
  point: { lat: number; lng: number } | null
): point is { lat: number; lng: number } {
  return Boolean(
    point &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      point.lat >= -90 &&
      point.lat <= 90 &&
      point.lng >= -180 &&
      point.lng <= 180
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

export default function TrackingMap({
  workerLocation,
  destination,
  distanceKm,
  showArrivalZone = true,
  className = "",
  perspective = "worker",
}: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const workerMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const arrivalCircleRef = useRef<L.Circle | null>(null);
  const fallbackPolylineRef = useRef<L.Polyline | null>(null);
  const roadPolylineRef = useRef<L.Polyline | null>(null);
  const routeRequestIdRef = useRef(0);
  const lastRouteOriginRef = useRef<[number, number] | null>(null);
  const lastRouteDestinationRef = useRef<[number, number] | null>(null);
  const workerAnimationFrameRef = useRef<number | null>(null);
  const [leaflet, setLeaflet] = useState<typeof L | null>(null);

  // Load Leaflet dynamically (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    async function loadLeaflet() {
      const L = await import("leaflet");

      // Fix default marker icons (webpack/next.js issue)
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      setLeaflet(L);
    }

    void loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leaflet || !mapRef.current || mapInstanceRef.current) return;

    const map = leaflet.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    leaflet
      .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      })
      .addTo(map);

    leaflet.control.zoom({ position: "bottomright" }).addTo(map);

    // Invalidate size after a short delay to ensure container is fully rendered
    setTimeout(() => map.invalidateSize(), 100);

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
        html: isCustomerPerspective
          ? `
          <div style="
            width: 32px; height: 32px;
            display: flex; align-items: center; justify-content: center;
            background: #2563eb;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 3px rgba(37,99,235,0.25), 0 2px 8px rgba(0,0,0,0.3);
            animation: moving-worker-pulse 1.8s infinite;
          ">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 17h14"/><path d="M6 17l1.2-5h9.6l1.2 5"/><path d="M8 12l1-3h6l1 3"/><circle cx="8" cy="17" r="1.5" fill="white"/><circle cx="16" cy="17" r="1.5" fill="white"/>
            </svg>
          </div>
          <style>
            @keyframes moving-worker-pulse {
              0%, 100% { box-shadow: 0 0 0 3px rgba(37,99,235,0.25), 0 2px 8px rgba(0,0,0,0.3); }
              50% { box-shadow: 0 0 0 9px rgba(37,99,235,0.12), 0 2px 8px rgba(0,0,0,0.3); }
            }
          </style>
        `
          : `
          <div style="
            width: 24px; height: 24px;
            background: #22c55e;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 2px #22c55e, 0 2px 8px rgba(0,0,0,0.3);
            animation: pulse 2s infinite;
          "></div>
          <style>
            @keyframes pulse {
              0%, 100% { box-shadow: 0 0 0 2px #22c55e, 0 2px 8px rgba(0,0,0,0.3); }
              50% { box-shadow: 0 0 0 8px rgba(34,197,94,0.2), 0 2px 8px rgba(0,0,0,0.3); }
            }
          </style>
        `,
        className: "",
        iconSize: isCustomerPerspective ? [32, 32] : [24, 24],
        iconAnchor: isCustomerPerspective ? [16, 16] : [12, 12],
      });
    },
    [perspective]
  );

  const getDestIcon = useCallback(
    (L: typeof import("leaflet")) => {
      if (perspective === "customer") {
        return L.divIcon({
          html: `
            <div style="
              width: 24px; height: 24px;
              background: #22c55e;
              border: 4px solid white;
              border-radius: 50%;
              box-shadow: 0 0 0 3px rgba(34,197,94,0.3), 0 2px 8px rgba(0,0,0,0.3);
            "></div>
          `,
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
      }

      return L.divIcon({
        html: `
          <div style="
            width: 32px; height: 40px;
            position: relative;
          ">
            <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#ef4444"/>
              <circle cx="12" cy="12" r="5" fill="white"/>
            </svg>
          </div>
        `,
        className: "",
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });
    },
    [perspective]
  );

  // Update markers
  useEffect(() => {
    if (!leaflet || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const hasDest = hasValidCoordinate(destination);
    const hasWorker = hasValidCoordinate(workerLocation);

    if (!hasDest || !hasWorker) {
      fallbackPolylineRef.current?.remove();
      fallbackPolylineRef.current = null;
      roadPolylineRef.current?.remove();
      roadPolylineRef.current = null;
      lastRouteOriginRef.current = null;
      lastRouteDestinationRef.current = null;
    }

    // Destination marker — only when valid coordinates exist
    if (hasDest) {
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([destination!.lat, destination!.lng]);
        destMarkerRef.current.setIcon(getDestIcon(leaflet));
      } else {
        destMarkerRef.current = leaflet
          .marker([destination!.lat, destination!.lng], {
            icon: getDestIcon(leaflet),
          })
          .addTo(map);
        if (destination!.label) {
          destMarkerRef.current.bindTooltip(destination!.label, {
            permanent: true,
            direction: "top",
            offset: [0, -40],
            className: "dest-tooltip",
          });
        }
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    // Arrival zone circle
    if (showArrivalZone && hasDest) {
      if (arrivalCircleRef.current) {
        arrivalCircleRef.current.setLatLng([destination!.lat, destination!.lng]);
      } else {
        arrivalCircleRef.current = leaflet
          .circle([destination!.lat, destination!.lng], {
            radius: ARRIVAL_ZONE_RADIUS,
            color: "#22c55e",
            fillColor: "#22c55e",
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

    // Worker marker
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

      // Draw a direct fallback until the road route is available.
      if (hasDest) {
        const points: [number, number][] = [
          latlng,
          [destination!.lat, destination!.lng],
        ];
        if (!roadPolylineRef.current && fallbackPolylineRef.current) {
          fallbackPolylineRef.current.setLatLngs(points);
        } else if (!roadPolylineRef.current) {
          fallbackPolylineRef.current = leaflet
            .polyline(points, {
              color: "#22c55e",
              weight: 3,
              opacity: 0.7,
              dashArray: "8 6",
            })
            .addTo(map);
        }
      }

      // Fit bounds to show both markers
      const bounds = leaflet.latLngBounds([latlng]);
      if (hasDest) {
        bounds.extend([destination!.lat, destination!.lng]);
      }
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else if (hasDest) {
      // No worker location yet — center on destination
        map.setView([destination!.lat, destination!.lng], 15);
    }

    return () => {
      if (workerAnimationFrameRef.current !== null) {
        cancelAnimationFrame(workerAnimationFrameRef.current);
        workerAnimationFrameRef.current = null;
      }
    };
  }, [leaflet, workerLocation, destination, getWorkerIcon, getDestIcon, showArrivalZone]);

  // Fetch a road-following route. The direct line above remains visible while
  // routing loads or if the public routing service is unavailable.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const leafletModule = leaflet;
    if (!leafletModule || !map) return;
    const routingLeaflet = leafletModule;
    const routingMap = map;

    const hasDest = hasValidCoordinate(destination);
    const hasWorker = hasValidCoordinate(workerLocation);
    if (!hasDest || !hasWorker) return;

    const origin: [number, number] = [workerLocation.lat, workerLocation.lng];
    const target: [number, number] = [destination.lat, destination.lng];
    const previousOrigin = lastRouteOriginRef.current;
    const previousTarget = lastRouteDestinationRef.current;
    const movedEnough =
      !previousOrigin ||
      haversineDistanceKm(
        previousOrigin[0],
        previousOrigin[1],
        origin[0],
        origin[1]
      ) >= ROUTE_REFRESH_DISTANCE_KM;
    const destinationChanged =
      !previousTarget ||
      previousTarget[0] !== target[0] ||
      previousTarget[1] !== target[1];

    if (!movedEnough && !destinationChanged) return;

    lastRouteOriginRef.current = origin;
    lastRouteDestinationRef.current = target;
    roadPolylineRef.current?.remove();
    roadPolylineRef.current = null;

    const directPoints: [number, number][] = [origin, target];
    if (fallbackPolylineRef.current) {
      fallbackPolylineRef.current.setLatLngs(directPoints);
      fallbackPolylineRef.current.setStyle({
        color: "#22c55e",
        weight: 3,
        opacity: 0.7,
        dashArray: "8 6",
      });
    } else {
      fallbackPolylineRef.current = routingLeaflet
        .polyline(directPoints, {
          color: "#22c55e",
          weight: 3,
          opacity: 0.7,
          dashArray: "8 6",
        })
        .addTo(map);
    }

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
          .filter((point: unknown): point is [number, number] => isRouteCoordinate(point))
          .map(([lng, lat]) => [lat, lng] as [number, number]);
        if (routePoints.length < 2) return;

        roadPolylineRef.current = routingLeaflet
          .polyline(routePoints, {
          color: "#0e5f44",
          weight: 5,
          opacity: 0.9,
          dashArray: "",
          })
          .addTo(routingMap)
          .bringToFront();
        fallbackPolylineRef.current?.remove();
        fallbackPolylineRef.current = null;
      } catch {
        // Keep the direct fallback line when routing is unavailable.
      }
    }

    void loadRoute();
    return () => controller.abort();
  }, [leaflet, workerLocation, destination]);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div ref={mapRef} className="h-full w-full" style={{ minHeight: "300px" }} />

      {distanceKm !== undefined && (
        <div className="absolute left-3 top-3 z-[1000] rounded-xl bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <p className="text-xs font-bold text-stone-800">
            {distanceKm < 1
              ? `${Math.round(distanceKm * 1000)} m`
              : `${distanceKm.toFixed(1)} km`}
          </p>
          <p className="text-[10px] text-stone-500">away</p>
        </div>
      )}

      <style>{`
        .dest-tooltip {
          background: white !important;
          border: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
          border-radius: 8px !important;
          padding: 4px 8px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #44403c !important;
        }
        .dest-tooltip::before {
          border-top-color: white !important;
        }
      `}</style>
    </div>
  );
}
