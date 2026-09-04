"use client";

import Link from "next/link";
import LanguageToggle from "@/client/components/LanguageToggle";
import { useLang } from "@/client/lib/i18n/context";
import { Droplets, Zap, Wrench, Hammer, Mic } from "lucide-react";

export default function HomePage() {
  const { t, lang } = useLang();

  return (
    <main className="relative flex h-dvh flex-col overflow-y-auto bg-bg text-text">
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-warning/15 blur-3xl" />

      <nav className="relative z-10 flex w-full items-center justify-between border-b border-divider bg-[rgb(var(--bg))]/95 px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Ustad AI" className="h-9 w-9 rounded-xl object-contain" />
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

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-4 pb-8 pt-4 sm:gap-10 sm:pb-12 sm:pt-8 md:flex-row md:gap-16 md:px-8 md:pb-0 md:pt-12">
        <div className="max-w-lg text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-text md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 text-base text-muted md:text-lg">
            {t("heroDesc")}
          </p>

          {/* Decorative mic button — visual only, no functionality */}
          <div className="mt-8 flex justify-center md:justify-start">
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <span className="absolute -inset-3 rounded-full bg-accent/20 blur-md animate-pulse" />
                <div
                  className="relative flex h-28 w-28 items-center justify-center rounded-full text-[#08240F]"
                  style={{
                    background: "#26A650",
                    boxShadow: "0 8px 32px rgba(38,166,80,0.3)",
                  }}
                >
                  <Mic className="relative z-10 h-10 w-10" />
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-muted">
                {lang === "ur" ? "بولنے کے لیے دبائیں" : "Hold to speak"}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm glass-card p-4 md:max-w-md">
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
