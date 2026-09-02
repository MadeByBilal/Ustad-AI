"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getApiErrorMessage } from "@/client/lib/api-client";

interface Coordinates {
  lat: number;
  lng: number;
}

export default function LocationUpdater({
  lastUpdated,
  onChanged,
}: {
  lastUpdated: string | null;
  onChanged?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(coords: Coordinates) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/workers/me/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Location update failed"));
      }
      setMessage({ ok: true, text: "Location updated" });
      setManual(false);
      onChanged?.();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Location update failed" });
    } finally {
      setBusy(false);
    }
  }

  function useAutomatic() {
    setBusy(true);
    setMessage(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMessage({ ok: false, text: "Geolocation not available — enter coordinates manually" });
      setManual(true);
      setBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => void send({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setMessage({ ok: false, text: "Could not read your location — enter it manually" });
        setManual(true);
        setBusy(false);
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }

  function submitManual() {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      setMessage({ ok: false, text: "Enter valid latitude and longitude" });
      return;
    }
    void send({ lat: parsedLat, lng: parsedLng });
  }

  const last = lastUpdated ? new Date(lastUpdated) : null;

  return (
    <motion.div className="card" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      <h3 className="text-lg font-bold text-text">Location</h3>
      <p className="mt-0.5 text-sm text-muted">
        {last
          ? `Last updated ${last.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "Never updated"}
      </p>

      <div className="mt-4 space-y-3">
        <motion.button
          type="button"
          onClick={useAutomatic}
          disabled={busy}
          className="btn-primary w-full"
          whileTap={{ scale: 0.95 }}
          whileHover={{ y: -1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {busy ? "Updating…" : "Update location"}
        </motion.button>
        {!manual && (
          <motion.button
            type="button"
            onClick={() => setManual(true)}
            className="btn-secondary w-full"
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            Enter coordinates manually
          </motion.button>
        )}
      </div>

      {manual && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitude"
              aria-label="Latitude"
              className="input"
            />
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitude"
              aria-label="Longitude"
              className="input"
            />
          </div>
          <motion.button
            type="button"
            onClick={submitManual}
            disabled={busy}
            className="btn-secondary w-full"
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            Save coordinates
          </motion.button>
        </div>
      )}

      {message && (
        <p
          className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${
            message.ok ? "bg-success/15 text-success-fg" : "bg-warning/10 text-warning"
          }`}
        >
          {message.text}
        </p>
      )}
    </motion.div>
  );
}
