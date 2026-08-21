"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { parseApiResponse } from "@/lib/api-client";
import type { AiUnderstandResult } from "@/lib/job/ai";
import type { WorkerOption } from "@/lib/matching";
import type { WorkerCategory, UrgencyLevel } from "@/models";
import TechnicianRequestModal from "./TechnicianRequestModal";
import MatchResults, { type MatchResultsData } from "./MatchResults";

export interface UnderstandResponse extends AiUnderstandResult {
  transcript?: string;
  workers: { best: WorkerOption | null; others: WorkerOption[]; ranked?: WorkerOption[] };
}

type Status = "idle" | "processing" | "clarifying" | "done" | "error";

export interface VoiceCaptureProps {
  /** Visual context. Both variants use the shared dark surface palette. */
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
          ? "rounded-xl border-2 border-accent bg-surface p-4"
          : "rounded-xl border border-divider bg-surface p-4"
      }
    >
      {highlight && (
        <span className="badge mb-2 bg-accent text-bg">
          Best match
        </span>
      )}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-text">{worker.name}</p>
          <p className="text-xs text-muted">
            {CATEGORY_LABELS[worker.category] ?? worker.category} · ⭐{" "}
            <span className="font-mono">{worker.average_rating.toFixed(1)}</span> · {worker.completed_jobs} jobs ·{" "}
            {worker.verified ? "verified" : "unverified"}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-accent px-2 py-1 text-xs font-bold text-bg">
          {worker.ustad_score}
        </span>
      </div>
      {worker.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {worker.skills.slice(0, 4).map((s) => (
            <span
              key={s}
              className="rounded-md bg-surface px-2 py-0.5 text-xs text-muted"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {(worker.distance_km != null || worker.predicted_price != null) && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
          {worker.distance_km != null && (
            <span className="font-mono rounded-md bg-surface px-2 py-0.5">
              {worker.distance_km.toFixed(1)} km away
            </span>
          )}
          {worker.predicted_price != null && (
            <span className="font-mono rounded-md bg-warning/10 px-2 py-0.5 text-warning">
              Est. PKR {worker.predicted_price.toLocaleString("en-PK")}
            </span>
          )}
          {worker.travel_cost_pkr != null && worker.travel_cost_pkr > 0 && (
            <span className="font-mono rounded-md bg-surface px-2 py-0.5">
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

  // Landing-only modal state. Dashboard handles its modal inside MatchResults.
  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(null);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);

  // Dashboard uses the rebuilt MatchResults screen (dark surface palette,
  // Tabler icons, JetBrains Mono numbers, Fraunces headings, copper accent).
  if (variant === "dashboard") {
    return <MatchResults data={data as MatchResultsData} location={location} />;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-divider bg-surface p-4 text-left">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="font-semibold text-text">
            {u.category ? CATEGORY_LABELS[u.category] ?? u.category : "Not sure yet"}
          </span>
          <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-muted">
            {URGENCY_LABELS[u.urgency] ?? u.urgency}
          </span>
          {u.confidence > 0 && (
            <span className="text-xs text-muted">
              {Math.round(u.confidence * 100)}% confident
            </span>
          )}
        </div>
        {u.description && (
          <p className="mt-2 text-sm text-text">
            &ldquo;{u.description}&rdquo;
          </p>
        )}
        {u.required_skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {u.required_skills.map((s) => (
              <span
                key={s}
                className="rounded-md bg-bg px-2 py-0.5 text-xs text-muted"
              >
                {s}
              </span>
            ))}
          </div>
        )}
        {u.safety_flags.length > 0 && (
          <p className="mt-2 text-xs font-semibold text-warning">
            ⚠ {u.safety_flags.join(", ")}
          </p>
        )}
      </div>

      {u.category && (
        <div className="rounded-xl border-l-4 border-warning bg-warning/10 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-warning">
            Price — set automatically
          </p>
          <p className="text-2xl font-bold text-text">
            {currency(u.inspection_fee)} visit fee · then{" "}
            {u.estimate_min > 0
              ? `${currency(u.estimate_min)} – ${currency(u.estimate_max)}`
              : "after checking"}
          </p>
          <p className="text-xs text-warning/80">
            آپ پہلے صرف معائنہ فیس دیتے ہیں — اصل مرمت کی قیمت اُستاد کے معائنے کے بعد طے ہوگی۔
          </p>
          {u.complexity && (
            <p className="mt-1 text-xs text-warning/80">
              Complexity: {u.complexity}
            </p>
          )}
        </div>
      )}

      {/* Submitting feedback */}
      {submittedJobId && (
        <div className="rounded-xl border border-success/40 bg-success p-4 text-center">
          <p className="text-sm font-semibold text-success-fg">
            Request sent! Waiting for the technician to respond.
          </p>
        </div>
      )}

      {/* Ranked technicians — dashboard uses MatchResults above; landing shows best+others inline */}
      {anyWorker ? (
        <div className="space-y-2 text-left">
          {data.workers.best && <WorkerCard worker={data.workers.best} highlight />}
          {data.workers.others.slice(0, 2).map((w) => (
            <WorkerCard key={w.id} worker={w} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-divider bg-surface p-4 text-sm text-muted">
          No ustads available right now — try again later.
        </p>
      )}

      {variant === "landing" && (
        <Link
          href={ctaHref}
          className="btn-primary block w-full !rounded-xl !py-2.5 text-center text-sm"
        >
          Set price &amp; find workers
        </Link>
      )}

      {/* Technician request modal — landing path keeps the modal inline; dashboard handles it inside MatchResults */}
      <AnimatePresence mode="wait">
        {variant === "landing" && selectedWorker && (
          <TechnicianRequestModal
            key={selectedWorker.id}
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
      </AnimatePresence>
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
      <motion.button
        type="button"
        aria-label={recording ? "Stop recording" : "Hold to speak"}
        onPointerDown={() => void startRecording()}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onKeyDown={handleVoiceKey}
        whileTap={{ scale: 0.95 }}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={`flex h-28 w-28 items-center justify-center rounded-full text-5xl transition-transform select-none active:scale-95 ${
          recording
            ? "bg-warning text-bg shadow-lg shadow-warning/40"
            : "bg-accent text-bg shadow-xl shadow-accent/30 hover:bg-accent/90"
        }`}
      >
        🎙️
      </motion.button>
      <p
        className={`mt-4 text-sm font-medium ${
          "text-muted"
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
        <div className="mt-5 w-full space-y-2 rounded-xl border border-warning bg-warning/10 p-4 text-left">
          <p className="text-sm font-medium text-text">
            {result.clarification_question}
          </p>
          {result.clarification_options && result.clarification_options.length > 0 && (
            <div className="space-y-2">
              {result.clarification_options.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-warning/40 bg-surface px-3 py-2 text-sm text-text"
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
                    className="h-4 w-4 accent-accent"
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
            className="w-full rounded-lg border border-divider bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
          <motion.button
            type="button"
            onClick={() =>
              void run({
                clarification: [...clarificationSelections, clarificationAnswer.trim()]
                  .filter(Boolean)
                  .join(", "),
              })
            }
            disabled={busy || (!clarificationAnswer.trim() && clarificationSelections.length === 0)}
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-bg hover:bg-accent/90 disabled:opacity-50"
          >
            Continue
          </motion.button>
        </div>
      )}

      {/* Processing */}
      {status === "processing" && (
        <p
          className={`mt-5 flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
            variant === "dashboard"
              ? "bg-surface text-muted"
              : "bg-surface text-muted"
          }`}
        >
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-warning border-t-transparent" />
          Transcribing &amp; analyzing…
        </p>
      )}

      {/* Error */}
      {status === "error" && error && (
        <div className="mt-5 w-full space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-4 text-left">
          <p className="text-sm text-warning">{error}</p>
          <motion.button
            type="button"
            onClick={reset}
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="rounded-lg bg-warning px-3 py-1.5 text-xs font-semibold text-bg hover:bg-warning/90"
          >
            Try again
          </motion.button>
        </div>
      )}

      {/* Result */}
      {status === "done" && result && (
        <div className="mt-6 w-full">
          <ResultPanel data={result} variant={variant} location={customerLocation} />
          <motion.button
            type="button"
            onClick={reset}
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`mt-3 w-full rounded-lg border py-2 text-sm font-semibold transition ${
              variant === "dashboard"
                ? "border-divider text-muted hover:bg-surface"
                : "border-divider text-muted hover:bg-surface"
            }`}
          >
            New request
          </motion.button>
        </div>
      )}
    </div>
  );
}
