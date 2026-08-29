"use client";

import Link from "next/link";
import VoiceCapture from "@/components/VoiceCapture";
import LanguageToggle from "@/components/LanguageToggle";
import { useLang } from "@/lib/i18n/context";
import { Wrench, Zap, Droplets, Hammer } from "lucide-react";

export default function HomePage() {
  const { t, lang } = useLang();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-bg text-text">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-warning/10 blur-3xl" />

      <nav className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-lg font-bold text-bg">
            ا
          </span>
          <span className="text-lg font-bold tracking-tight">
            Ustad <span className="text-accent">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link
            href="/login"
            className="rounded-xl border border-divider px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface"
          >
            {t("signIn")}
          </Link>
        </div>
      </nav>

      <section className="relative flex flex-1 flex-col items-center justify-center px-5 pb-16 md:flex-row md:gap-16 md:pb-0">
        <div className="max-w-md text-center md:max-w-lg md:text-left">
          <h1 className="text-3xl font-bold text-text md:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 text-base text-muted md:text-lg">
            {t("heroDesc")}
          </p>
          <div className="mt-8 md:hidden">
            <VoiceCapture />
          </div>
          <div className="mt-8 hidden md:block">
            <VoiceCapture />
          </div>
        </div>

        <div className="mt-12 hidden gap-4 md:mt-0 md:flex md:flex-col">
          {[
            { icon: Droplets, label: t("plumber") },
            { icon: Zap, label: t("electrician") },
            { icon: Wrench, label: t("acTechnician") },
            { icon: Hammer, label: t("carpenter") },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-divider bg-surface/50 px-4 py-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                <item.icon className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm font-medium text-text">{item.label}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
