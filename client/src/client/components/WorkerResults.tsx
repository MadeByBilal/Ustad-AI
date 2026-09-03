"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseApiResponse } from "@/client/lib/api-client";
import { Star } from "lucide-react";
import CustomerOfferModal from "@/client/components/worker/CustomerOfferModal";

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
    pricing: {
      final_price: number | null;
      estimate_min?: number;
      estimate_max?: number;
    };
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
  const [offerModalWorkerId, setOfferModalWorkerId] = useState<string | null>(null);
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
      <div className="rounded-xl border border-success/40 bg-success p-6 text-center">
        <p className="text-lg font-semibold text-success-fg">
          {urgency === "emergency" ? `${hired.name} arrived` : `Hired ${hired.name}`}
        </p>
        {finalPrice !== null && (
          <p className="mt-2 text-success-fg">Final price: {formatRs(finalPrice)}</p>
        )}
        {urgency === "emergency" && (
          <p className="mt-1 text-sm text-success-fg/80">Assigned automatically — keep your phone close</p>
        )}
      </div>
    );
  }

  const responders = detail?.responders ?? [];
  const isAccepted =
    detail?.job.status === "ACCEPTED" && detail.job.matching.selected_worker_id !== null;

  if (detail && !isAccepted && urgency === "normal" && deadlinePassed && responders.length === 0) {
    return (
      <div className="rounded-xl border border-divider bg-surface p-6 text-center">
        <p className="text-muted">No ustads responded yet</p>
      </div>
    );
  }

  if (responders.length === 0) {
    return (
      <div className="rounded-xl border border-divider bg-surface p-6 text-center">
        <p className="text-muted">
          {urgency === "emergency"
            ? "Finding nearest available worker…"
            : "Waiting for ustads to respond…"}
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-3">
      {error && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
            <p className="text-sm text-warning">{error}</p>
        </div>
      )}
      <p className="text-sm font-medium text-muted">
        {responders.length} ustad{responders.length === 1 ? "" : "s"} responded
      </p>
      {responders.map((responder) => {
        const worker = responder.worker;
        const isExpanded = expanded === worker.id;
        const offer = responder.offer;
        return (
          <div
            key={worker.id}
            className="glass-card p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-bg">
                Ustad {worker.ustad_score}
              </span>
              {worker.verified && (
                <span className="rounded-full bg-success px-2 py-0.5 text-xs font-medium text-success-fg">
                  Verified
                </span>
              )}
              {urgency === "emergency" && (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                  Emergency
                </span>
              )}
              <span className="text-sm font-semibold">{worker.name}</span>
              <span className="font-mono text-sm text-muted"><Star className="h-3.5 w-3.5 text-warning inline" /> {worker.average_rating}</span>
              {responder.distance_km !== null && (
                <span className="font-mono text-sm text-muted">
                  {responder.distance_km < 1
                    ? `${Math.round(responder.distance_km * 1000)} m`
                    : `${responder.distance_km.toFixed(1)} km`}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted">{worker.skills.join(", ")}</p>
            {offer && (
              <p className="mt-2 text-sm text-text">
                Your offer {formatRs(customerOffer ?? 0)}
                {offer.counter_price > 0 && (
                  <span className="text-accent"> · Counter {formatRs(offer.counter_price)}</span>
                )}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <motion.button
                type="button"
                className="btn btn-outline"
                onClick={() => setExpanded(isExpanded ? null : worker.id)}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {isExpanded ? "− Hide Profile" : "+ View Profile"}
              </motion.button>
              <motion.button
                type="button"
                className="btn btn-outline text-accent hover:bg-bg"
                onClick={() => setOfferModalWorkerId(worker.id)}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                Make Offer
              </motion.button>
              <motion.button
                type="button"
                disabled={busy}
                className="btn btn-primary"
                onClick={() => hire(worker)}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                Hire {worker.name}
              </motion.button>
            </div>
            {isExpanded && (
              <div className="mt-3 border-t border-divider pt-3 text-sm text-muted">
                <p>{worker.completed_jobs} jobs completed</p>
                <p>{worker.verification_level}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
    <AnimatePresence mode="wait">
      {offerModalWorkerId != null && (
        <CustomerOfferModal
          key={offerModalWorkerId}
          jobId={jobId}
          workerId={offerModalWorkerId}
          workerName={responders.find((r) => r.worker.id === offerModalWorkerId)?.worker.name || "Worker"}
          currentOffer={customerOffer}
          estimateMin={detail?.job.pricing?.estimate_min ?? 0}
          estimateMax={detail?.job.pricing?.estimate_max ?? 0}
          onClose={() => setOfferModalWorkerId(null)}
          onSubmitted={() => {
            setOfferModalWorkerId(null);
            // Refresh the detail to show updated offer
            void (async () => {
              const body = await parseApiResponse<JobDetailResponse>(
                await fetch(`/api/jobs/${jobId}`)
              );
              setDetail(body);
            })();
          }}
        />
      )}
    </AnimatePresence>
    </>
  );
}
