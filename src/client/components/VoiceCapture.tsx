"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { parseApiResponse } from "@/client/lib/api-client";
import type { AiUnderstandResult } from "@/server/lib/job/ai";
import type { WorkerOption } from "@/server/lib/matching";
import type { WorkerCategory, UrgencyLevel } from "@/server/models";
import TechnicianRequestModal from "./TechnicianRequestModal";
import TextType from "./TextType";
import { Star, AlertTriangle, Mic } from "lucide-react";

export interface UnderstandResponse extends AiUnderstandResult {
  transcript?: string;
  workers: { best: WorkerOption | null; others: WorkerOption[]; ranked?: WorkerOption[] };
}

type Status = "idle" | "processing" | "clarifying" | "done" | "error";

type Coordinates = { lat: number; lng: number };
type RunBody = FormData | { clarification?: string };
type LocationFailureReason = "unsupported" | "denied" | "unavailable" | "timeout";

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
const ANALYSIS_TIMEOUT_MS = 18_000;
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
            {CATEGORY_LABELS[worker.category] ?? worker.category} · <Star className="h-3.5 w-3.5 text-warning inline" />{" "}
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

function ResultPanel({ data, location }: { data: UnderstandResponse; location?: Coordinates | null }) {
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
  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(null);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);

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
            <AlertTriangle className="h-3.5 w-3.5 inline" /> {u.safety_flags.join(", ")}
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

      <Link
        href={ctaHref}
        className="btn-primary block w-full !rounded-xl !py-2.5 text-center text-sm"
      >
        Set price &amp; find workers
      </Link>

      {/* Technician request modal */}
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
    </div>
  );
}

export default function VoiceCapture({ variant = "landing" }: VoiceCaptureProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UnderstandResponse | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [clarificationSelections, setClarificationSelections] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<Coordinates | null>(null);
  const [locationFailure, setLocationFailure] = useState<LocationFailureReason | null>(null);
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
      if (
        !mountedRef.current ||
        requestId !== locationRequestIdRef.current
      ) {
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

        if (
          !mountedRef.current ||
          requestId !== locationRequestIdRef.current
        ) {
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
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
        );
      } catch {
        markUnavailable("unavailable");
        resolveLocation(null);
      }
    }).finally(() => {
      if (
        mountedRef.current &&
        requestId === locationRequestIdRef.current
      ) {
        setLocationPending(false);
        locationPromiseRef.current = null;
      }
    });

    locationPromiseRef.current = promise;
    return promise;
  }, []);

  const run = useCallback(
    async (body: RunBody, options: { skipLocation?: boolean } = {}) => {
      if (!mountedRef.current) return;

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      requestAbortRef.current?.abort();

      const controller = new AbortController();
      requestAbortRef.current = controller;
      pendingBodyRef.current = body;
      setError("");
      setBusy(true);
      setStatus("processing");
      setResult(null);

      const isCurrentRequest = () =>
        mountedRef.current && requestId === requestIdRef.current;

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

        const data = await Promise.race([
          fetch("/api/ai/understand", requestInit).then((response) =>
            parseApiResponse<UnderstandResponse>(response)
          ),
          new Promise<UnderstandResponse>((_, reject) => {
            timeoutId = window.setTimeout(() => {
              timedOut = true;
              controller.abort();
              reject(new Error("Understanding request timed out"));
            }, ANALYSIS_TIMEOUT_MS);
          }),
        ]);

        if (!isCurrentRequest()) return;

        setResult(data);
        setClarificationSelections([]);
        if (data.clarification_question || data.manual_fallback) {
          setStatus("clarifying");
        } else {
          setStatus("done");
          try {
            sessionStorage.setItem(
              "voiceResult",
              JSON.stringify({ data, location: customerLocation })
            );
          } catch {
            // sessionStorage full or unavailable
          }
          if (variant === "dashboard") {
            router.push("/dashboard/customer/result");
          }
        }
        pendingBodyRef.current = null;
      } catch (err) {
        if (!isCurrentRequest()) return;
        if (timedOut) {
          setStatus("error");
          setError("Understanding timed out. Please check your connection and try again.");
          return;
        }
        if (controller.signal.aborted || (err instanceof Error && err.name === "AbortError")) {
          return;
        }
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        );
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        if (requestAbortRef.current === controller) {
          requestAbortRef.current = null;
        }
        if (isCurrentRequest()) setBusy(false);
      }
    },
    [getLocation]
  );

  const startRecording = useCallback(async () => {
    if (
      !mountedRef.current ||
      recorderRef.current ||
      startInFlightRef.current ||
      busy
    ) {
      return;
    }

    if (!voiceSupported()) {
      setStatus("error");
      setError(
        "Voice recording is not supported in this browser. Try Chrome on a phone or laptop."
      );
      return;
    }

    startInFlightRef.current = true;
    const generation = recordingGenerationRef.current + 1;
    recordingGenerationRef.current = generation;
    setStarting(true);
    setMicLevel(0);
    setError("");

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (
        !mountedRef.current ||
        generation !== recordingGenerationRef.current
      ) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      // Request location upfront so it's ready by the time recording stops.
      // Fire-and-forget: if it fails, run() will handle it gracefully.
      if (locationDecisionRef.current === "unresolved") {
        void getLocation();
      }

      const mimeType = getSupportedAudioMimeType();
      if (!mimeType) {
        throw new Error(
          "Audio recording is not supported in this browser. Try Chrome or Safari on a newer device."
        );
      }

      const activeStream = stream;
      const recorder = new MediaRecorder(activeStream, { mimeType });
      const actualMimeType = recorder.mimeType || mimeType;
      const chunks: Blob[] = [];

      let audioCtx: AudioContext | null = null;
      let source: MediaStreamAudioSourceNode | null = null;
      let analyser: AnalyserNode | null = null;
      let levelInterval: number | undefined;
      let levelSum = 0;
      let levelSamples = 0;
      let peakLevel = 0;
      let activeSamples = 0;
      let cleanedUp = false;
      let finalized = false;
      let session: RecordingSession | null = null;

      const stopLevelMonitor = () => {
        if (levelInterval !== undefined) {
          window.clearInterval(levelInterval);
          levelInterval = undefined;
        }
        source?.disconnect();
        analyser?.disconnect();
        source = null;
        analyser = null;

        const context = audioCtx;
        audioCtx = null;
        if (context && context.state !== "closed") {
          void context.close().catch(() => undefined);
        }
      };

      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        stopLevelMonitor();
        activeStream.getTracks().forEach((track) => track.stop());
        if (recorderRef.current?.generation === generation) {
          recorderRef.current = null;
        }
        if (
          mountedRef.current &&
          recordingGenerationRef.current === generation
        ) {
          setMicLevel(0);
        }
      };

      session = {
        recorder,
        stream: activeStream,
        generation,
        cancelled: false,
        cleanup,
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        if (finalized) return;
        finalized = true;
        const wasCancelled = session?.cancelled ?? false;
        const blob = new Blob(chunks, { type: actualMimeType });

        cleanup();
        if (
          mountedRef.current &&
          recordingGenerationRef.current === generation
        ) {
          setRecording(false);
        }
        chunks.length = 0;

        if (
          wasCancelled ||
          !mountedRef.current ||
          recordingGenerationRef.current !== generation
        ) {
          return;
        }

        const averageLevel = levelSamples > 0 ? levelSum / levelSamples : null;
        const activeRatio = levelSamples > 0 ? activeSamples / levelSamples : 1;
        const isSilent =
          averageLevel !== null &&
          averageLevel < MIN_AVERAGE_RMS &&
          (peakLevel < MIN_PEAK_RMS || activeRatio < MIN_ACTIVE_SAMPLE_RATIO);

        if (blob.size < MIN_AUDIO_BYTES || isSilent) {
          setStatus("error");
          setError("Didn't catch that - hold and speak again.");
          return;
        }

        const formData = new FormData();
        formData.append(
          "audio",
          blob,
          `voice.${audioFileExtension(actualMimeType)}`
        );
        void run(formData);
      };

      recorder.onerror = () => {
        if (finalized) return;
        finalized = true;
        if (session) session.cancelled = true;
        cleanup();
        chunks.length = 0;
        if (
          mountedRef.current &&
          recordingGenerationRef.current === generation
        ) {
          setRecording(false);
          setStatus("error");
          setError("Recording failed unexpectedly. Please try again.");
        }
      };

      recorderRef.current = session;
      recorder.start();
      setRecording(true);

      try {
        const audioContextWindow = window as Window & {
          webkitAudioContext?: typeof AudioContext;
        };
        const AudioContextConstructor =
          window.AudioContext ?? audioContextWindow.webkitAudioContext;

        if (AudioContextConstructor) {
          audioCtx = new AudioContextConstructor();
          if (audioCtx.state === "suspended") {
            void audioCtx.resume().catch(() => undefined);
          }
          source = audioCtx.createMediaStreamSource(activeStream);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const levelData = new Uint8Array(analyser.fftSize);

          levelInterval = window.setInterval(() => {
            if (!analyser || finalized) return;
            analyser.getByteTimeDomainData(levelData);

            let sumSquares = 0;
            for (let index = 0; index < levelData.length; index += 1) {
              const sample = levelData[index];
              const normalized = (sample - 128) / 128;
              sumSquares += normalized * normalized;
            }
            const level = Math.min(
              1,
              Math.sqrt(sumSquares / levelData.length)
            );
            levelSum += level;
            levelSamples += 1;
            peakLevel = Math.max(peakLevel, level);
            if (level >= MIN_PEAK_RMS) activeSamples += 1;

            if (
              mountedRef.current &&
              recordingGenerationRef.current === generation
            ) {
              setMicLevel((current) => current * 0.65 + level * 0.35);
            }
          }, LEVEL_SAMPLE_INTERVAL_MS);
        }
      } catch {
        stopLevelMonitor();
      }
    } catch (err) {
      const activeSession = recorderRef.current;
      if (activeSession?.generation === generation) {
        activeSession.cancelled = true;
        if (activeSession.recorder.state === "recording") {
          try {
            activeSession.recorder.stop();
          } catch {
            // The cleanup path below still releases the microphone.
          }
        }
        activeSession.cleanup();
      } else {
        stream?.getTracks().forEach((track) => track.stop());
      }

      if (
        mountedRef.current &&
        generation === recordingGenerationRef.current
      ) {
        setRecording(false);
        setStatus("error");
        if (err instanceof Error && err.message.startsWith("Audio recording")) {
          setError(err.message);
        } else if (err instanceof Error && err.name === "NotAllowedError") {
          setError("Microphone access is blocked. Please allow mic access and try again.");
        } else if (err instanceof Error && err.name === "NotFoundError") {
          setError("No microphone was found. Connect a microphone and try again.");
        } else {
          setError("Could not access your microphone. Please allow mic access and try again.");
        }
      }
    } finally {
      startInFlightRef.current = false;
      if (
        mountedRef.current &&
        generation === recordingGenerationRef.current
      ) {
        setStarting(false);
      }
    }
  }, [busy, run, voiceSupported]);

  const stopRecording = useCallback(() => {
    const session = recorderRef.current;
    if (!session || session.recorder.state !== "recording") return;

    try {
      session.recorder.stop();
    } catch {
      session.cancelled = true;
      session.cleanup();
      if (mountedRef.current) {
        setRecording(false);
        setStatus("error");
        setError("Recording could not be stopped. Please try again.");
      }
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
    setClarificationAnswer("");
    setClarificationSelections([]);
    setCustomerLocation(null);
    setLocationFailure(null);
    setLocationPending(false);
    setMicLevel(0);
    setRecording(false);
    setStarting(false);
    setBusy(false);
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col items-center">
      {/* Mic button */}
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
        style={{ touchAction: "none" }}
        animate={{
          scale: recording && !reduceMotion ? 1 + micLevel * 0.08 : 1,
        }}
        whileHover={{ y: reduceMotion ? 0 : -1 }}
        transition={{
          scale: { type: "spring", stiffness: 420, damping: 30 },
        }}
        className={`mic-btn relative flex h-28 w-28 items-center justify-center overflow-visible rounded-full text-5xl select-none disabled:cursor-not-allowed disabled:opacity-70 ${
          recording
            ? "bg-warning text-bg shadow-lg shadow-warning/40"
            : "bg-accent text-bg shadow-xl shadow-accent/30 hover:bg-accent/90"
        }`}
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
      <p className="mt-4 text-sm font-medium text-muted" aria-live="polite">
        {starting
          ? "Starting recording…"
          : recording
            ? "Listening… release to stop"
            : locationPending
              ? "Checking your location…"
              : status === "processing"
                ? "Understanding your problem…"
                : "Hold to speak"}
      </p>

      {locationFailure && status === "done" && (
        <div
          className="mt-4 w-full space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-left"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-semibold text-warning">
            Location unavailable. These matches are not distance-aware.
          </p>
          <p className="text-xs text-warning/80">
            {locationFailureMessage(locationFailure)}
          </p>
        </div>
      )}

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
        <div className="mt-5 flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm text-muted">
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
        </div>
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

      {/* Result — only shown for landing variant; dashboard navigates to result page */}
      {status === "done" && result && variant !== "dashboard" && (
        <div className="mt-6 w-full">
          <ResultPanel data={result} location={customerLocation} />
          <motion.button
            type="button"
            onClick={reset}
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="mt-3 w-full rounded-lg border border-divider py-2 text-sm font-semibold text-muted transition hover:bg-surface"
          >
            New request
          </motion.button>
        </div>
      )}
    </div>
  );
}
