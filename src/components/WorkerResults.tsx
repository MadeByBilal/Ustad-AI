"use client";

import { useEffect, useState } from "react";
import { parseApiResponse } from "@/lib/api-client";

const POLL_INTERVAL_MS = 3000;

export interface ResponderWorker {
  id: string;
  name: string;
  category: string;
  skills: string[];
  ustad_score: number;
  average_rating: number;
  completed_jobs: number;
  verified: boolean;
  verification_level: string;
  response_rate: number;
}

export interface ResponderOffer {
  type: string;
  status: string;
  offered_price: number;
  counter_price: number;
}

export interface Responder {
  worker: ResponderWorker;
  distance_km: number | null;
  offer: ResponderOffer | null;
}

export interface JobDetailResponse {
  job: {
    id: string;
    status: string;
    urgency: string;
    matching: { selected_worker_id: string | null };
    pricing: { final_price: number | null };
  };
  responders: Responder[];
}

interface WorkerResultsProps {
  jobId: string;
  urgency?: "normal" | "emergency";
  customerOffer: number | null;
  acceptanceDeadline: string;
}

function formatRs(amount: number): string {
  return `₨ ${amount.toLocaleString("en-PK")}`;
}

export default function WorkerResults({
  jobId,
  urgency = "normal",
  customerOffer,
  acceptanceDeadline,
}: WorkerResultsProps) {
  const [detail, setDetail] = useState<JobDetailResponse | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hired, setHired] = useState<ResponderWorker | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deadlinePassed = Date.now() > new Date(acceptanceDeadline).getTime();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const clear = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const tick = async () => {
      try {
        const body = await parseApiResponse<JobDetailResponse>(
          await fetch(`/api/jobs/${jobId}`)
        );
        if (cancelled) return;
        setDetail(body);
        if (body.job.status === "ACCEPTED" && body.job.matching.selected_worker_id) {
          clear();
          const hiredWorker =
            body.responders.find(
              (responder) =>
                responder.worker.id === body.job.matching.selected_worker_id
            ) ??
            (body.responders.length === 1 ? body.responders[0] : null);
          if (hiredWorker) {
            setHired(hiredWorker.worker);
            setFinalPrice(body.job.pricing.final_price);
          }
        }
      } catch {
        // Transient errors are ignored; the next poll retries.
      }
    };

    void tick();
    timer = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clear();
    };
  }, [jobId, acceptanceDeadline]);

  async function hire(worker: ResponderWorker) {
    setBusy(true);
    setError(null);
    try {
      const body = await parseApiResponse<{
        status: string;
        matching: { selected_worker_id: string };
        pricing: { final_price: number | null };
      }>(
        await fetch(`/api/jobs/${jobId}/select-worker`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worker_id: worker.id }),
        })
      );
      setHired(worker);
      setFinalPrice(body.pricing?.final_price ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not hire the ustad");
    } finally {
      setBusy(false);
    }
  }

  if (hired) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-lg font-semibold text-green-900">
          {urgency === "emergency" ? `${hired.name} arrived` : `Hired ${hired.name} 🎉`}
        </p>
        {finalPrice !== null && (
          <p className="mt-2 text-stone-700">Final price: {formatRs(finalPrice)}</p>
        )}
        {urgency === "emergency" && (
          <p className="mt-1 text-sm text-stone-600">Assigned automatically — keep your phone close</p>
        )}
      </div>
    );
  }

  const responders = detail?.responders ?? [];
  const isAccepted =
    detail?.job.status === "ACCEPTED" && detail.job.matching.selected_worker_id !== null;

  if (detail && !isAccepted && urgency === "normal" && deadlinePassed && responders.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center">
        <p className="text-stone-600">No ustads responded yet</p>
      </div>
    );
  }

  if (responders.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center">
        <p className="text-stone-600">
          {urgency === "emergency"
            ? "Finding nearest available worker…"
            : "Waiting for ustads to respond…"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <p className="text-sm font-medium text-stone-600">
        {responders.length} ustad{responders.length === 1 ? "" : "s"} responded
      </p>
      {responders.map((responder) => {
        const worker = responder.worker;
        const isExpanded = expanded === worker.id;
        const offer = responder.offer;
        return (
          <div
            key={worker.id}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#0e5f44] px-2 py-0.5 text-xs font-bold text-white">
                Ustad {worker.ustad_score}
              </span>
              {worker.verified && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  Verified
                </span>
              )}
              {urgency === "emergency" && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Emergency
                </span>
              )}
              <span className="text-sm font-semibold">{worker.name}</span>
              <span className="text-sm text-stone-500">⭐ {worker.average_rating}</span>
              {responder.distance_km !== null && (
                <span className="text-sm text-stone-500">{responder.distance_km.toFixed(1)} km</span>
              )}
            </div>
            <p className="mt-1 text-xs text-stone-500">{worker.skills.join(", ")}</p>
            {offer && (
              <p className="mt-2 text-sm text-stone-700">
                Your offer {formatRs(customerOffer ?? 0)}
                {offer.counter_price > 0 && (
                  <span className="text-green-700"> · Counter {formatRs(offer.counter_price)}</span>
                )}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setExpanded(isExpanded ? null : worker.id)}
              >
                {isExpanded ? "− Hide Profile" : "+ View Profile"}
              </button>
              <button
                type="button"
                disabled={busy}
                className="btn btn-primary"
                onClick={() => hire(worker)}
              >
                Hire {worker.name}
              </button>
            </div>
            {isExpanded && (
              <div className="mt-3 border-t border-stone-100 pt-3 text-sm text-stone-600">
                <p>{worker.completed_jobs} jobs completed</p>
                <p>{worker.verification_level}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}