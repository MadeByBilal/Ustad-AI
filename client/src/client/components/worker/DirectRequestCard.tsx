"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { DirectRequestView } from "@contracts/worker";
import { getApiErrorMessage } from "@/client/lib/api-client";

async function postJson(url: string, body?: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = await res.json().catch(() => null);
  if (!res.ok || !parsed?.success) {
    throw new Error(getApiErrorMessage(parsed, `Request failed (${res.status})`));
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  plumber: "Plumber",
  electrician: "Electrician",
  ac_technician: "AC Technician",
  carpenter: "Carpenter",
};

const currency = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

/**
 * Direct request card: a targeted customer request with accept / counter / decline actions.
 */
export default function DirectRequestCard({
  request: req,
  onChanged,
}: {
  request: DirectRequestView;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCounter, setShowCounter] = useState(false);
  const [counterPrice, setCounterPrice] = useState(String(req.customer_offer));
  const [counterMsg, setCounterMsg] = useState("");

  const hasPendingCounter = req.offer_status === "pending" && req.my_counter_price !== null;

  async function act(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function submitCounter() {
    const price = Number(counterPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid price");
      return;
    }
    await act("counter", () =>
      postJson("/api/requests/respond", {
        offer_id: req.offer_id,
        action: "counter_offer",
        counter_price: price,
        message: counterMsg.trim() || undefined,
      })
    );
    setShowCounter(false);
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge shrink-0 bg-accent text-bg">
              {CATEGORY_LABELS[req.category] ?? req.category}
            </span>
            <span className={`badge shrink-0 ${
              req.urgency === "emergency" ? "!bg-warning !text-bg" : "!bg-bg !text-muted"
            }`}>
              {req.urgency === "emergency" ? "Emergency" : "Normal"}
            </span>
          </div>
          <p className="mt-2 font-urdu text-lg font-bold leading-relaxed text-text">
            {req.original_text}
          </p>
        </div>
      </div>

      {req.required_skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {req.required_skills.map((skill) => (
            <span key={skill} className="rounded-full bg-bg px-2.5 py-0.5 text-xs text-muted">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
        <div className="rounded-lg bg-bg p-2">
          <dt className="text-muted">Customer offer</dt>
          <dd className="font-semibold text-text">{currency(req.customer_offer)}</dd>
        </div>
        <div className="rounded-lg bg-bg p-2">
          <dt className="text-muted">Distance</dt>
          <dd className="font-semibold text-text">
            {req.distance_km != null
              ? req.distance_km < 1
                ? `~${Math.round(req.distance_km * 1000)} m away`
                : `~${req.distance_km.toFixed(1)} km away`
              : "Calculating..."}
          </dd>
        </div>
      </div>

      {hasPendingCounter && (
        <p className="mt-3 rounded-lg bg-surface px-3 py-1.5 text-xs text-muted">
          Your counter: {currency(req.my_counter_price!)} — waiting for customer response.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-warning">{error}</p>}

      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-divider pt-3">
        {hasPendingCounter ? (
          <span className="badge bg-surface text-muted">Awaiting customer approval</span>
        ) : (
          <>
            <motion.button
              type="button"
              onClick={() =>
                void act("accept", async () => {
                  await postJson("/api/requests/respond", { offer_id: req.offer_id, action: "accept" });
                  router.push("/dashboard/worker/active");
                })
              }
              disabled={busy !== null}
              className="btn-primary !rounded-xl !px-4 !py-2 text-sm disabled:opacity-60"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {busy === "accept" ? "Accepting…" : "Accept"}
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setShowCounter(true)}
              disabled={busy !== null}
              className="rounded-xl border border-accent bg-surface px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-60"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              Counter-offer
            </motion.button>
            <motion.button
              type="button"
              onClick={() =>
                void act("decline", () =>
                  postJson("/api/requests/respond", { offer_id: req.offer_id, action: "decline" })
                )
              }
              disabled={busy !== null}
              className="rounded-xl border border-divider bg-surface px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-bg disabled:opacity-60"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {busy === "decline" ? "Declining…" : "Decline"}
            </motion.button>
          </>
        )}
      </div>

      {showCounter && (
        <div className="mt-3 space-y-3 glass-card p-4">
          <div>
            <label htmlFor={`counter-${req.offer_id}`} className="mb-1 block text-xs font-semibold text-muted">
              Your price (PKR)
            </label>
            <input
              id={`counter-${req.offer_id}`}
              type="number"
              min={1}
              value={counterPrice}
              onChange={(e) => setCounterPrice(e.target.value)}
              className="w-full rounded-lg border border-divider bg-bg px-3 py-2 text-sm text-text"
              disabled={busy !== null}
            />
          </div>
          <div>
            <label htmlFor={`msg-${req.offer_id}`} className="mb-1 block text-xs font-semibold text-muted">
              Message (optional)
            </label>
            <input
              id={`msg-${req.offer_id}`}
              type="text"
              value={counterMsg}
              onChange={(e) => setCounterMsg(e.target.value)}
              placeholder="e.g. Additional parts needed"
              className="w-full rounded-lg border border-divider bg-bg px-3 py-2 text-sm text-text"
              disabled={busy !== null}
            />
          </div>
          <div className="flex gap-2">
            <motion.button
              type="button"
              onClick={() => setShowCounter(false)}
              disabled={busy !== null}
              className="flex-1 rounded-lg border border-divider bg-bg px-3 py-2 text-sm font-semibold text-muted hover:bg-surface"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              onClick={() => void submitCounter()}
              disabled={busy !== null || !counterPrice}
              className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-bg hover:bg-accent/90 disabled:opacity-60"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {busy === "counter" ? "Submitting…" : "Submit counter"}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
