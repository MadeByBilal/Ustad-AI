"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { parseApiResponse } from "@/lib/api-client";

const POLL_MS = 10000;

const CATEGORY_LABELS: Record<string, string> = {
  plumber: "Plumber",
  electrician: "Electrician",
  ac_technician: "AC Technician",
  carpenter: "Carpenter",
};

const currency = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

interface RequestItem {
  job_id: string;
  status: string;
  category: string;
  description: string;
  original_text: string;
  urgency: string;
  customer_offer: number;
  worker_counter_price: number | null;
  final_price: number | null;
  address_label: string;
  created_at: string;
  latest_offer: {
    offer_id: string;
    type: string;
    status: string;
    counter_price: number | null;
    worker_id: string;
  } | null;
}

interface ListResponse {
  requests: RequestItem[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  BROADCASTING: { label: "Waiting for response", color: "bg-amber-100 text-amber-800" },
  WORKER_RESPONSES: { label: "Negotiating", color: "bg-blue-100 text-blue-800" },
  ACCEPTED: { label: "Confirmed", color: "bg-emerald-100 text-emerald-800" },
  EN_ROUTE: { label: "On the way", color: "bg-green-100 text-green-800" },
  ARRIVED: { label: "Arrived", color: "bg-blue-100 text-blue-800" },
  IN_PROGRESS: { label: "Work in progress", color: "bg-violet-100 text-violet-800" },
  CANCELLED: { label: "Declined", color: "bg-red-100 text-red-700" },
};

async function postJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = (await res.json().catch(() => null)) as {
    success?: boolean;
    error?: string;
  } | null;
  if (!res.ok || !parsed?.success) {
    throw new Error(parsed?.error ?? `Request failed (${res.status})`);
  }
}

export default function CustomerRequestsPanel() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const body = await parseApiResponse<ListResponse>(
        await fetch("/api/requests/list", { cache: "no-store" })
      );
      setData(body);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  async function handleCounterResponse(offerId: string, action: "accept" | "decline") {
    setBusy(`${offerId}-${action}`);
    try {
      await postJson("/api/requests/counter-response", { offer_id: offerId, action });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const requests = data?.requests ?? [];

  if (requests.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 text-base font-bold text-stone-800">Recent Requests</h2>
      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}
      <div className="space-y-3">
        {requests.map((req) => {
          const statusInfo = STATUS_LABELS[req.status] ?? { label: req.status, color: "bg-stone-100 text-stone-600" };
          const hasCounter = req.latest_offer?.type === "counter_offer" && req.latest_offer?.status === "pending";
          return (
            <div key={req.job_id} className="card">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge shrink-0 !bg-[#0e5f44] !text-white">
                    {CATEGORY_LABELS[req.category] ?? req.category}
                  </span>
                  <span className={`badge shrink-0 ${statusInfo.color}`}>{statusInfo.label}</span>
                </div>
                <span className="text-sm text-stone-400">
                  {new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-base text-stone-800">{req.original_text}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-stone-500">
                <span>Your offer: {currency(req.customer_offer)}</span>
                {req.worker_counter_price && (
                  <span className="text-blue-700">Counter: {currency(req.worker_counter_price)}</span>
                )}
                {req.final_price && (
                  <span className="font-semibold text-emerald-700">Final: {currency(req.final_price)}</span>
                )}
              </div>
              {hasCounter && (
                <div className="mt-4 flex gap-3 border-t border-stone-100 pt-4">
                  <button
                    type="button"
                    onClick={() => void handleCounterResponse(req.latest_offer!.offer_id, "accept")}
                    disabled={busy !== null}
                    className="btn-primary flex-1 !py-3 text-sm"
                  >
                    {busy === `${req.latest_offer!.offer_id}-accept` ? "Accepting…" : "Accept counter"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCounterResponse(req.latest_offer!.offer_id, "decline")}
                    disabled={busy !== null}
                    className="btn-secondary flex-1 !py-3 text-sm"
                  >
                    Decline
                  </button>
                </div>
              )}
              {["EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(req.status) && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <Link
                    href={`/dashboard/customer/track/${req.job_id}`}
                    className="btn-primary w-full"
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    Track live location
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
