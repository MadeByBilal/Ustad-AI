"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VoiceCapture from "./VoiceCapture";
import PhotoPicker from "./PhotoPicker";
import WorkerResults from "./WorkerResults";

const DEMO_COORDS = { lat: 24.8607, lng: 67.0011 };

const CATEGORY_OPTIONS = [
  "plumber",
  "electrician",
  "ac_technician",
  "carpenter",
] as const;

const URGENCY_OPTIONS = ["normal", "potentially_urgent", "emergency"] as const;

const RADIUS_OPTIONS = [5, 10, 20];

interface Coords {
  lat: number;
  lng: number;
}

interface LocationState extends Coords {
  approximate: boolean;
}

interface JobInput {
  original_text: string;
  category_hint: string;
  urgency_hint: string;
  address_label: string;
  search_radius_km: number;
}

interface AnalyzedJob {
  _id: string;
  status: string;
  understanding?: {
    category: string;
    subcategory?: string;
    description?: string;
    required_skills?: string[];
    urgency: string;
  };
  pricing?: {
    currency?: string;
    estimate_min?: number;
    estimate_max?: number;
  };
  location?: {
    address_label?: string;
  };
}

interface BroadcastInfo {
  broadcast_id: string;
  eligible_workers_count: number;
  acceptance_deadline: string;
}

const STEPS = ["Describe", "Summary", "Offer", "Done"];

const inputStyles =
  "w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-[#0e5f44] focus:ring-2 focus:ring-[#0e5f44]/20";

const labelStyles = "mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500";

function humanize(value: string): string {
  return value.replace(/_/g, " ");
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as { success?: boolean; error?: string; data?: T } | null;
  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body.data as T;
}

function requestLocation(): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 300000 }
    );
  });
}

export default function NewWorkWizard() {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [method, setMethod] = useState<"voice" | "photo" | "text">("text");
  const [photoIds, setPhotoIds] = useState<string[]>([]);

  const [input, setInput] = useState<JobInput>({
    original_text: "",
    category_hint: "",
    urgency_hint: "",
    address_label: "",
    search_radius_km: 5,
  });
  const [location, setLocation] = useState<LocationState | null>(null);

  const [job, setJob] = useState<AnalyzedJob | null>(null);
  const [broadcast, setBroadcast] = useState<BroadcastInfo | null>(null);
  const [lastOffer, setLastOffer] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const m = params.get("method");
    if (m === "voice" || m === "photo") {
      setMethod(m);
    }
    const u = params.get("urgency");
    if (u === "emergency" || u === "potentially_urgent") {
      setInput((prev) => ({ ...prev, urgency_hint: u }));
    }
  }, []);

  function patch<K extends keyof JobInput>(key: K, value: JobInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  async function handleLocation() {
    setBusy(true);
    setError(null);
    try {
      const coords = await requestLocation();
      setLocation(
        coords ? { ...coords, approximate: false } : { ...DEMO_COORDS, approximate: true }
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAnalyze() {
    setBusy(true);
    setError(null);
    try {
      const body = {
        type: "text" as const,
        original_text: input.original_text,
        category_hint: input.category_hint || null,
        urgency_hint: input.urgency_hint || null,
        location: {
          coordinates: location ? [location.lng, location.lat] : null,
          address_label: input.address_label,
          search_radius_km: input.search_radius_km,
        },
      };
      const created = await parseJson<AnalyzedJob>(
        await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      );
      setJob(created);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!job) return;
    setBusy(true);
    setError(null);
    try {
      await parseJson(
        await fetch(`/api/jobs/${job._id}/confirm`, { method: "POST" })
      );
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleBroadcast(offer: string) {
    if (!job) return;
    setBusy(true);
    setError(null);
    try {
      const offerValue = offer === "" ? null : Number(offer);
      const result = await parseJson<BroadcastInfo>(
        await fetch(`/api/jobs/${job._id}/broadcast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offer_rs: offerValue }),
        })
      );
      setBroadcast(result);
      setLastOffer(offer);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleEditDetails() {
    if (!job) return;
    setBusy(true);
    setError(null);
    try {
      await parseJson(
        await fetch(`/api/jobs/${job._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: method,
            original_text: input.original_text.trim() || undefined,
            ...(photoIds.length > 0 ? { photo_ids: photoIds } : {}),
            category_hint: input.category_hint || null,
            urgency_hint: input.urgency_hint || null,
            location: {
              coordinates: location ? [location.lng, location.lat] : null,
              address_label: input.address_label || undefined,
              search_radius_km: input.search_radius_km,
            },
          }),
        })
      );
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const estimateMin = job?.pricing?.estimate_min ?? 0;
  const estimateMax = job?.pricing?.estimate_max ?? 0;
  const isEmergency = job?.understanding?.urgency === "emergency";
  const defaultOffer = estimateMin > 0 ? String(estimateMin) : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-urdu text-2xl font-bold">نیا کام بنائیں</h1>
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  step > i + 1
                    ? "bg-[#0e5f44] text-white"
                    : step === i + 1
                      ? "bg-[#0e5f44]/10 text-[#0e5f44] ring-2 ring-[#0e5f44]/30"
                      : "bg-stone-100 text-stone-400"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`hidden text-xs font-semibold sm:block ${
                  step === i + 1 ? "text-stone-800" : "text-stone-400"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="card space-y-4">
          {method === "voice" && (
            <VoiceCapture onFinal={(transcript) => setInput((prev) => ({ ...prev, original_text: transcript }))} />
          )}
          {method === "photo" && <PhotoPicker onPhotos={setPhotoIds} />}
          <div>
            <label htmlFor="problem" className={labelStyles}>
              What needs fixing?
            </label>
            <textarea
              id="problem"
              rows={4}
              value={input.original_text}
              onChange={(e) => patch("original_text", e.target.value)}
              placeholder="مثلاً: باتھ روم کا پائپ لیک ہو رہا ہے اور چھت سے پانی ٹپک رہا ہے…"
              className={`${inputStyles} font-urdu text-base leading-relaxed`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className={labelStyles}>
                Category (optional)
              </label>
              <select
                id="category"
                value={input.category_hint}
                onChange={(e) => patch("category_hint", e.target.value)}
                className={inputStyles}
              >
                <option value="">Let AI decide</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {humanize(c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="urgency" className={labelStyles}>
                Urgency (optional)
              </label>
              <select
                id="urgency"
                value={input.urgency_hint}
                onChange={(e) => patch("urgency_hint", e.target.value)}
                className={inputStyles}
              >
                <option value="">Normal</option>
                {URGENCY_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {humanize(u)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="address" className={labelStyles}>
              Area / address
            </label>
            <input
              id="address"
              type="text"
              value={input.address_label}
              onChange={(e) => patch("address_label", e.target.value)}
              placeholder="مثلاً: گلشن اقبال بلاک 5، کراچی"
              className={inputStyles}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="radius" className={labelStyles}>
                Search radius
              </label>
              <select
                id="radius"
                value={input.search_radius_km}
                onChange={(e) => patch("search_radius_km", Number(e.target.value))}
                className={inputStyles}
              >
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r} km
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={labelStyles}>Location</span>
              <button
                type="button"
                onClick={handleLocation}
                disabled={busy}
                className="w-full rounded-xl border border-dashed border-stone-300 px-3 py-2 text-left text-sm text-stone-600 transition hover:border-[#0e5f44] hover:text-[#0e5f44] disabled:opacity-60"
              >
                {location ? (
                  <span className="flex items-center justify-between gap-2">
                    <span>
                      {location.approximate
                        ? "Approximate (Karachi demo)"
                        : `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                    </span>
                    <span className="text-xs font-semibold uppercase text-[#0e5f44]">
                      Change
                    </span>
                  </span>
                ) : (
                  "Use my location"
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={busy || !input.original_text.trim()}
            className="btn-primary w-full disabled:opacity-60"
          >
            {busy ? "Analyzing…" : "Analyze & see summary"}
          </button>
        </div>
      )}

      {step === 2 && job && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge !bg-[#0e5f44] !text-white">
              {humanize(job.understanding?.category ?? "uncategorized")}
            </span>
            {isEmergency && (
              <span className="badge !bg-red-600 !text-white">Emergency</span>
            )}
            <span className="badge !bg-stone-100 !text-stone-600">
              Confidence in AI summary
            </span>
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              What the AI understood
            </h2>
            <p className="mt-1 text-stone-800">
              {job.understanding?.description || input.original_text}
            </p>
            {job.understanding?.required_skills &&
              job.understanding.required_skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.understanding.required_skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600"
                    >
                      {humanize(s)}
                    </span>
                  ))}
                </div>
              )}
          </div>

          <div className="rounded-xl bg-stone-50 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-stone-500">
              Estimated price
            </p>
            <p className="mt-1 text-3xl font-extrabold text-[#0e5f44]">
              ₨ {estimateMin.toLocaleString("en-PK")}
              {estimateMax > estimateMin && (
                <span className="text-lg font-semibold text-stone-400">
                  {" "}
                  – ₨ {estimateMax.toLocaleString("en-PK")}
                </span>
              )}
            </p>
          </div>

          {job.location?.address_label && (
            <p className="text-xs text-stone-500">
              📍 {job.location.address_label}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {busy ? "Confirming…" : "Sab theek hai — confirm"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={busy}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
            >
              Edit details
            </button>
          </div>
        </div>
      )}

      {step === 3 && job && (
        <OfferStep
          estimateMin={estimateMin}
          estimateMax={estimateMax}
          isEmergency={isEmergency}
          defaultOffer={defaultOffer}
          busy={busy}
          onBroadcast={handleBroadcast}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && job && broadcast && (
        <div className="card space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-800">
              {broadcast.eligible_workers_count} workers notified 🎉
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Workers nearby can accept until{" "}
              {new Date(broadcast.acceptance_deadline).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              .
            </p>
          </div>

          <WorkerResults
            jobId={job._id}
            urgency={isEmergency ? "emergency" : "normal"}
            customerOffer={lastOffer === null ? null : Number(lastOffer)}
            acceptanceDeadline={broadcast.acceptance_deadline}
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleEditDetails}
              disabled={busy}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
            >
              {busy ? "Restarting…" : "Edit job & restart"}
            </button>
            <Link href="/dashboard" className="btn-primary block w-full text-center">
              Back to dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function OfferStep({
  estimateMin,
  estimateMax,
  isEmergency,
  defaultOffer,
  busy,
  onBroadcast,
  onBack,
}: {
  estimateMin: number;
  estimateMax: number;
  isEmergency: boolean;
  defaultOffer: string;
  busy: boolean;
  onBroadcast: (offer: string) => void;
  onBack: () => void;
}) {
  const [offer, setOffer] = useState(defaultOffer);

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
          Your offer
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          AI estimate: ₨ {estimateMin.toLocaleString("en-PK")}
          {estimateMax > estimateMin && (
            <>
              {" "}
              – ₨ {estimateMax.toLocaleString("en-PK")}
            </>
          )}
          {isEmergency && " · optional for emergency jobs"}
        </p>
      </div>

      <div>
        <label htmlFor="offer" className={labelStyles}>
          Offer in PKR
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-400">
            ₨
          </span>
          <input
            id="offer"
            type="number"
            min={0}
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            placeholder={isEmergency ? "Optional" : "Your offer"}
            className={`${inputStyles} pl-8`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => onBroadcast(offer)}
          disabled={busy}
          className="btn-primary flex-1 disabled:opacity-60"
        >
          {busy ? "Broadcasting…" : "Broadcast to workers"}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
        >
          Back
        </button>
      </div>
    </div>
  );
}