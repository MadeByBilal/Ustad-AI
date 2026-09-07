"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/client/lib/i18n/context";
import VoiceCapture from "@/client/components/VoiceCapture";
import ActiveJobStatusBar from "@/client/components/ActiveJobStatusBar";
import { ArrowLeft, Droplets, Zap, Snowflake, Fan, Lightbulb, Lock } from "lucide-react";

const EXAMPLES = [
  { key: "fan", icon: Fan, en: "Fan running slow", ur: "پنہا سست چل رہا ہے" },
  { key: "tap", icon: Droplets, en: "Tap is leaking", ur: "ٹپ سے پانی ٹپک رہا ہے" },
  { key: "ac", icon: Snowflake, en: "AC not cooling", ur: "ای سی ٹھنڈ نہیں کر رہی" },
  { key: "switch", icon: Zap, en: "Switch sparking", ur: "سوئچ چنگاڑھا مار رہا ہے" },
  { key: "pump", icon: Droplets, en: "Water pump broken", ur: "پانی کا پمپ خراب ہے" },
  { key: "lock", icon: Lock, en: "Door lock jammed", ur: "تال جم گیا ہے" },
];

export default function CustomerHomeContent() {
  const { t, lang } = useLang();
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "recording" | "processing" | "clarifying" | "done" | "error">("idle");
  const [hasResults, setHasResults] = useState(false);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("voiceResult");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data) setHasResults(true);
      }
    } catch {}
  }, []);

  const isActive = voiceStatus === "recording" || voiceStatus === "processing";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden" style={{ background: "#0B0F0C" }}>
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "rgba(38,166,80,0.06)" }} />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full blur-3xl" style={{ background: "rgba(212,162,74,0.04)" }} />

      <div className="page-content relative flex flex-1 flex-col items-center justify-center">
        {hasResults && !isActive && (
          <Link
            href="/dashboard/customer/result"
            className="absolute left-4 top-4 flex items-center gap-2 text-sm font-medium text-[#93A396] hover:text-[#26A650] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to results
          </Link>
        )}

        {/* Headline — hides when voice is active */}
        <div className={`transition-all duration-500 ${isActive ? "opacity-0 -translate-y-8 pointer-events-none" : "opacity-100 translate-y-0"}`}>
          <p className="text-center text-3xl font-bold text-[#F1F4F1] sm:text-4xl">
            {t("whatsBroken")}
          </p>
        </div>

        {/* Example cards grid — hides when voice is active */}
        {!selectedExample && (
          <div className={`mt-6 grid w-full max-w-md grid-cols-2 gap-3 transition-all duration-500 sm:grid-cols-3 ${isActive ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
            {EXAMPLES.map((ex) => {
              const Icon = ex.icon;
              return (
                <button
                  key={ex.key}
                  onClick={() => setSelectedExample(ex.key)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all active:scale-[0.97]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#26A650]/10">
                    <Icon className="h-4 w-4 text-[#26A650]" />
                  </div>
                  <span className="text-sm font-medium text-[#F1F4F1] leading-tight">
                    {lang === "ur" ? ex.ur : ex.en}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* VoiceCapture — shows mic OR auto-submits prefilled text */}
        <div className={`mt-6 ${selectedExample ? "" : ""}`}>
          {selectedExample ? (
            <VoiceCapture
              variant="dashboard"
              onStatusChange={setVoiceStatus}
              prefilledText={EXAMPLES.find((e) => e.key === selectedExample)?.en ?? ""}
            />
          ) : (
            <VoiceCapture variant="dashboard" onStatusChange={setVoiceStatus} />
          )}
        </div>

        {/* "Or hold to speak" hint — only when no example selected */}
        {!selectedExample && !isActive && (
          <p className="mt-4 text-sm text-[#93A396]">
            {lang === "ur" ? "یا بولنے کے لیے دبائیں" : "or hold to speak"}
          </p>
        )}
      </div>

      <ActiveJobStatusBar />
    </div>
  );
}
