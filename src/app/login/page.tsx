"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

type Step = "phone" | "otp";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"customer" | "worker">("customer");
  const [otp, setOtp] = useState("");
  const [mockOtp, setMockOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, role }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong");
        return;
      }
      if (body.data.mock_otp) {
        setMockOtp(body.data.mock_otp);
        setOtp(body.data.mock_otp);
      }
      setStep("otp");
    } catch {
      setError("Network error — is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Verification failed");
        return;
      }
      const role = body.data.user.role;
      const dest =
        role === "customer"
          ? "/dashboard/customer"
          : role === "worker"
            ? "/dashboard/worker"
            : "/dashboard";
      router.push(next.startsWith("/dashboard") ? dest : dest);
      router.refresh();
    } catch {
      setError("Network error — is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  const demoNumbers = [
    { label: "Customer demo", phone: "03001234567", name: "Ahmed Raza" },
    { label: "Worker demo", phone: "03010000001", name: "Muhammad Imran (plumber)" },
  ];

  return (
    <div className="card mx-auto w-full max-w-md p-6 sm:p-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0e5f44] hover:underline"
      >
        ← Back
      </Link>

      <h1 className="font-urdu text-2xl font-bold">لاگ ان کریں</h1>
      <p className="mt-1 text-sm text-stone-500">
        {step === "phone"
          ? "Enter your mobile number — no password needed"
          : `OTP sent to ${phone}`}
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === "phone" ? (
        <form onSubmit={requestOtp} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1">
            {(["customer", "worker"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  role === r
                    ? "bg-white text-[#0e5f44] shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {r === "customer" ? "Customer" : "Technician"}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-stone-700">
              Mobile number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="03XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Sending OTP…" : "Send OTP"}
          </button>

          <div className="rounded-xl bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Demo accounts
            </p>
            <div className="mt-2 space-y-1.5">
              {demoNumbers.map((d) => (
                <button
                  key={d.phone}
                  type="button"
                  onClick={() => setPhone(d.phone)}
                  className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-xs text-stone-600 ring-1 ring-stone-200 transition-colors hover:bg-stone-100"
                >
                  <span className="font-medium">{d.name}</span>
                  <span className="font-mono">{d.phone}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="mt-6 space-y-4">
          {mockOtp && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Demo mode — your OTP is <span className="font-mono font-bold">{mockOtp}</span>
            </p>
          )}
          <div>
            <label htmlFor="otp" className="mb-1 block text-sm font-medium text-stone-700">
              Enter OTP
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="input text-center font-mono text-lg tracking-[0.5em]"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Verifying…" : "Verify & continue"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setMockOtp(null);
            }}
            className="w-full text-center text-sm text-stone-500 hover:text-stone-700"
          >
            Change number
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eae4d6] px-4 py-10">
      <Suspense fallback={<div className="card p-8">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}