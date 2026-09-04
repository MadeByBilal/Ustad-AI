"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { validateCustomerOffer } from "@/client/lib/validation";
import { getApiErrorMessage } from "@/client/lib/api-client";

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

      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Offer failed"));
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
    <AnimatePresence mode="wait">
      <motion.div
        key="overlay"
        className="fixed inset-0 flex items-center justify-center bg-bg/80 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <motion.div
          key="panel"
          className="card w-full max-w-sm p-6 shadow-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
        <h2 className="font-display text-xl font-bold text-text">
          Offer to {workerName}
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text">
              Your Offer (PKR)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-divider bg-bg px-3 py-2 text-text"
              disabled={busy}
            />
            {estimateMin > 0 && estimateMax > 0 && (
              <p className="mt-1 font-mono text-xs text-muted">
                Estimate: ₨ {estimateMin.toLocaleString()} - ₨{" "}
                {estimateMax.toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., 'Please confirm timeline'"
              className="w-full rounded-lg border border-divider bg-bg px-3 py-2 text-sm text-text"
              rows={3}
              disabled={busy}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
              <p className="text-sm text-warning">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <motion.button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-divider bg-bg px-4 py-2 font-medium text-muted hover:bg-surface"
              disabled={busy}
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              onClick={submit}
              disabled={busy}
              className="btn-primary flex-1 !rounded-lg !px-4 !py-2 font-medium disabled:opacity-60"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {busy ? "Sending..." : "Send Offer"}
            </motion.button>
          </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
