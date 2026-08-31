"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { IncomingJobView } from "@/server/lib/worker/dashboard";
import { X } from "lucide-react";

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
    <AnimatePresence mode="wait">
      <motion.div
        key="overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Counter offer"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <motion.div
          key="panel"
          className="w-full max-w-md rounded-xl bg-surface p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-text">Counter offer</h3>
            <p className="text-xs text-muted">
              {job.category.replace(/_/g, " ")} · customer offered{" "}
              <span className="font-mono font-semibold text-text">
                Rs {job.customer_offer.toLocaleString("en-PK")}
              </span>
            </p>
          </div>
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-muted transition-colors hover:bg-bg hover:text-text"
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>

        <div className="mt-4">
          <label htmlFor="counter-price" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Your price (PKR)
          </label>
          <input
            id="counter-price"
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-xl border border-divider bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="mt-3">
          <label htmlFor="counter-message" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Optional message
          </label>
          <textarea
            id="counter-message"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Additional parts required"
            className="w-full rounded-xl border border-divider bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {error && <p className="mt-2 text-xs text-warning">{error}</p>}

        <div className="mt-4 flex gap-2">
          <motion.button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-divider bg-bg px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface disabled:opacity-60"
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
            className="btn-primary flex-1 !rounded-xl !px-4 !py-2 text-sm disabled:opacity-60"
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {busy ? "Submitting…" : "Submit counter-offer"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
    </AnimatePresence>
  );
}
