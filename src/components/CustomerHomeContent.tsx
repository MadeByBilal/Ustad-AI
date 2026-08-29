"use client";

import { useLang } from "@/lib/i18n/context";
import VoiceCapture from "@/components/VoiceCapture";
import ActiveJobStatusBar from "@/components/ActiveJobStatusBar";

interface CustomerHomeContentProps {
  name: string;
}

export default function CustomerHomeContent({ name }: CustomerHomeContentProps) {
  const { t } = useLang();

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden md:min-h-[calc(100vh-3.5rem)]">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-warning/8 blur-3xl" />

      <div className="page-content relative flex flex-1 flex-col items-center justify-center">
        <p className="text-center text-3xl font-bold text-text sm:text-4xl">
          {t("whatsBroken")}
        </p>
        <p className="mt-3 text-center text-base text-muted">
          {t("holdButton")}
        </p>
        <div className="mt-10">
          <VoiceCapture variant="dashboard" />
        </div>
      </div>

      <ActiveJobStatusBar />
    </div>
  );
}
