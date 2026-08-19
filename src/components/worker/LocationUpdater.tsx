"use client";

import { useState } from "react";

interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * "Update location" control: tries the browser geolocation API first and
 * falls back to manual lat/lng entry when it is unavailable or denied.
 */
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
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Location update failed");
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
    <div className="card">
      <h3 className="text-sm font-bold text-stone-800">Location</h3>
      <p className="text-xs text-stone-500">
        {last
          ? `Last updated ${last.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "Never updated"}
      </p>

      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={useAutomatic}
          disabled={busy}
          className="w-full rounded-xl bg-[#0e5f44] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b4c37] disabled:opacity-60"
        >
          {busy ? "Updating…" : "Update location"}
        </button>
        {!manual && (
          <button
            type="button"
            onClick={() => setManual(true)}
            className="w-full rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
          >
            Enter coordinates manually
          </button>
        )}
      </div>

      {manual && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitude"
              aria-label="Latitude"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0e5f44]"
            />
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitude"
              aria-label="Longitude"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0e5f44]"
            />
          </div>
          <button
            type="button"
            onClick={submitManual}
            disabled={busy}
            className="w-full rounded-xl border border-[#0e5f44] px-4 py-2 text-sm font-semibold text-[#0e5f44] transition hover:bg-emerald-50 disabled:opacity-60"
          >
            Save coordinates
          </button>
        </div>
      )}

      {message && (
        <p
          className={`mt-2 rounded-lg px-3 py-1.5 text-xs ${
            message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}