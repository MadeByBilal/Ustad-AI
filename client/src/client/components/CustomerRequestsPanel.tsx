"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { parseApiResponse, getApiErrorMessage } from "@/client/lib/api-client";

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
  BROADCASTING: { label: "Waiting for response", color: "bg-warning/10 text-warning" },
  WORKER_RESPONSES: { label: "Negotiating", color: "bg-surface text-muted" },
  ACCEPTED: { label: "Confirmed", color: "bg-success text-success-fg" },
  EN_ROUTE: { label: "On the way", color: "bg-accent/15 text-accent" },
  ARRIVED: { label: "Arrived", color: "bg-accent/15 text-accent" },
  IN_PROGRESS: { label: "Work in progress", color: "bg-accent/15 text-accent" },
  CANCELLED: { label: "Declined", color: "bg-warning/10 text-warning" },
};

async function postJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = (await res.json().catch(() => null)) as {
    success?: boolean;
    error?: unknown;
  } | null;
  if (!res.ok || !parsed?.success) {
    throw new Error(getApiErrorMessage(parsed, `Request failed (${res.status})`));
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
        <h2 className="mb-3 font-display text-base font-bold text-text">Recent Requests</h2>
      {error && (
        <p className="mb-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning">{error}</p>
      )}
      <div className="space-y-3">
        {requests.map((req) => {
          const statusInfo = STATUS_LABELS[req.status] ?? { label: req.status, color: "bg-surface text-muted" };
          const hasCounter = req.latest_offer?.type === "counter_offer" && req.latest_offer?.status === "pending";
          return (
            <motion.div key={req.job_id} className="card" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge shrink-0 bg-accent text-bg">
                    {CATEGORY_LABELS[req.category] ?? req.category}
                  </span>
                  <span className={`badge shrink-0 ${statusInfo.color}`}>{statusInfo.label}</span>
                </div>
                <span className="text-sm text-muted">
                  {new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-base text-text">{req.original_text}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
                <span>Your offer: {currency(req.customer_offer)}</span>
                {req.worker_counter_price && (
                  <span className="text-accent">Counter: {currency(req.worker_counter_price)}</span>
                )}
                {req.final_price && (
                  <span className="font-semibold text-success-fg">Final: {currency(req.final_price)}</span>
                )}
              </div>
              {hasCounter && (
                <div className="mt-4 flex gap-3 border-t border-divider pt-4">
                  <motion.button
                    type="button"
                    onClick={() => void handleCounterResponse(req.latest_offer!.offer_id, "accept")}
                    disabled={busy !== null}
                    className="btn-primary flex-1 !py-3 text-sm"
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ y: -1 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    {busy === `${req.latest_offer!.offer_id}-accept` ? "Accepting…" : "Accept counter"}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => void handleCounterResponse(req.latest_offer!.offer_id, "decline")}
                    disabled={busy !== null}
                    className="btn-secondary flex-1 !py-3 text-sm"
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ y: -1 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    Decline
                  </motion.button>
                </div>
              )}
              {["EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(req.status) && (
                <div className="mt-4 border-t border-divider pt-4">
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
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
