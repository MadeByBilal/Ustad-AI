"use client";

import { useEffect, useRef } from "react";

/**
 * Subscribes to the job SSE stream and invokes `onEvent` for `job_event`
 * and `message` events. Falls back gracefully when EventSource is not
 * available (e.g. tests, older browsers) — callers should keep their
 * polling loop as a fallback.
 */
export function useJobStream(
  jobId: string | null,
  onEvent: (type: "job_event" | "message") => void
): void {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!jobId || typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }
    let source: EventSource | null = null;

    try {
      source = new EventSource(`/api/jobs/${jobId}/stream`);
      source.addEventListener("job_event", () => handlerRef.current("job_event"));
      source.addEventListener("message", () => handlerRef.current("message"));
      // EventSource reconnects automatically on network errors; nothing
      // more to do here.
    } catch {
      source = null;
    }

    return () => {
      source?.close();
    };
  }, [jobId]);
}