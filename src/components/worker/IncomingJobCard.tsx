"use client";

import { useState } from "react";
import type { IncomingJobView } from "@/lib/worker/dashboard";
import CounterOfferModal from "./CounterOfferModal";

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
  const parsed = (await res.json().catch(() => null)) as {
    success?: boolean;
    error?: string;
  } | null;
  if (!res.ok || !parsed?.success) {
    throw new Error(parsed?.error ?? `Request failed (${res.status})`);
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
    <div className="rounded-xl border border-stone-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge shrink-0 !bg-[#0e5f44] !text-white">
              {job.category.replace(/_/g, " ")}
            </span>
            {job.subcategory && (
              <span className="badge shrink-0 !bg-stone-100 !text-stone-600">
                {job.subcategory.replace(/_/g, " ")}
              </span>
            )}
            <span
              className={`badge shrink-0 ${
                emergency ? "!bg-red-600 !text-white" : "!bg-stone-100 !text-stone-600"
              }`}
            >
              {emergency ? "Emergency" : "Normal"}
            </span>
          </div>
          <p className="mt-2 font-urdu text-lg font-bold leading-relaxed text-stone-800">
            {job.original_text}
          </p>
        </div>
        <span
          className={`badge shrink-0 font-mono ${
            expired
              ? "!bg-red-100 !text-red-700"
              : left
                ? "!bg-amber-100 !text-amber-800"
                : "!bg-stone-100 !text-stone-600"
          }`}
        >
          {expired ? "Expired" : left ? `⏱ ${left}` : "No deadline"}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-stone-600">{job.description}</p>

      {job.required_skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.required_skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600"
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
              className="h-16 w-16 rounded-lg object-cover ring-1 ring-stone-200"
            />
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-500 sm:grid-cols-4">
        <div className="rounded-lg bg-stone-50 p-2">
          <dt className="text-stone-400">Customer offer</dt>
          <dd className="font-semibold text-stone-800">
            Rs {job.customer_offer.toLocaleString("en-PK")}
          </dd>
        </div>
        <div className="rounded-lg bg-stone-50 p-2">
          <dt className="text-stone-400">Distance</dt>
          <dd className="font-semibold text-stone-800">
            {job.distance_km != null ? `~${job.distance_km} km` : "Unknown"}
          </dd>
        </div>
        <div className="rounded-lg bg-stone-50 p-2 sm:col-span-2">
          <dt className="text-stone-400">Location</dt>
          <dd className="truncate font-semibold text-stone-800">
            {job.address_label || "Area not shared"}
          </dd>
        </div>
      </div>

      {pendingCounter && (
        <p className="mt-3 rounded-lg bg-cyan-50 px-3 py-1.5 text-xs text-cyan-800">
          Counter-offer submitted (Rs {job.my_offer?.counter_price?.toLocaleString("en-PK")}) —
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
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0e5f44]"
          />
          <button
            type="button"
            onClick={() => void askClarification()}
            disabled={busy === "clarify" || !question.trim()}
            className="shrink-0 rounded-xl bg-[#0e5f44] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#0b4c37] disabled:opacity-60"
          >
            Send
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-3">
        {pendingCounter ? (
          <span className="badge !bg-cyan-100 !text-cyan-800">Awaiting customer approval</span>
        ) : (
          <>
            {!expired && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void act("accept", () =>
                      postJson(`/api/jobs/${job.id}/accept`)
                    )
                  }
                  disabled={busy !== null}
                  className="rounded-xl bg-[#0e5f44] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b4c37] disabled:opacity-60"
                >
                  {busy === "accept" ? "Accepting…" : "Accept offer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCounter(true)}
                  disabled={busy !== null}
                  className="rounded-xl border border-[#0e5f44] px-4 py-2 text-sm font-semibold text-[#0e5f44] transition hover:bg-emerald-50 disabled:opacity-60"
                >
                  Counter-offer
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() =>
                void act("decline", () =>
                  postJson("/api/offers", { job_id: job.id, type: "decline" })
                )
              }
              disabled={busy !== null}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
            >
              {busy === "decline" ? "Declining…" : "Decline"}
            </button>
            <button
              type="button"
              onClick={() => setClarifying((v) => !v)}
              disabled={busy !== null}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
            >
              Ask clarification
            </button>
          </>
        )}
      </div>

      {showCounter && (
        <CounterOfferModal
          job={job}
          onClose={() => setShowCounter(false)}
          onSubmitted={() => {
            setShowCounter(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}