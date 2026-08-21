"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { CANONICAL_SKILLS } from "@/lib/job/analyze";
import type { WorkerCategory } from "@/models";
import { motion } from "framer-motion";

type Mode = "signin" | "signup";
type Role = "customer" | "worker";

const CATEGORY_LABELS: Record<WorkerCategory, string> = {
  plumber: "Plumber",
  electrician: "Electrician",
  ac_technician: "AC Technician",
  carpenter: "Carpenter",
};

function destinationFor(role: string): string {
  if (role === "customer") return "/dashboard/customer";
  if (role === "worker") return "/dashboard/worker";
  return "/dashboard";
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState<WorkerCategory>("plumber");
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setError("Network error — is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  const availableSkills = CANONICAL_SKILLS[category];

  return (
    <motion.div className="card mx-auto w-full max-w-md" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
      >
        ← Back
      </Link>

      {/* Sign in / Sign up tabs */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-1">
        {(["signin", "signup"] as const).map((m) => (
          <motion.button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === m
                ? "bg-accent text-bg shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {m === "signin" ? "Sign in" : "Sign up"}
          </motion.button>
        ))}
      </div>

      <h1 className="mt-5 font-urdu text-2xl font-bold">
        {mode === "signin" ? "لاگ ان کریں" : "اکاؤنٹ بنائیں"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "signin"
          ? "Sign in with your email and password"
          : "Create your account with email and password"}
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-1">
              {(["customer", "worker"] as const).map((r) => (
                <motion.button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                    role === r
                      ? "bg-accent text-bg shadow-sm"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {r === "customer" ? "Customer" : "Technician"}
                </motion.button>
              ))}
            </div>

            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-text">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Ayesha Khan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                required
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-text">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-text">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder={mode === "signup" ? "8+ characters with a letter and a number" : "Your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            required
          />
        </div>

        {mode === "signup" && role === "worker" && (
          <>
            <div>
              <label htmlFor="category" className="mb-1 block text-sm font-medium text-text">
                Trade
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as WorkerCategory);
                  setSkills([]);
                }}
                className="input"
              >
                {(Object.keys(CATEGORY_LABELS) as WorkerCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <fieldset>
                <legend className="mb-1 block text-sm font-medium text-text">
                Skills <span className="font-normal text-muted">(pick at least one)</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((skill) => {
                  const active = skills.includes(skill);
                  return (
                    <motion.button
                      key={skill}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleSkill(skill)}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ y: -1 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "bg-accent text-bg"
                          : "bg-surface text-muted hover:bg-bg"
                      }`}
                    >
                      {skill}
                    </motion.button>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}

        <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.95 }} whileHover={{ y: -1 }} transition={{ duration: 0.15, ease: "easeOut" }} className="btn-primary w-full disabled:opacity-60">
          {loading
            ? mode === "signin"
              ? "Signing in…"
              : "Creating account…"
            : mode === "signin"
              ? "Sign in"
              : role === "worker"
                ? "Create technician account"
                : "Create account"}
        </motion.button>
      </form>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <Suspense fallback={<motion.div className="card" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>Loading…</motion.div>}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
