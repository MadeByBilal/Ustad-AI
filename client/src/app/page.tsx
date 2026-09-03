"use client";

import { useState } from "react";
import Link from "next/link";
import VoiceCapture from "@/client/components/VoiceCapture";
import LanguageToggle from "@/client/components/LanguageToggle";
import { useLang } from "@/client/lib/i18n/context";
import { Droplets, Zap, Wrench, Hammer } from "lucide-react";

export default function HomePage() {
  const { t, lang } = useLang();
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "recording" | "processing" | "clarifying" | "done" | "error">("idle");

  const isActive = voiceStatus === "recording" || voiceStatus === "processing";

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-bg text-text">
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-warning/15 blur-3xl" />

      <nav className="relative z-10 flex w-full items-center justify-between border-b border-divider bg-[rgb(var(--bg))]/95 px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-bold text-[rgb(var(--surface))]">
            ا
          </span>
          <span className={`text-lg font-bold tracking-tight text-text ${lang === "ur" ? "font-urdu" : ""}`}>
            Ustad <span className="text-accent">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link href="/login" className="btn-primary px-4 py-2 text-xs">
            {t("signIn")}
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 pb-8 pt-4 sm:gap-10 sm:pb-12 sm:pt-8 md:flex-row md:gap-16 md:px-8 md:pb-0 md:pt-12">
        <div className="max-w-lg text-center md:text-left">
          <div className={`transition-all duration-500 ${isActive ? "opacity-0 -translate-y-8 pointer-events-none" : "opacity-100 translate-y-0"}`}>
            <h1 className="text-4xl font-bold tracking-tight text-text md:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 text-base text-muted md:text-lg">
              {t("heroDesc")}
            </p>
          </div>
          <div className="mt-8 flex justify-center md:justify-start">
            <VoiceCapture onStatusChange={setVoiceStatus} />
          </div>
        </div>

        <div className={`transition-all duration-500 w-full max-w-sm glass-card p-4 md:max-w-md ${isActive ? "opacity-0 translate-x-12 pointer-events-none" : "opacity-100 translate-x-0"}`}>
          <div className="grid gap-3">
            {[
              { icon: Droplets, label: t("plumber") },
              { icon: Zap, label: t("electrician") },
              { icon: Wrench, label: t("acTechnician") },
              { icon: Hammer, label: t("carpenter") },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 glass-card px-4 py-3"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <item.icon className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm font-semibold text-text">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
