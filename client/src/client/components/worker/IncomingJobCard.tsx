"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IncomingJobView } from "@contracts/worker";
import { motion, AnimatePresence } from "framer-motion";
import { Timer } from "lucide-react";
import CounterOfferModal from "./CounterOfferModal";
import { getApiErrorMessage } from "@/client/lib/api-client";

function timeLeft(deadline: string | null, now: number): string | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return "Expired";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

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

/**
 * Incoming job card: full broadcast details with the response actions
 * (accept / counter-offer / decline / ask clarification) and a live
 * countdown to the acceptance deadline.
 */
export default function IncomingJobCard({
  job,
  now,
  onChanged,
}: {
  job: IncomingJobView;
  now: number;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCounter, setShowCounter] = useState(false);
  const [clarifying, setClarifying] = useState(false);
  const [question, setQuestion] = useState("");

  const left = timeLeft(job.acceptance_deadline, now);
  const expired = left === "Expired";
  const emergency = job.urgency === "emergency";
  const pendingCounter = job.my_offer?.status === "pending" && job.my_offer.type === "counter_offer";

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

  async function askClarification() {
    const content = question.trim();
    if (!content) return;
    await act("clarify", () =>
      postJson(`/api/jobs/${job.id}/messages`, { content })
    );
    setClarifying(false);
    setQuestion("");
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge shrink-0 bg-accent text-bg">
              {job.category.replace(/_/g, " ")}
            </span>
            {job.subcategory && (
              <span className="badge shrink-0 bg-bg text-muted">
                {job.subcategory.replace(/_/g, " ")}
              </span>
            )}
            <span
              className={`badge shrink-0 ${
                emergency ? "!bg-warning !text-bg" : "!bg-bg !text-muted"
              }`}
            >
              {emergency ? "Emergency" : "Normal"}
            </span>
          </div>
          <p className="mt-2 font-urdu text-lg font-bold leading-relaxed text-text">
            {job.original_text}
          </p>
          {job.description && (
            <p className="mt-1 text-sm text-muted">
              {job.description}
            </p>
          )}
        </div>
        <span
          className={`badge shrink-0 font-mono ${
            expired
               ? "!bg-warning/10 !text-warning"
               : left
                 ? "!bg-warning/10 !text-warning"
                 : "!bg-bg !text-muted"
          }`}
        >
          {expired ? "Expired" : left ? <><Timer className="h-3.5 w-3.5 inline mr-1" />{left}</> : "No deadline"}
        </span>
      </div>

      {job.required_skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.required_skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-bg px-2.5 py-0.5 text-xs text-muted"
            >
              {skill.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      {job.photo_ids.length > 0 && (
        <div className="mt-3 flex gap-2">
          {job.photo_ids.map((id) => (
            <img
              key={id}
              src={`/api/photos/${id}`}
              alt="Problem photo"
            className="h-16 w-16 rounded-lg object-cover ring-1 ring-divider"
            />
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
        <div className="rounded-lg bg-bg p-2">
          <dt className="text-muted">Customer offer</dt>
          <dd className="font-mono font-semibold text-text">
            Rs {job.customer_offer.toLocaleString("en-PK")}
          </dd>
        </div>
        <div className="rounded-lg bg-bg p-2">
          <dt className="text-muted">Distance</dt>
          <dd className="font-semibold text-text">
            {job.distance_km != null
              ? job.distance_km < 1
                ? `~${Math.round(job.distance_km * 1000)} m away`
                : `~${job.distance_km.toFixed(1)} km away`
              : "Calculating..."}
          </dd>
        </div>
        {job.address_label && (
          <div className="rounded-lg bg-bg p-2 sm:col-span-2">
            <dt className="text-muted">Location</dt>
            <dd className="font-semibold text-text">{job.address_label}</dd>
          </div>
        )}
      </div>

      {pendingCounter && (
        <p className="mt-3 rounded-lg bg-surface px-3 py-1.5 text-xs text-muted">
          Counter-offer submitted (<span className="font-mono">Rs {job.my_offer?.counter_price?.toLocaleString("en-PK")}</span>) —
          waiting for the customer to approve.
        </p>
      )}

      {clarifying && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask the customer a question…"
            aria-label="Clarification question"
            className="w-full rounded-xl border border-divider bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <motion.button
            type="button"
            onClick={() => void askClarification()}
            disabled={busy === "clarify" || !question.trim()}
            className="btn-primary shrink-0 !rounded-xl !px-3 !py-2 text-sm disabled:opacity-60"
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            Send
          </motion.button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-warning">{error}</p>}

      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-divider pt-3">
        {pendingCounter ? (
          <span className="badge bg-surface text-muted">Awaiting customer approval</span>
        ) : (
          <>
            {!expired && (
              <>
                <motion.button
                  type="button"
                  onClick={() =>
                    void act("accept", async () => {
                      await postJson(`/api/jobs/${job.id}/accept`);
                      router.push("/dashboard/worker/active");
                    })
                  }
                  disabled={busy !== null}
                  className="btn-primary !rounded-xl !px-4 !py-2 text-sm disabled:opacity-60"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  {busy === "accept" ? "Accepting…" : "Accept offer"}
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
              </>
            )}
            <motion.button
              type="button"
              onClick={() =>
                void act("decline", () =>
                  postJson(`/api/jobs/${job.id}/decline`, { type: "decline" })
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
            <motion.button
              type="button"
              onClick={() => setClarifying((v) => !v)}
              disabled={busy !== null}
              className="rounded-xl border border-divider bg-surface px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-bg disabled:opacity-60"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              Ask clarification
            </motion.button>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showCounter && (
          <CounterOfferModal
            key={job.id}
            job={job}
            onClose={() => setShowCounter(false)}
            onSubmitted={() => {
              setShowCounter(false);
              onChanged();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
