"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
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

// All styles below are 100% free — no API key, no registration, no limits.
const MAP_STYLES = {
  positron: {
    name: "Light (Positron)",
    style: "https://tiles.openfreemap.org/styles/positron",
  },
  bright: {
    name: "Bright",
    style: "https://tiles.openfreemap.org/styles/bright",
  },
  liberty: {
    name: "Colorful (Liberty)",
    style: "https://tiles.openfreemap.org/styles/liberty",
  },
  osm: {
    name: "OpenStreetMap",
    style: {
      version: 8 as const,
      sources: {
        osm: {
          type: "raster" as const,
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [
        {
          id: "osm",
          type: "raster" as const,
          source: "osm",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  topo: {
    name: "Topographic",
    style: {
      version: 8 as const,
      sources: {
        topo: {
          type: "raster" as const,
          tiles: [
            "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
            "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
          ],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors, © OpenTopoMap",
        },
      },
      layers: [
        {
          id: "topo",
          type: "raster" as const,
          source: "topo",
          minzoom: 0,
          maxzoom: 17,
        },
      ],
    },
  },
} as const;

type StyleKey = keyof typeof MAP_STYLES;

const PAKISTAN_CENTER: [number, number] = [69.3451, 30.3753]; // roughly center of Pakistan

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const workerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const routeRequestIdRef = useRef(0);
  const lastRouteOriginRef = useRef<[number, number] | null>(null);
  const lastRouteDestinationRef = useRef<[number, number] | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<StyleKey>("osm");
  const [showStylePicker, setShowStylePicker] = useState(false);

  const createWorkerMarkerHtml = useCallback(() => {
    const isCustomerPerspective = perspective === "customer";
    const size = isCustomerPerspective ? 32 : 24;

    return `
      <div style="
        width: ${size}px; height: ${size}px;
        display: flex; align-items: center; justify-content: center;
        background: #C97A3D;
        border: 3px solid #F5EDE0;
        border-radius: 50%;
        box-shadow: 0 0 0 3px rgba(201,122,61,0.25), 0 2px 8px rgba(0,0,0,0.3);
        animation: pulse 1.8s infinite;
      ">
        ${isCustomerPerspective ? `
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#1A1410" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 17h14"/><path d="M6 17l1.2-5h9.6l1.2 5"/><path d="M8 12l1-3h6l1 3"/><circle cx="8" cy="17" r="1.5" fill="#1A1410"/><circle cx="16" cy="17" r="1.5" fill="#1A1410"/>
          </svg>
        ` : ""}
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(201,122,61,0.25), 0 2px 8px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 0 9px rgba(201,122,61,0.12), 0 2px 8px rgba(0,0,0,0.3); }
        }
      </style>
    `;
  }, [perspective]);

  const createDestMarkerHtml = useCallback(() => {
    if (perspective === "customer") {
      return `
        <div style="
          width: 24px; height: 24px;
          background: #E8A93C;
          border: 4px solid #F5EDE0;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(232,169,60,0.3), 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      `;
    }

    return `
      <div style="width: 32px; height: 40px; position: relative;">
        <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#E8A93C"/>
          <circle cx="12" cy="12" r="5" fill="#F5EDE0"/>
        </svg>
      </div>
    `;
  }, [perspective]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const styleConfig = MAP_STYLES[mapStyle].style;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: typeof styleConfig === "string" ? styleConfig : styleConfig,
      center: PAKISTAN_CENTER,
      zoom: 6,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => {
      setMapLoaded(true);
      addMapLayers(map);
      // Force re-render tiles after load
      setTimeout(() => map.resize(), 100);
    });

    map.on("error", (e) => {
      console.error("[MapLibre]", e.error);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch map style without re-creating the map
  const switchStyle = useCallback((key: StyleKey) => {
    const map = mapRef.current;
    if (!map) return;

    const styleConfig = MAP_STYLES[key].style;
    map.setStyle(typeof styleConfig === "string" ? styleConfig : styleConfig);
    setMapStyle(key);
    setShowStylePicker(false);

    // Re-add GeoJSON sources after style change (needed for all styles)
    map.once("style.load", () => {
      addMapLayers(map);
      setTimeout(() => map.resize(), 50);
    });
  }, []);

  // Recenter button - fits to show both markers, or centers on whichever is available
  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const hasWorker = hasValidCoordinate(workerLocation);
    const hasDest = hasValidCoordinate(destination);

    if (hasWorker && hasDest) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([workerLocation.lng, workerLocation.lat]);
      bounds.extend([destination!.lng, destination!.lat]);
      map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
    } else if (hasWorker) {
      map.flyTo({
        center: [workerLocation.lng, workerLocation.lat],
        zoom: 15,
      });
    } else if (hasDest) {
      map.flyTo({
        center: [destination!.lng, destination!.lat],
        zoom: 15,
      });
    } else {
      map.flyTo({ center: PAKISTAN_CENTER, zoom: 6 });
    }
  }, [workerLocation, destination]);

  // Update markers — NO auto-zoom
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const hasDest = hasValidCoordinate(destination);
    const hasWorker = hasValidCoordinate(workerLocation);

    if (!hasDest || !hasWorker) {
      map.getSource("fallback-route")?.setData({
        type: "FeatureCollection",
        features: [],
      });
      map.getSource("route")?.setData({
        type: "FeatureCollection",
        features: [],
      });
      lastRouteOriginRef.current = null;
      lastRouteDestinationRef.current = null;
    }

    // Destination marker
    if (hasDest) {
      if (destMarkerRef.current) {
        destMarkerRef.current.setLngLat([destination!.lng, destination!.lat]);
      } else {
        const el = document.createElement("div");
        el.innerHTML = createDestMarkerHtml();

        destMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([destination!.lng, destination!.lat])
          .addTo(map);

        if (destination!.label) {
          const popup = new maplibregl.Popup({
            offset: 25,
            closeButton: false,
            className: "dest-popup",
          }).setHTML(`
            <div style="
              background: #241C15;
              color: #F5EDE0;
              padding: 4px 8px;
              border-radius: 8px;
              font-size: 11px;
              font-weight: 600;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            ">
              ${destination!.label}
            </div>
          `);
          destMarkerRef.current.setPopup(popup);
          popup.addTo(map);
        }
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    // Arrival zone
    if (showArrivalZone && hasDest) {
      const radiusInKm = ARRIVAL_ZONE_RADIUS / 1000;
      const center = [destination!.lng, destination!.lat] as [number, number];
      map.getSource("arrival-zone")?.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: createCircleGeometry(center, radiusInKm),
            properties: {},
          },
        ],
      });
    } else {
      map.getSource("arrival-zone")?.setData({
        type: "FeatureCollection",
        features: [],
      });
    }

    // Worker marker — just update position, no camera movement
    if (hasWorker) {
      const lngLat: [number, number] = [workerLocation.lng, workerLocation.lat];

      if (workerMarkerRef.current) {
        workerMarkerRef.current.setLngLat(lngLat);
      } else {
        const el = document.createElement("div");
        el.innerHTML = createWorkerMarkerHtml();

        workerMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat(lngLat)
          .addTo(map);
      }

      // Draw fallback route (straight line)
      if (hasDest) {
        map.getSource("fallback-route")?.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [workerLocation.lng, workerLocation.lat],
                  [destination!.lng, destination!.lat],
                ],
              },
              properties: {},
            },
          ],
        });
      }
      // NO fitBounds here — user controls camera
    }
  }, [mapLoaded, workerLocation, destination, showArrivalZone, createWorkerMarkerHtml, createDestMarkerHtml]);

  // Fetch road route
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const hasDest = hasValidCoordinate(destination);
    const hasWorker = hasValidCoordinate(workerLocation);
    if (!hasDest || !hasWorker) return;

    const origin: [number, number] = [workerLocation.lng, workerLocation.lat];
    const target: [number, number] = [destination.lng, destination.lat];
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

    const requestId = ++routeRequestIdRef.current;
    const controller = new AbortController();
    const query = new URLSearchParams({
      fromLat: String(workerLocation.lat),
      fromLng: String(workerLocation.lng),
      toLat: String(destination.lat),
      toLng: String(destination.lng),
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
          .map(([lng, lat]: [number, number]) => [lng, lat] as [number, number]);

        if (routePoints.length < 2) return;

        mapRef.current?.getSource("route")?.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "LineString", coordinates: routePoints },
              properties: {},
            },
          ],
        });
        mapRef.current?.getSource("fallback-route")?.setData({
          type: "FeatureCollection",
          features: [],
        });
      } catch {
        // Keep the fallback route
      }
    }

    void loadRoute();
    return () => controller.abort();
  }, [mapLoaded, workerLocation, destination]);

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <div
        ref={mapContainer}
        className="absolute inset-0 h-full w-full"
        style={{ minHeight: "300px" }}
      />

      {/* Distance badge */}
      {distanceKm !== undefined && (
        <div className="absolute left-3 top-3 z-[1000] rounded-xl bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <p className="text-xs font-bold text-text">
            {distanceKm < 1
              ? `${Math.round(distanceKm * 1000)} m`
              : `${distanceKm.toFixed(1)} km`}
          </p>
          <p className="text-xs text-muted">away</p>
        </div>
      )}

      {/* Recenter button */}
      <button
        type="button"
        onClick={handleRecenter}
        className="absolute right-3 bottom-16 z-[1000] flex h-9 w-9 items-center justify-center rounded-lg bg-surface/95 shadow-lg backdrop-blur-sm transition-colors hover:bg-surface"
        title="Recenter map"
      >
        <svg className="h-4 w-4 text-text" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      </button>

      {/* Style picker */}
      <div className="absolute right-3 bottom-28 z-[1000]">
        <button
          type="button"
          onClick={() => setShowStylePicker(!showStylePicker)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface/95 shadow-lg backdrop-blur-sm transition-colors hover:bg-surface"
          title="Map style"
        >
          <svg className="h-4 w-4 text-text" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
        </button>

        {showStylePicker && (
          <div className="absolute bottom-11 right-0 w-44 rounded-xl border border-divider bg-surface p-1.5 shadow-xl">
            {(Object.keys(MAP_STYLES) as StyleKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => switchStyle(key)}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                  mapStyle === key
                    ? "bg-accent text-bg"
                    : "text-text hover:bg-bg"
                }`}
              >
                {MAP_STYLES[key].name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function addMapLayers(map: maplibregl.Map) {
  if (!map.getSource("arrival-zone")) {
    map.addSource("arrival-zone", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "arrival-zone-fill",
      type: "fill",
      source: "arrival-zone",
      paint: { "fill-color": "#C97A3D", "fill-opacity": 0.08 },
    });
    map.addLayer({
      id: "arrival-zone-border",
      type: "line",
      source: "arrival-zone",
      paint: {
        "line-color": "#C97A3D",
        "line-width": 2,
        "line-dasharray": [6, 4],
      },
    });
  }

  if (!map.getSource("route")) {
    map.addSource("route", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      paint: { "line-color": "#C97A3D", "line-width": 5, "line-opacity": 0.9 },
    });
  }

  if (!map.getSource("fallback-route")) {
    map.addSource("fallback-route", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "fallback-route-line",
      type: "line",
      source: "fallback-route",
      paint: {
        "line-color": "#C97A3D",
        "line-width": 3,
        "line-opacity": 0.7,
        "line-dasharray": [8, 6],
      },
    });
  }
}

function createCircleGeometry(
  center: [number, number],
  radiusKm: number,
  points = 64
): GeoJSON.Polygon {
  const coords: [number, number][] = [];
  const [lng, lat] = center;

  for (let i = 0; i <= points; i++) {
    const angle = (i * 360) / points;
    const rad = (angle * Math.PI) / 180;
    const dx = radiusKm * Math.cos(rad);
    const dy = radiusKm * Math.sin(rad);

    const newLng = lng + (dx / (111.32 * Math.cos((lat * Math.PI) / 180))) * 57.2958;
    const newLat = lat + dy * 0.89932;

    coords.push([newLng, newLat]);
  }

  return {
    type: "Polygon",
    coordinates: [coords],
  };
}
