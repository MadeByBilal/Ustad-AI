"use client";

import { useState } from "react";

interface AvailabilityState {
  is_available: boolean;
  is_online: boolean;
  emergency_available: boolean;
}

export default function WorkerAvailability({
  initial,
  onChanged,
}: {
  initial: AvailabilityState;
  onChanged?: () => void;
}) {
  const [state, setState] = useState<AvailabilityState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: keyof AvailabilityState) {
    const next = { ...state, [key]: !state[key] };
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/workers/me/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Update failed");
      }
      setState((s) => ({ ...s, ...body.data }));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  const rows: { key: keyof AvailabilityState; label: string; hint: string }[] = [
    { key: "is_available", label: "Available for jobs", hint: "Receive new job broadcasts" },
    { key: "is_online", label: "Online now", hint: "Shown as online to customers" },
    { key: "emergency_available", label: "Emergency jobs", hint: "24/7 urgent calls" },
  ];

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-stone-800">Availability</h3>
      <p className="mt-0.5 text-sm text-stone-500">Updated in real time</p>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      <div className="mt-4 space-y-4">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium text-stone-800">{r.label}</p>
              <p className="mt-0.5 text-sm text-stone-500">{r.hint}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(r.key)}
              disabled={saving}
              aria-pressed={state[r.key]}
              aria-label={r.label}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                state[r.key] ? "bg-[#0e5f44]" : "bg-stone-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                  state[r.key] ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
