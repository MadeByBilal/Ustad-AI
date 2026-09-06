"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/client/lib/i18n/context";
import VoiceCapture from "@/client/components/VoiceCapture";
import ActiveJobStatusBar from "@/client/components/ActiveJobStatusBar";
import { ArrowLeft } from "lucide-react";

export default function CustomerHomeContent() {
  const { t } = useLang();
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
        <div className={`transition-all duration-500 ${isActive ? "opacity-0 -translate-y-8 pointer-events-none" : "opacity-100 translate-y-0"}`}>
          <p className="text-center text-3xl font-bold text-[#F1F4F1] sm:text-4xl">
            {t("whatsBroken")}
          </p>
          <p className="mt-3 text-center text-base text-[#93A396]">
            {t("tapToStart")}
          </p>
        </div>
        <div className="mt-14">
          <VoiceCapture variant="dashboard" onStatusChange={setVoiceStatus} />
        </div>
      </div>

      <ActiveJobStatusBar />
    </div>
  );
}
