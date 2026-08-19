"use client";

import { useState } from "react";

export default function AcceptJobButton({ jobId }: { jobId: string }) {
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/accept`, { method: "POST" });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      setAccepted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (accepted) {
    return (
      <span className="badge shrink-0 !bg-emerald-100 !text-emerald-800">
        ✓ Accepted
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleAccept}
        disabled={busy}
        className="rounded-xl bg-[#0e5f44] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b4c37] disabled:opacity-60"
      >
        {busy ? "Accepting…" : "Accept job"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}