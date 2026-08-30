"use client";

import Link from "next/link";
import VoiceCapture from "@/components/VoiceCapture";
import LanguageToggle from "@/components/LanguageToggle";
import { useLang } from "@/lib/i18n/context";
import { Droplets, Zap, Wrench, Hammer } from "lucide-react";

export default function HomePage() {
  const { t, lang } = useLang();

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

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-10 px-4 pb-12 pt-8 md:flex-row md:gap-16 md:px-8 md:pb-0 md:pt-12">
        <div className="max-w-lg text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-text md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 text-base text-muted md:text-lg">
            {t("heroDesc")}
          </p>
          <div className="mt-8 flex justify-center md:justify-start">
            <VoiceCapture />
          </div>
        </div>

        <div className="w-full max-w-sm rounded-[2rem] border border-divider bg-[rgb(var(--surface))] p-4 shadow-[0_18px_30px_rgba(42,33,28,0.08)] md:max-w-md">
          <div className="grid gap-3">
            {[
              { icon: Droplets, label: t("plumber") },
              { icon: Zap, label: t("electrician") },
              { icon: Wrench, label: t("acTechnician") },
              { icon: Hammer, label: t("carpenter") },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl border border-divider bg-[rgb(var(--surface))] px-4 py-3"
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
