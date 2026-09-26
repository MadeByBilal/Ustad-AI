"use client";

import Link from "next/link";
import LanguageToggle from "@/client/components/LanguageToggle";
import { useLang } from "@/client/lib/i18n/context";
import { Droplets, Zap, Wrench, Hammer, Mic, ChevronRight, Sparkles } from "lucide-react";

export default function HomePage() {
  const { t, lang } = useLang();

  return (
    <main className="relative flex h-dvh flex-col overflow-y-auto bg-[#0B0F0C] text-[#F1F4F1]">
      <nav className="relative z-10 flex w-full items-center justify-between border-b border-white/10 bg-[#0B0F0C]/90 px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Ustad AI" className="h-9 w-9 rounded-xl object-contain" />
          <span className={`text-lg font-bold tracking-tight ${lang === "ur" ? "font-urdu" : ""}`}>
            Ustad <span className="text-[#26A650]">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link href="/login" className="btn-primary px-4 py-2 text-xs">
            {t("signIn")}
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-10 md:px-8 md:py-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
            <span className="badge badge-premium mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              {lang === "ur" ? "معتبر ماہرین" : "Premium vetted pros"}
            </span>

            <h1 className="max-w-xl text-4xl font-bold tracking-tight md:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-md text-base text-[#93A396] md:text-lg">
              {t("heroDesc")}
            </p>

            <div className="mt-10 flex flex-col items-center lg:mt-12">
              <div className="relative flex items-center justify-center">
                <span className="absolute -inset-3 animate-pulse rounded-full border border-white/10" />
                <button
                  className="mic-btn relative flex h-28 w-28 items-center justify-center rounded-full bg-[#26A650] text-[#08240F] shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
                  type="button"
                  aria-label={lang === "ur" ? "بولنے کے لیے دبائیں" : "Hold to speak"}
                >
                  <Mic className="h-10 w-10" />
                </button>
              </div>
              <p className="mt-4 text-sm font-medium text-[#93A396]">
                {lang === "ur" ? "بولنے کے لیے دبائیں" : "Hold to speak"}
              </p>
            </div>
          </div>

          <div className="glass-card w-full p-5 md:p-6">
            <div className="flex items-center justify-between px-1 pb-3">
              <h2 className="text-sm font-semibold text-[#F1F4F1]">
                {lang === "ur" ? "مقبول خدمات" : "Popular services"}
              </h2>
              <span className="badge badge-premium">Premium</span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {[
                { icon: Droplets, label: t("plumber") },
                { icon: Zap, label: t("electrician") },
                { icon: Wrench, label: t("acTechnician") },
                { icon: Hammer, label: t("carpenter") },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 px-1 py-3.5">
                  <div className="glass-icon-circle flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                    <item.icon className="h-5 w-5 text-[#26A650]" />
                  </div>
                  <span className="text-sm font-semibold text-[#F1F4F1]">{item.label}</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-[#93A396]/50 rtl:rotate-180" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
