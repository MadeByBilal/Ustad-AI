"use client";

import { useState } from "react";
import type { IncomingJobView } from "@/lib/worker/dashboard";

/**
 * Counter-offer dialog: worker enters their price plus an optional note
 * (e.g. "Additional parts required"), then the offer is submitted via
 * POST /api/offers and the job enters the customer's review window.
 */
export default function CounterOfferModal({
  job,
  onClose,
  onSubmitted,
}: {
  job: IncomingJobView;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [price, setPrice] = useState(String(job.customer_offer || ""));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const counter_price = Number(price);
    if (!Number.isFinite(counter_price) || counter_price <= 0) {
      setError("Enter a valid counter price");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          type: "counter_offer",
          counter_price,
          message: message.trim() || undefined,
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Counter offer failed");
      }
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Counter offer failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Counter offer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-900">Counter offer</h3>
            <p className="text-xs text-stone-500">
              {job.category.replace(/_/g, " ")} · customer offered{" "}
              <span className="font-semibold text-stone-800">
                Rs {job.customer_offer.toLocaleString("en-PK")}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <label htmlFor="counter-price" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
            Your price (PKR)
          </label>
          <input
            id="counter-price"
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-[#0e5f44] focus:ring-2 focus:ring-[#0e5f44]/20"
          />
        </div>

        <div className="mt-3">
          <label htmlFor="counter-message" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
            Optional message
          </label>
          <textarea
            id="counter-message"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Additional parts required"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-[#0e5f44] focus:ring-2 focus:ring-[#0e5f44]/20"
          />
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="flex-1 rounded-xl bg-[#0e5f44] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b4c37] disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit counter-offer"}
          </button>
        </div>
      </div>
    </div>
  );
}