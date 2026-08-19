"use client";

import { useEffect, useRef, useState } from "react";

export interface SpeechTranscriptResult {
  0: { transcript: string; confidence: number };
  isFinal: boolean;
}

export interface SpeechRecognitionResultEvent {
  results: { length: number; [index: number]: SpeechTranscriptResult };
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as Record<string, unknown>;
  const ctor = (win.SpeechRecognition ?? win.webkitSpeechRecognition) as
    | SpeechRecognitionConstructor
    | undefined;
  return ctor ?? null;
}

function collectTranscript(event: SpeechRecognitionResultEvent): { interim: string; finalPart: string } {
  let interim = "";
  let finalPart = "";
  for (let i = 0; i < event.results.length; i++) {
    const result = event.results[i];
    const text = result[0]?.transcript ?? "";
    if (result.isFinal) {
      finalPart += (finalPart ? " " : "") + text;
    } else {
      interim += (interim ? " " : "") + text;
    }
  }
  return { interim, finalPart };
}

function errorMessage(code: string): string | null {
  if (code === "no-speech" || code === "audio-capture") {
    return "Couldn't hear anything — please try again";
  }
  if (code === "not-allowed") {
    return "Microphone permission required";
  }
  return "Voice recognition failed — please try again";
}

export default function VoiceCapture({ onFinal }: { onFinal: (transcript: string) => void }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const supported = getRecognitionConstructor() !== null;

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function start() {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setError("Voice note is not supported in this browser");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "ur-PK";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const { interim, finalPart } = collectTranscript(event);
      if (finalPart) {
        transcriptRef.current += (transcriptRef.current ? " " : "") + finalPart;
        setTranscript(transcriptRef.current);
      }
      setPreview(interim);
    };
    recognition.onend = () => {
      if (transcriptRef.current) {
        onFinal(transcriptRef.current);
        transcriptRef.current = "";
      }
      setListening(false);
      setPreview("");
    };
    recognition.onerror = (event) => {
      const message = errorMessage(event.error);
      setError(message);
      if (event.error === "no-speech") {
        recognition.stop();
        setListening(false);
      }
    };
    recognitionRef.current = recognition;
    setError(null);
    setTranscript("");
    setPreview("");
    setListening(true);
    recognition.start();
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  if (!supported) {
    return (
      <button type="button" disabled className="btn-disabled">
        🎙️ Voice not supported
      </button>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={listening ? stop : start} className="btn btn-primary">
          {listening ? "⏹️ Stop listening" : "🎙️ Voice note"}
        </button>
        {(transcript || preview) && (
          <span className="text-sm italic text-stone-500">“{[transcript, preview].filter(Boolean).join(" ")}”</span>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}