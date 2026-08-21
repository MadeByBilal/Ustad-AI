"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { parseApiResponse } from "@/lib/api-client";
import type { AiUnderstandResult } from "@/lib/job/ai";
import type { WorkerOption } from "@/lib/matching";
import type { WorkerCategory, UrgencyLevel } from "@/models";
import TechnicianRequestModal from "./TechnicianRequestModal";

export interface UnderstandResponse extends AiUnderstandResult {
  transcript?: string;
  workers: { best: WorkerOption | null; others: WorkerOption[]; ranked?: WorkerOption[] };
}

type Status = "idle" | "processing" | "clarifying" | "done" | "error";

export interface VoiceCaptureProps {
  /** Visual theme. "landing" (dark green, default) or "dashboard" (light). */
  variant?: "landing" | "dashboard";
}

const CATEGORY_LABELS: Record<WorkerCategory, string> = {
  plumber: "Plumber",
  electrician: "Electrician",
  ac_technician: "AC Technician",
  carpenter: "Carpenter",
};

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  normal: "Normal",
  potentially_urgent: "Potentially urgent",
  emergency: "Emergency",
};

const currency = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;

function WorkerCard({
  worker,
  highlight,
}: {
  worker: WorkerOption;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border-2 border-amber-400 bg-amber-50 p-4"
          : "rounded-xl border border-stone-200 bg-white p-4"
      }
    >
      {highlight && (
        <span className="badge mb-2 !bg-amber-400 !text-[#0a4632]">
          Best match
        </span>
      )}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-stone-900">{worker.name}</p>
          <p className="text-xs text-stone-500">
            {CATEGORY_LABELS[worker.category] ?? worker.category} · ⭐{" "}
            {worker.average_rating.toFixed(1)} · {worker.completed_jobs} jobs ·{" "}
            {worker.verified ? "verified" : "unverified"}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-[#0e5f44] px-2 py-1 text-xs font-bold text-white">
          {worker.ustad_score}
        </span>
      </div>
      {worker.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {worker.skills.slice(0, 4).map((s) => (
            <span
              key={s}
              className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {(worker.distance_km != null || worker.predicted_price != null) && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
          {worker.distance_km != null && (
            <span className="rounded-md bg-stone-100 px-2 py-0.5">
              {worker.distance_km.toFixed(1)} km away
            </span>
          )}
          {worker.predicted_price != null && (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-800">
              Est. PKR {worker.predicted_price.toLocaleString("en-PK")}
            </span>
          )}
          {worker.travel_cost_pkr != null && worker.travel_cost_pkr > 0 && (
            <span className="rounded-md bg-stone-100 px-2 py-0.5">
              Travel PKR {worker.travel_cost_pkr.toLocaleString("en-PK")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ResultPanel({ data, variant, location }: { data: UnderstandResponse; variant: "landing" | "dashboard"; location?: { lat: number; lng: number } | null }) {
  const u = data.understanding;
  const ranked = data.workers.ranked ?? [
    ...(data.workers.best ? [data.workers.best] : []),
    ...data.workers.others,
  ];
  const anyWorker = ranked.length > 0;
  const nextParams = new URLSearchParams({
    method: "voice",
    text: u.description ?? "",
    category: u.category ?? "",
    urgency: u.urgency,
  });
  const ctaHref =
    variant === "dashboard"
      ? `/dashboard/customer/new-work?${nextParams.toString()}`
      : `/login?next=${encodeURIComponent(`/new-work?${nextParams.toString()}`)}`;

  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(null);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-emerald-50 p-4 text-left">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="font-semibold text-emerald-900">
            {u.category ? CATEGORY_LABELS[u.category] ?? u.category : "Not sure yet"}
          </span>
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
            {URGENCY_LABELS[u.urgency] ?? u.urgency}
          </span>
          {u.confidence > 0 && (
            <span className="text-xs text-emerald-700">
              {Math.round(u.confidence * 100)}% confident
            </span>
          )}
        </div>
        {u.description && (
          <p className="mt-2 text-sm text-emerald-900">
            &ldquo;{u.description}&rdquo;
          </p>
        )}
        {u.required_skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {u.required_skills.map((s) => (
              <span
                key={s}
                className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-800"
              >
                {s}
              </span>
            ))}
          </div>
        )}
        {u.safety_flags.length > 0 && (
          <p className="mt-2 text-xs font-semibold text-red-700">
            ⚠ {u.safety_flags.join(", ")}
          </p>
        )}
      </div>

      {u.category && (
        <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Price — set automatically
          </p>
          <p className="text-2xl font-bold text-stone-900">
            {currency(u.inspection_fee)} visit fee · then{" "}
            {u.estimate_min > 0
              ? `${currency(u.estimate_min)} – ${currency(u.estimate_max)}`
              : "after checking"}
          </p>
          <p className="text-xs text-amber-800/80">
            آپ پہلے صرف معائنہ فیس دیتے ہیں — اصل مرمت کی قیمت اُستاد کے معائنے کے بعد طے ہوگی۔
          </p>
          {u.complexity && (
            <p className="mt-1 text-xs text-amber-800/80">
              Complexity: {u.complexity}
            </p>
          )}
        </div>
      )}

      {/* Submitting feedback */}
      {submittedJobId && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-sm font-semibold text-emerald-800">
            Request sent! Waiting for the technician to respond.
          </p>
        </div>
      )}

      {/* Ranked technicians with Send Request (dashboard) or best+others (landing) */}
      {anyWorker ? (
        <div className="space-y-2 text-left">
          {variant === "dashboard"
            ? ranked.map((w, i) => (
                <div key={w.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {i === 0 && (
                          <span className="badge !bg-amber-400 !text-[#0a4632]">Best match</span>
                        )}
                        <span className="text-sm font-semibold text-stone-900">{w.name}</span>
                        <span className="text-xs text-stone-500">
                          {CATEGORY_LABELS[w.category] ?? w.category} · ⭐ {w.average_rating.toFixed(1)}
                        </span>
                        {w.verified && (
                          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            Verified
                          </span>
                        )}
                      </div>
                        {w.skills.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {w.skills.slice(0, 3).map((s) => (
                            <span key={s} className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                              {s}
                            </span>
                          ))}
                        </div>
                        )}
                        {(w.distance_km != null || w.predicted_price != null) && (
                          <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-stone-500">
                            {w.distance_km != null && <span>{w.distance_km.toFixed(1)} km away</span>}
                            {w.predicted_price != null && (
                              <span className="font-semibold text-amber-700">
                                Est. PKR {w.predicted_price.toLocaleString("en-PK")}
                              </span>
                            )}
                            {w.travel_cost_pkr != null && w.travel_cost_pkr > 0 && (
                              <span>Travel PKR {w.travel_cost_pkr.toLocaleString("en-PK")}</span>
                            )}
                          </div>
                        )}
                    </div>
                    <span className="shrink-0 rounded-lg bg-[#0e5f44] px-2 py-1 text-xs font-bold text-white">
                      {w.final_score}
                    </span>
                  </div>
                  {!submittedJobId && (
                    <button
                      type="button"
                      onClick={() => setSelectedWorker(w)}
                      className="mt-3 w-full rounded-lg bg-[#0a4632] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0e5f44]"
                    >
                      Send Request
                    </button>
                  )}
                </div>
              ))
            : <>
                {data.workers.best && <WorkerCard worker={data.workers.best} highlight />}
                {data.workers.others.slice(0, 2).map((w) => (
                  <WorkerCard key={w.id} worker={w} />
                ))}
              </>
          }
        </div>
      ) : (
        <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-500">
          No ustads available right now — try again later.
        </p>
      )}

      {variant === "landing" && (
        <Link
          href={ctaHref}
          className="block rounded-xl bg-[#0a4632] py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#0e5f44]"
        >
          Set price &amp; find workers
        </Link>
      )}

      {/* Technician request modal */}
      {selectedWorker && (
        <TechnicianRequestModal
          worker={selectedWorker}
          understanding={u}
          input={{
            type: data.transcript ? "voice" : "text",
            original_text: u.description ?? "",
            transcript: data.transcript,
          }}
          location={location}
          onClose={() => setSelectedWorker(null)}
          onSubmitted={(result) => {
            setSelectedWorker(null);
            setSubmittedJobId(result.job_id);
          }}
        />
      )}
    </div>
  );
}

export default function VoiceCapture({ variant = "landing" }: VoiceCaptureProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UnderstandResponse | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [clarificationSelections, setClarificationSelections] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);

  const recorderRef = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
  } | null>(null);

  const voiceSupported = useCallback(() => {
    return typeof window !== "undefined" && "MediaRecorder" in window;
  }, []);

  const getLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  }, []);

  const run = useCallback(
    async (body: FormData | { clarification?: string }) => {
      setError("");
      setBusy(true);
      setStatus("processing");
      setResult(null);
      try {
        // Get customer location for finding nearest workers
        const location = await getLocation();
        setCustomerLocation(location);

        if (body instanceof FormData && location) {
          body.set("lat", String(location.lat));
          body.set("lng", String(location.lng));
        }

        const fetchBody = body instanceof FormData ? body : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            ...(location ? { lat: location.lat, lng: location.lng } : {}),
          }),
        };

        const response = await fetch("/api/ai/understand", {
          method: "POST",
          ...(body instanceof FormData
            ? { body }
            : fetchBody),
        });
        const data = await parseApiResponse<UnderstandResponse>(response);
        setResult(data);
        setClarificationSelections([]);
        setStatus(data.clarification_question || data.manual_fallback ? "clarifying" : "done");
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        );
      } finally {
        setBusy(false);
      }
    },
    [getLocation]
  );

  const startRecording = useCallback(async () => {
    if (!voiceSupported()) {
      setStatus("error");
      setError(
        "Voice recording is not supported in this browser. Try Chrome on a phone or laptop."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        recorderRef.current = null;
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const fd = new FormData();
        fd.append("audio", blob, "voice.webm");
        void run(fd);
      };
      recorderRef.current = { recorder, stream };
      recorder.start();
      setRecording(true);
    } catch {
      setStatus("error");
      setError("Could not access your microphone. Please allow mic access and try again.");
    }
  }, [run, voiceSupported]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.recorder.stop();
    }
  }, []);

  const handleVoiceKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (recording) {
        stopRecording();
      } else {
        void startRecording();
      }
    },
    [recording, startRecording, stopRecording]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError("");
    setResult(null);
    setClarificationAnswer("");
    setClarificationSelections([]);
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col items-center">
      {/* Mic button */}
      <button
        type="button"
        aria-label={recording ? "Stop recording" : "Hold to speak"}
        onPointerDown={() => void startRecording()}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onKeyDown={handleVoiceKey}
        className={`flex h-28 w-28 items-center justify-center rounded-full text-5xl transition-transform select-none active:scale-95 ${
          recording
            ? "bg-red-500 text-white shadow-lg shadow-red-500/40"
            : "bg-amber-400 text-[#0a4632] shadow-xl shadow-amber-400/30 hover:bg-amber-300"
        }`}
      >
        🎙️
      </button>
      <p
        className={`mt-4 text-sm font-medium ${
          variant === "dashboard" ? "text-stone-500" : "text-emerald-100"
        }`}
      >
        {recording
          ? "Listening… release to stop"
          : status === "processing"
            ? "Understanding your problem…"
            : "دبائیں اور بتائیں · Hold, speak, done"}
      </p>

      {/* Clarification round */}
      {status === "clarifying" && result?.clarification_question && (
        <div className="mt-5 w-full space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left">
          <p className="text-sm font-medium text-stone-800">
            {result.clarification_question}
          </p>
          {result.clarification_options && result.clarification_options.length > 0 && (
            <div className="space-y-2">
              {result.clarification_options.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700"
                >
                  <input
                    type="checkbox"
                    checked={clarificationSelections.includes(option)}
                    onChange={(event) => {
                      setClarificationSelections((current) =>
                        event.target.checked
                          ? [...current, option]
                          : current.filter((selected) => selected !== option)
                      );
                    }}
                    className="h-4 w-4 accent-[#0e5f44]"
                  />
                  {option}
                </label>
              ))}
            </div>
          )}
          <input
            type="text"
            value={clarificationAnswer}
            onChange={(e) => setClarificationAnswer(e.target.value)}
            placeholder="Your answer, e.g. bijli ka masla hai"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0e5f44]"
          />
          <button
            type="button"
            onClick={() =>
              void run({
                clarification: [...clarificationSelections, clarificationAnswer.trim()]
                  .filter(Boolean)
                  .join(", "),
              })
            }
            disabled={busy || (!clarificationAnswer.trim() && clarificationSelections.length === 0)}
            className="w-full rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {/* Processing */}
      {status === "processing" && (
        <p
          className={`mt-5 flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
            variant === "dashboard"
              ? "bg-stone-100 text-stone-600"
              : "bg-white/10 text-emerald-100"
          }`}
        >
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          Transcribing &amp; analyzing…
        </p>
      )}

      {/* Error */}
      {status === "error" && error && (
        <div className="mt-5 w-full space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-left">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* Result */}
      {status === "done" && result && (
        <div className="mt-6 w-full">
          <ResultPanel data={result} variant={variant} location={customerLocation} />
          <button
            type="button"
            onClick={reset}
            className={`mt-3 w-full rounded-lg border py-2 text-sm font-semibold transition ${
              variant === "dashboard"
                ? "border-stone-300 text-stone-600 hover:bg-stone-100"
                : "border-white/25 text-emerald-100 hover:bg-white/10"
            }`}
          >
            New request
          </button>
        </div>
      )}
    </div>
  );
}
