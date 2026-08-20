"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type L from "leaflet";

export interface TrackingMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color: string;
}

interface TrackingMapProps {
  workerLocation: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number; label?: string };
  distanceKm?: number;
  showArrivalZone?: boolean;
  className?: string;
}

const ARRIVAL_ZONE_RADIUS = 100; // meters

export default function TrackingMap({
  workerLocation,
  destination,
  distanceKm,
  showArrivalZone = true,
  className = "",
}: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const workerMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const arrivalCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
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

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leaflet]);

  // Create custom icons
  const getWorkerIcon = useCallback(
    (L: typeof import("leaflet")) => {
      return L.divIcon({
        html: `
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
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
    },
    []
  );

  const getDestIcon = useCallback(
    (L: typeof import("leaflet")) => {
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
    []
  );

  // Update markers
  useEffect(() => {
    if (!leaflet || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Destination marker
    if (destination.lat && destination.lng) {
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
      } else {
        destMarkerRef.current = leaflet
          .marker([destination.lat, destination.lng], {
            icon: getDestIcon(leaflet),
          })
          .addTo(map);
        if (destination.label) {
          destMarkerRef.current.bindTooltip(destination.label, {
            permanent: true,
            direction: "top",
            offset: [0, -40],
            className: "dest-tooltip",
          });
        }
      }
    }

    // Arrival zone circle
    if (showArrivalZone && destination.lat && destination.lng) {
      if (arrivalCircleRef.current) {
        arrivalCircleRef.current.setLatLng([destination.lat, destination.lng]);
      } else {
        arrivalCircleRef.current = leaflet
          .circle([destination.lat, destination.lng], {
            radius: ARRIVAL_ZONE_RADIUS,
            color: "#22c55e",
            fillColor: "#22c55e",
            fillOpacity: 0.08,
            weight: 2,
            dashArray: "6 4",
          })
          .addTo(map);
      }
    }

    // Worker marker
    if (workerLocation?.lat && workerLocation?.lng) {
      const latlng: [number, number] = [workerLocation.lat, workerLocation.lng];

      if (workerMarkerRef.current) {
        workerMarkerRef.current.setLatLng(latlng);
      } else {
        workerMarkerRef.current = leaflet
          .marker(latlng, { icon: getWorkerIcon(leaflet) })
          .addTo(map);
      }

      // Draw polyline from worker to destination
      if (destination.lat && destination.lng) {
        const points: [number, number][] = [
          latlng,
          [destination.lat, destination.lng],
        ];
        if (polylineRef.current) {
          polylineRef.current.setLatLngs(points);
        } else {
          polylineRef.current = leaflet
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
      if (destination.lat && destination.lng) {
        bounds.extend([destination.lat, destination.lng]);
      }
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  }, [leaflet, workerLocation, destination, getWorkerIcon, getDestIcon, showArrivalZone]);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
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
