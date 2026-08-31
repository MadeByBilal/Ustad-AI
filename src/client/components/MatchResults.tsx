"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconShieldCheck,
  IconStarFilled,
  IconMapPin,
  IconClock,
  IconTools,
  IconCircleCheck,
} from "@tabler/icons-react";
import type { WorkerCategory, UrgencyLevel } from "@/server/models";
import type { WorkerOption } from "@/server/lib/matching";
import type { AiUnderstandResult } from "@/server/lib/job/ai";
import { cn } from "@/client/lib/cn";
import TechnicianRequestModal from "./TechnicianRequestModal";

export interface MatchResultsData extends AiUnderstandResult {
  transcript?: string;
  workers: { best: WorkerOption | null; others: WorkerOption[]; ranked?: WorkerOption[] };
}

const CATEGORY_LABELS: Record<WorkerCategory, string> = {
  plumber: "Plumber",
  electrician: "Electrician",
  ac_technician: "AC Technician",
  carpenter: "Carpenter",
};

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  normal: "Normal",
  potentially_urgent: "Potentially urgent",
  emergency: "Emergency",
};

const URGENCY_DOT: Record<UrgencyLevel, string> = {
  normal: "bg-muted",
  potentially_urgent: "bg-warning",
  emergency: "bg-warning",
};

function formatPKR(n: number): string {
  return `PKR ${n.toLocaleString("en-PK")}`;
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export interface MatchResultsProps {
  data: MatchResultsData;
  location?: { lat: number; lng: number } | null;
  onRequestSent?: (jobId: string) => void;
}

/**
 * Match / pricing screen.
 *
 * Locked visual contract:
 * - Background uses bg-bg, cards use bg-surface. No whites.
 * - Green (success/verified) is reserved for verified + availability + success only.
 * - All numeric values (price, distance, rating, response rate, match score) use JetBrains Mono.
 * - Screen title + section headings use Fraunces.
 * - Trust signal row (verified + rating + response + distance) lives in one row beneath the name.
 * - Tabler icons: shield-check, star-filled, map-pin, clock, tools.
 * - The "Send Request" button uses the accent copper, never green.
 */
export default function MatchResults({ data, location, onRequestSent }: MatchResultsProps) {
  const u = data.understanding;
  const ranked = data.workers.ranked ?? [
    ...(data.workers.best ? [data.workers.best] : []),
    ...data.workers.others,
  ];
  const anyWorker = ranked.length > 0;

  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(null);
  const [sentJobId, setSentJobId] = useState<string | null>(null);

  const categoryLabel = u.category ? CATEGORY_LABELS[u.category] ?? u.category : null;

  return (
    <div className="flex flex-col gap-6 text-text">
      {/* Screen title */}
      <header className="flex flex-col gap-1">
        <p className="font-urdu text-sm text-muted">اُستاد کی تلاش</p>
        <h2 className="font-display text-3xl font-semibold leading-tight text-text">
          {categoryLabel
            ? `Best matches for ${categoryLabel.toLowerCase()} work`
            : location
              ? "Best matches near you"
              : "Available ustads"}
        </h2>
      </header>

      {/* AI understanding card */}
      <section className="rounded-xl border border-divider bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bg">
              <IconTools size={16} stroke={1.6} className="text-accent" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold uppercase tracking-wide text-muted">
              AI Understanding
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn("h-2 w-2 rounded-full", URGENCY_DOT[u.urgency])}
              aria-hidden="true"
            />
            <span className="font-mono text-xs uppercase tracking-wide text-muted">
              {URGENCY_LABELS[u.urgency] ?? u.urgency}
            </span>
          </div>
        </div>

        {u.description && (
          <p className="mt-3 text-sm leading-relaxed text-text/90">
            &ldquo;{u.description}&rdquo;
          </p>
        )}

        {u.required_skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {u.required_skills.map((s) => (
              <span
                key={s}
                className="rounded-full border border-divider bg-bg px-2.5 py-1 font-mono text-xs text-muted"
              >
                {s.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        {u.safety_flags.length > 0 && (
          <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
            <p className="font-mono text-xs uppercase tracking-wide text-warning">
              Safety note
            </p>
            <p className="mt-1 text-sm text-warning/90">{u.safety_flags.join(", ")}</p>
          </div>
        )}

        {u.confidence > 0 && (
          <p className="mt-3 font-mono text-xs uppercase tracking-wide text-muted">
            AI confidence · <span className="text-text">{Math.round(u.confidence * 100)}%</span>
          </p>
        )}
      </section>

      {/* Pricing card */}
      {u.category && (
        <section className="rounded-xl border border-divider bg-surface p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-muted">
            Pricing
          </p>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-mono text-base text-muted">Visit fee</span>
            <span className="font-mono text-2xl font-medium text-text">
              {formatPKR(u.inspection_fee)}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-mono text-base text-muted">Repair est.</span>
            {u.estimate_min > 0 ? (
              <span className="font-mono text-2xl font-medium text-text">
                {formatPKR(u.estimate_min)}
                <span className="mx-2 text-muted">–</span>
                {formatPKR(u.estimate_max)}
              </span>
            ) : (
              <span className="font-mono text-base text-muted">after on-site check</span>
            )}
          </div>
          {u.complexity && (
            <p className="mt-3 font-mono text-xs uppercase tracking-wide text-muted">
              Complexity · <span className="text-text">{u.complexity}</span>
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-muted">
            آپ پہلے صرف معائنہ فیس دیتے ہیں — اصل مرمت کی قیمت اُستاد کے معائنے کے بعد طے ہوگی۔
          </p>
        </section>
      )}

      {/* Worker list */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-xl font-semibold text-text">
            {anyWorker ? `${ranked.length} ustads ranked` : "No ustads available"}
          </h3>
          {anyWorker && (
            <span className="font-mono text-xs uppercase tracking-wide text-muted">
              Sorted by match
            </span>
          )}
        </div>

        {anyWorker ? (
          <ul className="flex flex-col gap-3">
            {ranked.map((w, i) => (
              <li key={w.id}>
                <WorkerMatchCard
                  worker={w}
                  rank={i + 1}
                  onSend={() => setSelectedWorker(w)}
                  sent={sentJobId !== null}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-divider bg-surface p-6 text-center">
            <p className="text-sm text-muted">
              No ustads available right now — try again in a few minutes.
            </p>
          </div>
        )}
      </section>

      <AnimatePresence mode="wait">
        {selectedWorker && (
          <TechnicianRequestModal
            key={selectedWorker.id}
            worker={selectedWorker}
            understanding={u}
            input={{
              type: data.transcript ? "voice" : "text",
              original_text: u.description ?? "",
              transcript: data.transcript,
            }}
            location={location}
            onClose={() => setSelectedWorker(null)}
            onSubmitted={(result) => {
              setSelectedWorker(null);
              setSentJobId(result.job_id);
              onRequestSent?.(result.job_id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function WorkerMatchCard({
  worker,
  rank,
  onSend,
  sent,
}: {
  worker: WorkerOption;
  rank: number;
  onSend: () => void;
  sent: boolean;
}) {
  const isBest = rank === 1;
  const categoryLabel = CATEGORY_LABELS[worker.category] ?? worker.category;

  return (
    <article
      data-testid={`match-card-${worker.id}`}
      data-best-match={isBest ? "true" : "false"}
      className={cn(
        "rounded-xl border bg-surface p-5 transition-colors",
        isBest ? "border-accent" : "border-divider",
      )}
    >
      <div className="flex items-start gap-4">
        <Avatar name={worker.name} verified={worker.verified} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-lg font-semibold leading-tight text-text">
              {worker.name}
            </h4>
            {isBest && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 font-mono text-xs uppercase tracking-wide text-accent">
                Best match
              </span>
            )}
            {worker.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs font-medium text-success-fg">
                <IconShieldCheck size={12} stroke={2} aria-hidden="true" />
                Verified
              </span>
            )}
          </div>

          {/* Trade category with tools icon */}
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <IconTools size={14} stroke={1.6} className="text-muted" aria-hidden="true" />
            <span>{categoryLabel}</span>
          </div>

          {/* Trust signal row — single row, JetBrains Mono numbers */}
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <li
              className="flex items-center gap-1.5"
              data-testid="trust-rating"
              aria-label={`Rating ${worker.average_rating.toFixed(1)} out of 5`}
            >
              <IconStarFilled size={14} stroke={0} className="text-warning" aria-hidden="true" />
              <span className="font-mono text-text">{worker.average_rating.toFixed(1)}</span>
              <span className="font-mono text-xs text-muted">/ 5</span>
            </li>

            {typeof worker.response_rate === "number" && (
              <li
                className="flex items-center gap-1.5"
                data-testid="trust-response"
                aria-label={`Response rate ${Math.round(worker.response_rate)} percent`}
              >
                <IconClock size={14} stroke={1.6} className="text-muted" aria-hidden="true" />
                <span className="font-mono text-text">{Math.round(worker.response_rate)}%</span>
                <span className="font-mono text-xs text-muted">responds</span>
              </li>
            )}

            {worker.distance_km != null && worker.distance_km > 0 && (
              <li
                className="flex items-center gap-1.5"
                data-testid="trust-distance"
                aria-label={`Distance ${worker.distance_km.toFixed(1)} kilometres`}
              >
                <IconMapPin size={14} stroke={1.6} className="text-muted" aria-hidden="true" />
                <span className="font-mono text-text">{worker.distance_km.toFixed(1)}</span>
                <span className="font-mono text-xs text-muted">km</span>
              </li>
            )}
          </ul>

          {worker.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {worker.skills.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-divider bg-bg px-2.5 py-1 font-mono text-xs text-muted"
                >
                  {s.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}

          {/* Match score + price block — labelled, mono */}
          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-divider pt-4">
            <div data-testid="match-score">
              <p className="font-mono text-xs uppercase tracking-wide text-muted">
                Match score
              </p>
              <p className="mt-1 font-mono text-2xl font-medium text-text">
                {Math.round(worker.final_score)}
                <span className="ml-1 font-mono text-sm text-muted">/ 100</span>
              </p>
            </div>
            {worker.predicted_price != null && worker.predicted_price > 0 && (
              <div data-testid="predicted-price">
                <p className="font-mono text-xs uppercase tracking-wide text-muted">
                  Est. price
                </p>
                <p className="mt-1 font-mono text-2xl font-medium text-text">
                  {formatPKR(worker.predicted_price)}
                </p>
              </div>
            )}
            {worker.travel_cost_pkr != null && worker.travel_cost_pkr > 0 && (
              <div data-testid="travel-cost">
                <p className="font-mono text-xs uppercase tracking-wide text-muted">
                  Travel
                </p>
                <p className="mt-1 font-mono text-base text-text">
                  {formatPKR(worker.travel_cost_pkr)}
                </p>
              </div>
            )}
          </div>

          {/* Send Request — accent (copper) button, NOT green */}
          <div className="mt-4">
            {sent ? (
              <div
                role="status"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-success/40 bg-success/15 px-5 py-3 text-sm font-medium text-success-fg"
              >
                <IconCircleCheck size={16} stroke={1.8} aria-hidden="true" />
                Request sent — waiting for response
              </div>
            ) : (
              <motion.button
                type="button"
                onClick={onSend}
                data-testid={`send-request-${worker.id}`}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={cn(
                  "inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-base font-semibold transition-colors",
                  "bg-accent text-bg hover:bg-accent/90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                  "active:scale-[0.98]",
                )}
              >
                Send request to {worker.name.split(" ")[0]}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Avatar({ name, verified }: { name: string; verified: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border",
        verified
          ? "border-success/60 bg-success/15"
          : "border-divider bg-bg",
      )}
    >
      <span className="font-display text-lg font-semibold text-text">
        {initials(name)}
      </span>
      {verified && (
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-success">
          <IconShieldCheck size={10} stroke={2.4} className="text-success-fg" />
        </span>
      )}
    </div>
  );
}
