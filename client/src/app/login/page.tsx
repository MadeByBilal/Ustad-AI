"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { CANONICAL_SKILLS } from "@contracts/ai";
import type { WorkerCategory } from "@contracts/worker";
import { motion } from "framer-motion";
import { useLang } from "@/client/lib/i18n/context";
import LanguageToggle from "@/client/components/LanguageToggle";
import "@/app/dark-glass-theme.css";

type Mode = "signin" | "signup";
type Role = "customer" | "worker";

function destinationFor(role: string): string {
  if (role === "customer") return "/dashboard/customer";
  if (role === "worker") return "/dashboard/worker";
  return "/dashboard";
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const { t, lang } = useLang();

  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState<WorkerCategory>("plumber");
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const CATEGORY_LABELS: Record<WorkerCategory, string> = {
    plumber: t("plumber"),
    electrician: t("electrician"),
    ac_technician: t("acTechnician"),
    carpenter: t("carpenter"),
  };

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload =
        mode === "signin"
          ? { email, password }
          : {
              name,
              email,
              password,
              role,
              ...(role === "worker" ? { worker: { category, skills } } : {}),
            };
      const res = await fetch(`/api/auth/${mode === "signin" ? "signin" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(typeof body.error === "object" ? body.error.message_ur ?? body.error.message ?? "Something went wrong" : body.error ?? "Something went wrong");
        return;
      }
      const dest = destinationFor(body.data.user.role);
      router.push(next.startsWith("/dashboard") ? next : dest);
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  const availableSkills = CANONICAL_SKILLS[category];

  return (
    <div className="w-full max-w-md mx-auto px-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#93A396] hover:text-[#F1F4F1] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {t("back")}
        </Link>
        <LanguageToggle />
      </div>

      {/* Sign in / Sign up tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}>
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
              mode === m
                ? "bg-[#26A650] text-[#08240F] shadow-lg shadow-[#26A650]/20"
                : "text-[#93A396] hover:text-[#F1F4F1] hover:bg-white/5"
            }`}
          >
            {m === "signin" ? t("signIn") : t("signUp")}
          </button>
        ))}
      </div>

      {/* Title */}
      <div className="mt-8 mb-6">
        <h1 className={`text-2xl font-bold text-[#F1F4F1] ${lang === "ur" ? "font-urdu" : ""}`}>
          {mode === "signin" ? t("signInTitle") : t("signUpTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-[#93A396]">
          {mode === "signin" ? t("signInDesc") : t("signUpDesc")}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: "rgba(224,164,97,0.12)", border: "1px solid rgba(224,164,97,0.3)", color: "#E0A461" }}>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <>
            {/* Role selector */}
      <div className="grid grid-cols-2 gap-1 p-1 glass-card">
              {(["customer", "worker"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
                    role === r
                      ? "bg-[#26A650] text-[#08240F] shadow-lg shadow-[#26A650]/20"
                      : "text-[#93A396] hover:text-[#F1F4F1] hover:bg-white/5"
                  }`}
                >
                  {r === "customer" ? t("customer") : t("technician")}
                </button>
              ))}
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[#F1F4F1]">
                {t("fullName")}
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Ayesha Khan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm text-[#F1F4F1] placeholder:text-[#93A396] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#26A650]/30"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
                required
              />
            </div>
          </>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#F1F4F1]">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm text-[#F1F4F1] placeholder:text-[#93A396] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#26A650]/30"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
            required
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#F1F4F1]">
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder={mode === "signup" ? t("passwordPlaceholder") : t("yourPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm text-[#F1F4F1] placeholder:text-[#93A396] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#26A650]/30"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
            required
          />
        </div>

        {/* Worker fields */}
        {mode === "signup" && role === "worker" && (
          <>
            <div>
              <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-[#F1F4F1]">
                {t("category")}
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as WorkerCategory);
                  setSkills([]);
                }}
                className="w-full rounded-xl px-4 py-3 text-sm text-[#F1F4F1] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#26A650]/30"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {(Object.keys(CATEGORY_LABELS) as WorkerCategory[]).map((c) => (
                  <option key={c} value={c} style={{ background: "#0B0F0C", color: "#F1F4F1" }}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="border-none p-0 m-0">
              <legend className="mb-2 block text-sm font-medium text-[#F1F4F1]">
                {t("skills")} <span className="font-normal text-[#93A396]">({t("pickAtLeastOne")})</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((skill) => {
                  const active = skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleSkill(skill)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                        active
                          ? "bg-[#26A650] text-[#08240F] shadow-md shadow-[#26A650]/20"
                          : "text-[#93A396] hover:text-[#F1F4F1] hover:bg-white/5"
                      }`}
                      style={!active ? { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" } : undefined}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-3 text-sm font-bold transition-all duration-200 disabled:opacity-50 mt-2"
          style={{ background: "#26A650", color: "#08240F", boxShadow: "0 4px 16px rgba(38,166,80,0.3)" }}
        >
          {loading
            ? mode === "signin"
              ? t("signingIn")
              : t("creatingAccount")
            : mode === "signin"
              ? t("signInBtn")
              : role === "worker"
                ? t("createTechAccount")
                : t("createAccount")}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="dark-glass-theme flex min-h-screen items-center justify-center overflow-y-auto px-4 py-10" style={{ background: "#0B0F0C" }}>
      <Suspense fallback={<div className="text-sm text-[#93A396]">Loading...</div>}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
