"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DirectRequestView } from "@/lib/worker/dashboard";

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
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge shrink-0 !bg-[#0e5f44] !text-white">
              {CATEGORY_LABELS[req.category] ?? req.category}
            </span>
            <span className={`badge shrink-0 ${
              req.urgency === "emergency" ? "!bg-red-600 !text-white" : "!bg-stone-100 !text-stone-600"
            }`}>
              {req.urgency === "emergency" ? "Emergency" : "Normal"}
            </span>
          </div>
          <p className="mt-2 font-urdu text-lg font-bold leading-relaxed text-stone-800">
            {req.original_text}
          </p>
        </div>
      </div>

      <p className="mt-1 line-clamp-2 text-sm text-stone-600">{req.description}</p>

      {req.required_skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {req.required_skills.map((skill) => (
            <span key={skill} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-500">
        <div className="rounded-lg bg-stone-50 p-2">
          <dt className="text-stone-400">Customer offer</dt>
          <dd className="font-semibold text-stone-800">{currency(req.customer_offer)}</dd>
        </div>
        <div className="rounded-lg bg-stone-50 p-2">
          <dt className="text-stone-400">Location</dt>
          <dd className="truncate font-semibold text-stone-800">{req.address_label || "Not shared"}</dd>
        </div>
      </div>

      {hasPendingCounter && (
        <p className="mt-3 rounded-lg bg-cyan-50 px-3 py-1.5 text-xs text-cyan-800">
          Your counter: {currency(req.my_counter_price!)} — waiting for customer response.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-3">
        {hasPendingCounter ? (
          <span className="badge !bg-cyan-100 !text-cyan-800">Awaiting customer approval</span>
        ) : (
          <>
            <button
              type="button"
              onClick={() =>
                void act("accept", async () => {
                  await postJson("/api/requests/respond", { offer_id: req.offer_id, action: "accept" });
                  router.push("/dashboard/worker/work");
                })
              }
              disabled={busy !== null}
              className="rounded-xl bg-[#0e5f44] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b4c37] disabled:opacity-60"
            >
              {busy === "accept" ? "Accepting…" : "Accept"}
            </button>
            <button
              type="button"
              onClick={() => setShowCounter(true)}
              disabled={busy !== null}
              className="rounded-xl border border-[#0e5f44] px-4 py-2 text-sm font-semibold text-[#0e5f44] transition hover:bg-emerald-50 disabled:opacity-60"
            >
              Counter-offer
            </button>
            <button
              type="button"
              onClick={() =>
                void act("decline", () =>
                  postJson("/api/requests/respond", { offer_id: req.offer_id, action: "decline" })
                )
              }
              disabled={busy !== null}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
            >
              {busy === "decline" ? "Declining…" : "Decline"}
            </button>
          </>
        )}
      </div>

      {showCounter && (
        <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
          <div>
            <label htmlFor={`counter-${req.offer_id}`} className="mb-1 block text-xs font-semibold text-stone-500">
              Your price (PKR)
            </label>
            <input
              id={`counter-${req.offer_id}`}
              type="number"
              min={1}
              value={counterPrice}
              onChange={(e) => setCounterPrice(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              disabled={busy !== null}
            />
          </div>
          <div>
            <label htmlFor={`msg-${req.offer_id}`} className="mb-1 block text-xs font-semibold text-stone-500">
              Message (optional)
            </label>
            <input
              id={`msg-${req.offer_id}`}
              type="text"
              value={counterMsg}
              onChange={(e) => setCounterMsg(e.target.value)}
              placeholder="e.g. Additional parts needed"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              disabled={busy !== null}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCounter(false)}
              disabled={busy !== null}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitCounter()}
              disabled={busy !== null || !counterPrice}
              className="flex-1 rounded-lg bg-[#0e5f44] px-3 py-2 text-sm font-bold text-white hover:bg-[#0b4c37] disabled:opacity-60"
            >
              {busy === "counter" ? "Submitting…" : "Submit counter"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
