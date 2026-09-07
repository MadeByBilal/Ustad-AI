"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { parseApiResponse } from "@/client/lib/api-client";
import type { AiUnderstandResult } from "@contracts/ai";
import type { WorkerOption, WorkerCategory } from "@contracts/worker";
import type { UrgencyLevel } from "@contracts/job";
import TechnicianRequestModal from "./TechnicianRequestModal";
import TextType from "./TextType";
import { Star, AlertTriangle, Mic } from "lucide-react";
import MicVisualizer from "./MicVisualizer";

export interface UnderstandResponse extends AiUnderstandResult {
  transcript?: string;
  workers: {
    best: WorkerOption | null;
    others: WorkerOption[];
    ranked?: WorkerOption[];
  };
}

type Status = "idle" | "recording" | "processing" | "done" | "error";

type Coordinates = { lat: number; lng: number };
type RunBody = FormData | { clarification?: string; text?: string };
type LocationFailureReason =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout";

type RecordingSession = {
  recorder: MediaRecorder;
  stream: MediaStream;
  generation: number;
  cancelled: boolean;
  cleanup: () => void;
};

const SUPPORTED_AUDIO_MIME_TYPES = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
] as const;
const ANALYSIS_TIMEOUT_MS = 60_000;
const LEVEL_SAMPLE_INTERVAL_MS = 100;
const MIN_AUDIO_BYTES = 1_000;
const MIN_AVERAGE_RMS = 0.012;
const MIN_PEAK_RMS = 0.035;
const MIN_ACTIVE_SAMPLE_RATIO = 0.05;

function getSupportedAudioMimeType(): string | null {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  ) {
    return null;
  }

  return (
    SUPPORTED_AUDIO_MIME_TYPES.find((mimeType) => {
      try {
        return MediaRecorder.isTypeSupported(mimeType);
      } catch {
        return false;
      }
    }) ?? null
  );
}

function audioFileExtension(mimeType: string): "mp4" | "webm" {
  return mimeType.toLowerCase().includes("mp4") ? "mp4" : "webm";
}

function locationFailureMessage(reason: LocationFailureReason): string {
  switch (reason) {
    case "denied":
      return "Location access is blocked. Allow it in your browser settings for nearby matches.";
    case "timeout":
      return "We could not get your location in time. Try again for nearby matches.";
    case "unsupported":
      return "This browser cannot provide your location. You can continue without distance matching.";
    default:
      return "We could not get your location. Try again for nearby matches.";
  }
}

export interface VoiceCaptureProps {
  /** Visual context. Both variants use the shared dark surface palette. */
  variant?: "landing" | "dashboard";
  /** Callback to notify parent when status changes */
  onStatusChange?: (status: Status) => void;
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
  index = 0,
}: {
  worker: WorkerOption;
  highlight?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 24,
        mass: 0.8,
        delay: index * 0.1,
      }}
      className={highlight ? "glass-card p-4" : "glass-card p-4"}
      style={{
        border: highlight ? "1px solid rgba(38,166,80,0.5)" : undefined,
        boxShadow: highlight ? "0 8px 24px rgba(38,166,80,0.1)" : undefined,
      }}
    >
      {highlight && (
        <span
          className="badge mb-2"
          style={{ background: "#26A650", color: "#08240F" }}
        >
          Best match
        </span>
      )}
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04]">
          <span className="font-display font-semibold text-lg text-[#F1F4F1]">
            {worker.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-semibold text-lg text-[#F1F4F1]">{worker.name}</p>
          <p className="text-sm text-[#93A396]">
            {CATEGORY_LABELS[worker.category] ?? worker.category} ·{" "}
            <Star className="h-3.5 w-3.5 inline" style={{ color: "#D4A24C" }} />{" "}
            <span className="font-mono">
              {worker.average_rating.toFixed(1)}
            </span>{" "}
            · {worker.completed_jobs} jobs ·{" "}
            {worker.verified ? "verified" : "unverified"}
          </p>
        </div>
        <span
          className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold"
          style={{ background: "#26A650", color: "#08240F" }}
        >
          {worker.ustad_score}
        </span>
      </div>
      {worker.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {worker.skills.slice(0, 4).map((s) => (
            <span
              key={s}
              className="rounded-lg px-2 py-0.5 text-xs text-[#93A396]"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {(worker.distance_km != null || worker.predicted_price != null) && (
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-[#93A396]">
          {worker.distance_km != null && (
            <span
              className="font-mono rounded-lg px-2 py-0.5"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              {worker.distance_km < 1
                ? `${Math.round(worker.distance_km * 1000)} m away`
                : `${worker.distance_km.toFixed(1)} km away`}
            </span>
          )}
          {worker.predicted_price != null && (
            <span
              className="font-mono rounded-lg px-2 py-0.5"
              style={{ background: "rgba(212,162,74,0.16)", color: "#D4A24C" }}
            >
              Est. PKR {worker.predicted_price.toLocaleString("en-PK")}
            </span>
          )}
          {worker.travel_cost_pkr != null && worker.travel_cost_pkr > 0 && (
            <span
              className="font-mono rounded-lg px-2 py-0.5"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              Travel PKR {worker.travel_cost_pkr.toLocaleString("en-PK")}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ResultPanel({
  data,
  location,
}: {
  data: UnderstandResponse;
  location?: Coordinates | null;
}) {
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
  const ctaHref = `/login?next=${encodeURIComponent(`/new-work?${nextParams.toString()}`)}`;

  // Landing-only modal state.
  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(
    null,
  );
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3"
    >
      <div className="glass-card p-4 text-left">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="font-semibold text-[#F1F4F1]">
            {u.category
              ? (CATEGORY_LABELS[u.category] ?? u.category)
              : "Not sure yet"}
          </span>
          <span
            className="rounded-lg px-2 py-0.5 text-xs text-[#93A396]"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {URGENCY_LABELS[u.urgency] ?? u.urgency}
          </span>
          {u.confidence > 0 && (
            <span className="text-xs text-[#93A396]">
              {Math.round(u.confidence * 100)}% confident
            </span>
          )}
        </div>
        {u.description && (
          <p className="mt-2 text-sm text-[#F1F4F1]">
            &ldquo;{u.description}&rdquo;
          </p>
        )}
        {u.required_skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {u.required_skills.map((s) => (
              <span
                key={s}
                className="rounded-lg px-2 py-0.5 text-sm text-[#93A396]"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                {s}
              </span>
            ))}
          </div>
        )}
        {u.safety_flags.length > 0 && (
          <p
            className="mt-2 text-xs font-semibold"
            style={{ color: "#E0A461" }}
          >
            <AlertTriangle className="h-3.5 w-3.5 inline" />{" "}
            {u.safety_flags.join(", ")}
          </p>
        )}
      </div>

      {data.transcript && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="flex items-start gap-3 rounded-2xl p-3 text-left"
          style={{
            background: "rgba(38,166,80,0.08)",
            border: "1px solid rgba(38,166,80,0.2)",
          }}
        >
          <Mic
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: "#26A650" }}
          />
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "#26A650" }}
            >
              You said
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#F1F4F1]">
              {data.transcript}
            </p>
          </div>
        </motion.div>
      )}

      {u.category && (
        <div
          className="rounded-2xl p-4 text-left"
          style={{
            background: "rgba(212,162,74,0.1)",
            border: "1px solid rgba(212,162,74,0.3)",
            borderLeft: "4px solid #D4A24C",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "#D4A24C" }}
          >
            Price — set automatically
          </p>
          <p className="mt-1 text-2xl font-bold text-[#F1F4F1]">
            {currency(u.inspection_fee)} visit fee · then{" "}
            {u.estimate_min > 0
              ? `${currency(u.estimate_min)} – ${currency(u.estimate_max)}`
              : "after checking"}
          </p>
          <p className="mt-1 text-xs" style={{ color: "rgba(212,162,74,0.8)" }}>
            آپ پہلے صرف معائنہ فیس دیتے ہیں — اصل مرمت کی قیمت اُستاد کے معائنے
            کے بعد طے ہوگی۔
          </p>
          {u.complexity && (
            <p
              className="mt-1 text-xs"
              style={{ color: "rgba(212,162,74,0.8)" }}
            >
              Complexity: {u.complexity}
            </p>
          )}
        </div>
      )}

      {submittedJobId && (
        <div
          className="rounded-2xl p-4 text-center"
          style={{
            background: "rgba(38,166,80,0.15)",
            border: "1px solid rgba(38,166,80,0.4)",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: "#26A650" }}>
            Request sent! Waiting for the technician to respond.
          </p>
        </div>
      )}

      {anyWorker ? (
        <div className="space-y-2 text-left">
          {data.workers.best && (
            <WorkerCard worker={data.workers.best} highlight index={0} />
          )}
          {data.workers.others.slice(0, 2).map((w, i) => (
            <WorkerCard key={w.id} worker={w} index={i + 1} />
          ))}
        </div>
      ) : (
        <p className="glass-card p-4 text-sm text-[#93A396]">
          No ustads available right now — try again later.
        </p>
      )}

      <Link
        href={ctaHref}
        className="block w-full rounded-xl py-2.5 text-center text-sm font-bold transition-all duration-200"
        style={{
          background: "#26A650",
          color: "#08240F",
          boxShadow: "0 4px 16px rgba(38,166,80,0.3)",
        }}
      >
        Set price &amp; find workers
      </Link>

      <AnimatePresence mode="wait">
        {selectedWorker && (
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
    </motion.div>
  );
}

export default function VoiceCapture({
  variant = "landing",
  onStatusChange,
}: VoiceCaptureProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UnderstandResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<Coordinates | null>(
    null,
  );
  const [locationFailure, setLocationFailure] =
    useState<LocationFailureReason | null>(null);
  const [locationPending, setLocationPending] = useState(false);

  const recorderRef = useRef<RecordingSession | null>(null);
  const startInFlightRef = useRef(false);
  const recordingGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);
  const pendingBodyRef = useRef<RunBody | null>(null);
  const locationRef = useRef<Coordinates | null>(null);
  const locationDecisionRef = useRef<
    "unresolved" | "pending" | "available" | "unavailable" | "without"
  >("unresolved");
  const locationRequestIdRef = useRef(0);
  const locationPromiseRef = useRef<Promise<Coordinates | null> | null>(null);
  const reduceMotion = useReducedMotion();

  const derivedStatus: Status = recording ? "recording" : status;

  useEffect(() => {
    onStatusChange?.(derivedStatus);
  }, [derivedStatus, onStatusChange]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      requestAbortRef.current?.abort();
      requestAbortRef.current = null;
      recordingGenerationRef.current += 1;
      locationRequestIdRef.current += 1;

      const session = recorderRef.current;
      if (!session) return;

      session.cancelled = true;
      if (session.recorder.state === "recording") {
        try {
          session.recorder.stop();
        } catch {
          // Cleanup below still releases the stream if the recorder is already inactive.
        }
      }
      session.cleanup();
    };
  }, []);

  const voiceSupported = useCallback(() => {
    return (
      typeof window !== "undefined" &&
      "MediaRecorder" in window &&
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function"
    );
  }, []);

  const getLocation = useCallback((): Promise<Coordinates | null> => {
    if (locationDecisionRef.current !== "unresolved") {
      return locationPromiseRef.current ?? Promise.resolve(locationRef.current);
    }

    const requestId = locationRequestIdRef.current + 1;
    locationRequestIdRef.current = requestId;

    const markUnavailable = (reason: LocationFailureReason) => {
      if (!mountedRef.current || requestId !== locationRequestIdRef.current) {
        return;
      }
      locationDecisionRef.current = "unavailable";
      locationRef.current = null;
      setLocationFailure(reason);
    };

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      markUnavailable("unsupported");
      return Promise.resolve(null);
    }

    locationDecisionRef.current = "pending";
    setLocationPending(true);

    const promise = new Promise<Coordinates | null>((resolve) => {
      let settled = false;

      const resolveLocation = (location: Coordinates | null) => {
        if (settled) return;
        settled = true;

        if (!mountedRef.current || requestId !== locationRequestIdRef.current) {
          resolve(null);
          return;
        }

        locationRef.current = location;
        locationDecisionRef.current = location ? "available" : "unavailable";
        if (location) setLocationFailure(null);
        resolve(location);
      };

      const rejectLocation = (positionError: GeolocationPositionError) => {
        const reason =
          positionError.code === 1
            ? "denied"
            : positionError.code === 3
              ? "timeout"
              : "unavailable";
        markUnavailable(reason);
        resolveLocation(null);
      };

      try {
        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolveLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }),
          rejectLocation,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
        );
      } catch {
        markUnavailable("unavailable");
        resolveLocation(null);
      }
    }).finally(() => {
      if (mountedRef.current && requestId === locationRequestIdRef.current) {
        setLocationPending(false);
        locationPromiseRef.current = null;
      }
    });

    locationPromiseRef.current = promise;
    return promise;
  }, []);

  const run = useCallback(
    async (rawBody: RunBody, options: { skipLocation?: boolean } = {}) => {
      if (!mountedRef.current) return;

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      requestAbortRef.current?.abort();

      const controller = new AbortController();
      requestAbortRef.current = controller;
      pendingBodyRef.current = rawBody;
      setError("");
      setBusy(true);
      setStatus("processing");
      setResult(null);

      const isCurrentRequest = () =>
        mountedRef.current && requestId === requestIdRef.current;

      let body: RunBody = rawBody;

      let timeoutId: number | undefined;
      let timedOut = false;

      try {
        let location = locationRef.current;
        if (
          !options.skipLocation &&
          (locationDecisionRef.current === "unresolved" ||
            locationDecisionRef.current === "pending")
        ) {
          location = await getLocation();
        }

        if (!isCurrentRequest()) return;

        if (
          !options.skipLocation &&
          !location &&
          locationDecisionRef.current === "unavailable"
        ) {
          setLocationFailure((prev) => prev ?? "unavailable");
        }

        setCustomerLocation(location);

        let data: UnderstandResponse;
        {
          const requestInit: RequestInit = {
            method: "POST",
            signal: controller.signal,
          };

          if (body instanceof FormData) {
            if (location) {
              body.set("lat", String(location.lat));
              body.set("lng", String(location.lng));
            } else {
              body.delete("lat");
              body.delete("lng");
            }
            requestInit.body = body;
          } else {
            requestInit.headers = { "Content-Type": "application/json" };
            requestInit.body = JSON.stringify({
              ...body,
              ...(location ? { lat: location.lat, lng: location.lng } : {}),
            });
          }

          console.log(
            "[run] Starting API call to /api/ai/understand. Type:",
            body instanceof FormData ? "FormData(audio)" : "JSON",
          );
          data = await Promise.race([
            fetch("/api/ai/understand", requestInit).then((response) => {
              console.log("[run] API response status:", response.status);
              return parseApiResponse<UnderstandResponse>(response);
            }),
            new Promise<UnderstandResponse>((_, reject) => {
              timeoutId = window.setTimeout(() => {
                timedOut = true;
                controller.abort();
                reject(new Error("Understanding request timed out"));
              }, ANALYSIS_TIMEOUT_MS);
            }),
          ]);
        }

        if (!isCurrentRequest()) return;

        console.log(
          "[run] Response received. Source:",
          data.source,
          "Transcript:",
          data.transcript?.substring(0, 80),
          "Workers:",
          data.workers?.best?.name ?? "none",
        );
        setResult(data);
        setStatus("done");
        try {
          sessionStorage.setItem(
            "voiceResult",
            JSON.stringify({ data, location }),
          );
        } catch {
          // sessionStorage full or unavailable
        }
        if (variant === "dashboard") {
          router.push("/dashboard/customer/result");
        }
        pendingBodyRef.current = null;
      } catch (err) {
        console.error("[mic] startRecording failed:", err);
        console.error("[run] API call failed:", err);
        if (!isCurrentRequest()) return;
        if (timedOut) {
          setStatus("error");
          setError(
            "Understanding timed out. Please check your connection and try again.",
          );
          return;
        }
        if (
          controller.signal.aborted ||
          (err instanceof Error && err.name === "AbortError")
        ) {
          return;
        }
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        );
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        if (requestAbortRef.current === controller) {
          requestAbortRef.current = null;
        }
        if (isCurrentRequest()) setBusy(false);
      }
    },
    [getLocation],
  );

  // Request location immediately when entering the dashboard
  useEffect(() => {
    if (
      variant === "dashboard" &&
      locationDecisionRef.current === "unresolved"
    ) {
      void getLocation();
    }
  }, [variant, getLocation]);

  const startRecording = useCallback(async () => {
    if (
      !mountedRef.current ||
      recorderRef.current ||
      startInFlightRef.current ||
      busy
    ) {
      return;
    }

    startInFlightRef.current = true;
    const generation = recordingGenerationRef.current + 1;
    recordingGenerationRef.current = generation;
    setStarting(true);
    setMicLevel(0);
    setError("");

    // ─── REAL: Audio recording via MediaRecorder ────────────────────────────
    if (!voiceSupported()) {
      setStatus("error");
      setError(
        "Voice recording is not supported in this browser. Try Chrome on a phone or laptop.",
      );
      startInFlightRef.current = false;
      return;
    }

    let stream: MediaStream | null = null;
    try {
      if (!mountedRef.current || recordingGenerationRef.current !== generation)
        return;

      // Request location upfront so it's ready by the time recording stops.
      if (locationDecisionRef.current === "unresolved") {
        void getLocation();
      }

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!mountedRef.current || recordingGenerationRef.current !== generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType ?? undefined,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      // Set up AudioContext + AnalyserNode for mic level visualization
      let animFrame: number | null = null;
      let analyser: AnalyserNode | null = null;
      let dataArray: Uint8Array<ArrayBuffer> | null = null;

      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          if (
            !mountedRef.current ||
            recordingGenerationRef.current !== generation
          ) {
            return;
          }
          analyser!.getByteFrequencyData(dataArray!);
          let sum = 0;
          for (let i = 0; i < dataArray!.length; i++) sum += dataArray![i];
          const avg = sum / dataArray!.length / 255;
          setMicLevel(avg);
          animFrame = requestAnimationFrame(updateLevel);
        };
        animFrame = requestAnimationFrame(updateLevel);
      } catch {
        // AudioContext not available — recording still works, just no visualizer
      }

      const cleanup = () => {
        if (animFrame !== null) cancelAnimationFrame(animFrame);
        stream?.getTracks().forEach((t) => t.stop());
      };

      const session: RecordingSession = {
        recorder,
        stream,
        generation,
        cancelled: false,
        cleanup,
      };

      recorder.onstop = () => {
        if (session.cancelled) {
          cleanup();
          return;
        }

        const ext = mimeType ? audioFileExtension(mimeType) : "webm";
        const blob = new Blob(chunks, {
          type: mimeType ?? "audio/webm",
        });

        if (blob.size < MIN_AUDIO_BYTES) {
          if (mountedRef.current && generation === recordingGenerationRef.current) {
            setStatus("error");
            setError(
              "Recording was too short or silent. Hold the button longer and speak clearly.",
            );
          }
          cleanup();
          return;
        }

        const file = new File([blob], `recording.${ext}`, {
          type: mimeType ?? "audio/webm",
        });
        const formData = new FormData();
        formData.append("audio", file);

        if (mountedRef.current && generation === recordingGenerationRef.current) {
          setMicLevel(0);
        }

        void run(formData);
        cleanup();
      };

      recorderRef.current = session;
      recorder.start(250); // collect data every 250ms

      setRecording(true);
      setStarting(false);
      console.log("[mic] Recording started. MIME:", mimeType);
    } catch (err) {
      stream?.getTracks().forEach((t) => t.stop());
      if (mountedRef.current && generation === recordingGenerationRef.current) {
        setRecording(false);
        setStatus("error");
        if (
          err instanceof DOMException &&
          err.name === "NotAllowedError"
        ) {
          setError(
            "Microphone access denied. Please allow microphone access in your browser settings and try again.",
          );
        } else if (
          err instanceof DOMException &&
          err.name === "NotFoundError"
        ) {
          setError(
            "No microphone found. Please connect a microphone and try again.",
          );
        } else {
          setError("Something went wrong. Please try again.");
        }
      }
    } finally {
      startInFlightRef.current = false;
    }
  }, [busy, getLocation]);

  const stopRecording = useCallback(() => {
    const session = recorderRef.current;
    if (!session || session.recorder.state !== "recording") return;

    try {
      session.recorder.stop();
    } catch {
      // The onerror/onstop handler will still fire and clean up.
    }

    if (mountedRef.current) {
      setRecording(false);
    }
  }, []);

  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMicPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (recording || starting || busy) return;
      if (buttonRef.current) {
        buttonRef.current.setPointerCapture(e.pointerId);
      }
      void startRecording();
    },
    [busy, recording, startRecording, starting],
  );

  const handleMicLostPointerCapture = useCallback(() => {
    if (recording) {
      stopRecording();
    }
  }, [recording, stopRecording]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    recordingGenerationRef.current += 1;
    locationRequestIdRef.current += 1;
    locationPromiseRef.current = null;

    const session = recorderRef.current;
    if (session) {
      session.cancelled = true;
      if (session.recorder.state === "recording") {
        try {
          session.recorder.stop();
        } catch {
          // Cleanup below still releases the microphone.
        }
      }
      session.cleanup();
    }

    pendingBodyRef.current = null;
    locationRef.current = null;
    locationDecisionRef.current = "unresolved";
    setStatus("idle");
    setError("");
    setResult(null);
    setCustomerLocation(null);
    setLocationFailure(null);
    setLocationPending(false);
    setMicLevel(0);
    setRecording(false);
    setStarting(false);
    setBusy(false);
  }, []);

  const isCentered = recording || status === "processing";

  return (
    <div className="flex w-full max-w-md flex-col items-center">
      {/* Animated layout wrapper */}
      <motion.div
        className="flex w-full flex-col items-center"
        animate={{
          y: isCentered ? -20 : 0,
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Mic button with circular visualizer */}
        <motion.div
          className="relative flex items-center justify-center"
          animate={{
            scale: isCentered ? 1.15 : 1,
          }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <MicVisualizer micLevel={micLevel} active={recording} />

          <motion.button
            ref={buttonRef}
            type="button"
            aria-label={
              starting
                ? "Starting recording"
                : recording
                  ? "Release to stop recording"
                  : "Hold to start recording"
            }
            aria-pressed={recording}
            disabled={busy || starting}
            onPointerDown={handleMicPointerDown}
            onLostPointerCapture={handleMicLostPointerCapture}
            onContextMenu={(e) => e.preventDefault()}
            animate={{
              scale: recording && !reduceMotion ? 1 + micLevel * 0.08 : 1,
            }}
            whileHover={{ y: reduceMotion ? 0 : -1 }}
            transition={{
              scale: { type: "spring", stiffness: 420, damping: 30 },
            }}
            className={`mic-btn relative flex h-28 w-28 items-center justify-center overflow-visible rounded-full text-5xl select-none disabled:cursor-not-allowed disabled:opacity-70 ${
              recording
                ? "text-[#08240F]"
                : status === "processing"
                  ? "text-[#08240F]"
                  : "text-[#08240F]"
            }`}
            style={{
              touchAction: "none",
              background: recording
                ? "#E0A461"
                : status === "processing"
                  ? "rgba(38,166,80,0.6)"
                  : "#26A650",
              boxShadow: recording
                ? "0 8px 32px rgba(224,164,97,0.4)"
                : status === "processing"
                  ? "0 8px 32px rgba(38,166,80,0.2)"
                  : "0 8px 32px rgba(38,166,80,0.3)",
            }}
          >
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-3 rounded-full bg-warning/30 blur-md"
              animate={{
                opacity: recording ? 0.15 + micLevel * 0.65 : 0,
                scale: recording && !reduceMotion ? 0.95 + micLevel * 0.3 : 0.9,
              }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            />
            <Mic className="relative z-10 h-10 w-10" />
          </motion.button>
        </motion.div>

        {/* Status text — only show when idle or starting */}
        <AnimatePresence mode="wait">
          {!recording && status === "idle" && (
            <motion.p
              key="hold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mt-4 text-sm font-medium text-[#93A396]"
              aria-live="polite"
            >
              {starting ? "Starting recording…" : "Hold to speak"}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recording status — flows up when recording */}
      <AnimatePresence>
        {recording && (
          <motion.div
            key="recording-status"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mt-16 flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warning" />
              </span>
              <p className="text-sm font-medium text-warning">Listening…</p>
            </div>
            <p className="text-xs text-muted">Release to stop</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location failure */}
      {locationFailure && status === "done" && (
        <div
          className="mt-4 w-full space-y-2 rounded-2xl p-3 text-left"
          style={{
            background: "rgba(224,164,97,0.1)",
            border: "1px solid rgba(224,164,97,0.3)",
          }}
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-semibold" style={{ color: "#E0A461" }}>
            Location unavailable. These matches are not distance-aware.
          </p>
          <p className="text-xs" style={{ color: "rgba(224,164,97,0.8)" }}>
            {locationFailureMessage(locationFailure)}
          </p>
        </div>
      )}

      {/* Processing overlay — animated text in center */}
      <AnimatePresence>
        {status === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -30 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 w-2 rounded-full"
                  style={{ background: "#26A650" }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <TextType
              text={[
                "Ustad is understanding your problem…",
                "Finding nearest workers…",
                "Analyzing your requirements…",
                "Almost ready…",
              ]}
              typingSpeed={40}
              pauseDuration={1500}
              deletingSpeed={25}
              loop={true}
              showCursor={true}
              cursorCharacter="|"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {status === "error" && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="mt-5 w-full space-y-2 rounded-2xl p-4 text-left"
            style={{
              background: "rgba(224,164,97,0.1)",
              border: "1px solid rgba(224,164,97,0.3)",
            }}
          >
            <p className="text-sm" style={{ color: "#E0A461" }}>
              {error}
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200"
              style={{ background: "#E0A461", color: "#0B0F0C" }}
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result — only shown for landing variant; dashboard navigates to result page */}
      <AnimatePresence>
        {status === "done" && result && variant !== "dashboard" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.98 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 22,
              mass: 0.9,
            }}
            className="mt-6 w-full"
          >
            <ResultPanel data={result} location={customerLocation} />
            <motion.button
              type="button"
              onClick={reset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              className="mt-3 w-full rounded-xl py-2 text-sm font-semibold text-[#93A396] transition-all duration-200 hover:text-[#F1F4F1]"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              New request
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
