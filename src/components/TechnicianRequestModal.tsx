"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X } from "lucide-react";
import type { WorkerOption } from "@/lib/matching";
import type { UnderstandResponse } from "@/components/VoiceCapture";

const CATEGORY_LABELS: Record<string, string> = {
  plumber: "Plumber",
  electrician: "Electrician",
  ac_technician: "AC Technician",
  carpenter: "Carpenter",
};

const currency = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;

interface TechnicianRequestModalProps {
  worker: WorkerOption;
  understanding: UnderstandResponse["understanding"];
  input: { type: "voice" | "text" | "photo"; original_text?: string; transcript?: string };
  location?: { lat: number; lng: number } | null;
  onClose: () => void;
  onSubmitted: (result: { job_id: string; offer_id: string }) => void;
}

export default function TechnicianRequestModal({
  worker,
  understanding,
  input,
  location,
  onClose,
  onSubmitted,
}: TechnicianRequestModalProps) {
  const estMin = understanding.estimate_min ?? 0;
  const estMax = understanding.estimate_max ?? 0;
  const defaultPrice = worker.predicted_price != null
    ? String(worker.predicted_price)
    : estMin > 0
      ? String(estMin)
      : "";

  const [price, setPrice] = useState(defaultPrice);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const proposed_price = Number(price);
    if (!Number.isFinite(proposed_price) || proposed_price <= 0) {
      setError("Enter a valid price");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_id: worker.id,
          proposed_price,
          message: message.trim() || undefined,
          understanding: {
            category: understanding.category ?? "",
            subcategory: understanding.subcategory ?? "",
            description: understanding.description ?? "",
            required_skills: understanding.required_skills ?? [],
            urgency: understanding.urgency,
            confidence: understanding.confidence,
            estimate_min: estMin,
            estimate_max: estMax,
            inspection_fee: understanding.inspection_fee,
            complexity: understanding.complexity,
          },
          input,
          location: location ? {
            coordinates: [location.lng, location.lat],
          } : undefined,
        }),
      });

      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        data?: { job_id: string; offer_id: string };
      } | null;

      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Request failed");
      }

      onSubmitted(body.data!);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send request");
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
        aria-label={`Send request to ${worker.name}`}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <motion.div
          key="panel"
          className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-text">
              Send request to {worker.name}
            </h2>
            <p className="text-xs text-muted">
              {CATEGORY_LABELS[worker.category] ?? worker.category} · <Star className="h-3.5 w-3.5 text-warning inline" />{" "}
              {worker.average_rating.toFixed(1)} · {worker.completed_jobs} jobs
              {worker.verified ? " · Verified" : ""}
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

        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="req-price"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted"
            >
              Your offer (PKR)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                Rs
              </span>
              <input
                id="req-price"
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-divider bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                disabled={busy}
              />
            </div>
            {estMin > 0 && estMax > 0 && (
              <p className="mt-1 text-xs text-muted">
                AI estimate: {currency(estMin)} – {currency(estMax)}
              </p>
            )}
            {worker.predicted_price != null && (
              <p className="mt-1 text-xs font-semibold text-warning">
                Predicted base for this ustad: {currency(worker.predicted_price)}
                {worker.distance_km != null
                  ? ` (${worker.distance_km.toFixed(1)} km travel included)`
                  : ""}
                {worker.travel_cost_pkr != null && worker.travel_cost_pkr > 0
                  ? ` · petrol PKR ${worker.travel_cost_pkr.toLocaleString("en-PK")}`
                  : ""}
              </p>
            )}
            {understanding.inspection_fee && understanding.inspection_fee > 0 && (
              <p className="mt-1 text-xs text-warning">
                Visit &amp; check fee: {currency(understanding.inspection_fee)} paid first
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="req-message"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted"
            >
              Message (optional)
            </label>
            <textarea
              id="req-message"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Please come as soon as possible"
                className="w-full rounded-xl border border-divider bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
              disabled={busy}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
              <p className="text-sm text-warning">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <motion.button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-xl border border-divider bg-surface px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-bg disabled:opacity-60"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              onClick={submit}
              disabled={busy || !price}
              className="btn-primary flex-1 !rounded-xl !px-4 !py-2.5 text-sm disabled:opacity-60"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {busy ? "Sending…" : "Send Request"}
            </motion.button>
          </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
