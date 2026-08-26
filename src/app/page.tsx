"use client";

import Link from "next/link";
import VoiceCapture from "@/components/VoiceCapture";
import LanguageToggle from "@/components/LanguageToggle";
import { useLang } from "@/lib/i18n/context";

export default function HomePage() {
  const { t } = useLang();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-bg text-text">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-warning/10 blur-3xl" />

      <nav className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
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

      <section className="relative flex flex-1 flex-col items-center justify-center px-5 pb-16">
        <VoiceCapture />
      </section>
    </main>
  );
}
