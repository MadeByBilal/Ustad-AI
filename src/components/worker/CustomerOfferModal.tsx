"use client";

import { useState } from "react";
import { validateCustomerOffer } from "@/lib/job/offers";

export default function CustomerOfferModal({
  jobId,
  workerId,
  workerName,
  currentOffer: initialOffer,
  estimateMin,
  estimateMax,
  onClose,
  onSubmitted,
}: {
  jobId: string;
  workerId: string;
  workerName: string;
  currentOffer: number | null;
  estimateMin: number;
  estimateMax: number;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [price, setPrice] = useState(String(initialOffer || estimateMin || 0));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const offerPrice = Number(price);
    const validation = validateCustomerOffer(
      offerPrice,
      estimateMin,
      estimateMax,
    );

    if (!validation.valid) {
      const reason =
        validation.reason === "too_low"
          ? `minimum: ₨ ${validation.min_allowed}`
          : `maximum: ₨ ${validation.max_allowed}`;
      setError(`Invalid price (${reason})`);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          worker_id: workerId,
          offer_price: offerPrice,
          message: message.trim() || undefined,
        }),
      });

      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Offer failed");
      }

      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send offer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-2xl bg-white p-6 shadow-lg max-w-sm w-full">
        <h2 className="text-xl font-bold text-stone-900">
          Offer to {workerName}
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Your Offer (PKR)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              disabled={busy}
            />
            {estimateMin > 0 && estimateMax > 0 && (
              <p className="mt-1 text-xs text-stone-500">
                Estimate: ₨ {estimateMin.toLocaleString()} - ₨{" "}
                {estimateMax.toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., 'Please confirm timeline'"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
              rows={3}
              disabled={busy}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-medium hover:bg-stone-50"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              {busy ? "Sending..." : "Send Offer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
