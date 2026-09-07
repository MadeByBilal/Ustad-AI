"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/client/lib/i18n/context";
import VoiceCapture from "@/client/components/VoiceCapture";
import ActiveJobStatusBar from "@/client/components/ActiveJobStatusBar";
import { ArrowLeft, Mic, Search, Wrench } from "lucide-react";

export default function CustomerHomeContent() {
  const { t, lang } = useLang();
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "recording" | "processing" | "clarifying" | "done" | "error">("idle");
  const [hasResults, setHasResults] = useState(false);

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
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full blur-3xl" style={{ background: "rgba(38,166,80,0.08)" }} />
      <div className="pointer-events-none absolute -bottom-28 -left-12 h-72 w-72 rounded-full blur-3xl" style={{ background: "rgba(38,166,80,0.04)" }} />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" style={{ background: "rgba(38,166,80,0.03)" }} />

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

        {/* Headline */}
        <div className={`text-center transition-all duration-500 ${isActive ? "opacity-0 -translate-y-6 pointer-events-none" : "opacity-100 translate-y-0"}`}>
          <h1 className="text-4xl font-bold tracking-tight text-[#F1F4F1] sm:text-5xl">
            {t("whatsBroken")}
          </h1>
          <p className="mt-3 text-sm text-[#93A396] sm:text-base">
            {lang === "ur" ? "铥ائیک دبائیں اور بتائیں کیا خراب ہے" : "Hold the mic and tell us what's wrong"}
          </p>
        </div>

        {/* Mic */}
        <div className="mt-10">
          <VoiceCapture variant="dashboard" onStatusChange={setVoiceStatus} />
        </div>

        {/* How it works */}
        <div className={`mt-10 flex items-center gap-4 transition-all duration-500 ${isActive ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          {[
            { num: "1", icon: Mic, label: lang === "ur" ? "بولیں" : "Speak" },
            { num: "2", icon: Search, label: lang === "ur" ? "تلاش" : "Find" },
            { num: "3", icon: Wrench, label: lang === "ur" ? ".fix" : "Fix" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-4">
              {i > 0 && (
                <div className="flex h-px w-6 items-center">
                  <div className="h-px w-full bg-gradient-to-r from-[#26A650]/30 to-[#26A650]/10" />
                </div>
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#26A650]/10 ring-1 ring-[#26A650]/20">
                  <step.icon className="h-3.5 w-3.5 text-[#26A650]/70" />
                </div>
                <span className="text-[11px] font-medium text-[#93A396]/70">{step.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ActiveJobStatusBar />
    </div>
  );
}
