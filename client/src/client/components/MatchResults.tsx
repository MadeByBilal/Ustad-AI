"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconStarFilled,
  IconMapPin,
  IconMicrophone,
} from "@tabler/icons-react";
import type { WorkerCategory, WorkerOption } from "@contracts/worker";
import type { AiUnderstandResult } from "@contracts/ai";
import { cn } from "@/client/lib/cn";
import SplitText from "./SplitText";
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

const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.3,
    },
  },
};

const cardItem = {
  hidden: { opacity: 0, y: 60, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
      mass: 0.8,
    },
  },
};

export default function MatchResults({ data, location, onRequestSent }: MatchResultsProps) {
  const u = data.understanding;
  const ranked = data.workers.ranked ?? [
    ...(data.workers.best ? [data.workers.best] : []),
    ...data.workers.others,
  ];
  const anyWorker = ranked.length > 0;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [offerFor, setOfferFor] = useState<string | null>(null);

  const selectedWorker = ranked.find((w) => w.id === selectedId) ?? null;
  const activeWorker = ranked.find((w) => w.id === offerFor) ?? null;

  return (
    <div className="flex flex-col gap-6 text-text">
      {/* Animated header */}
      <header className="flex flex-col items-center gap-2 text-center">
        <SplitText
          text="Ustad Suggestions"
          className="font-display text-3xl font-semibold text-text"
          splitType="chars"
          delay={40}
          duration={1.0}
          from={{ opacity: 0, y: 30 }}
          to={{ opacity: 1, y: 0 }}
          tag="h2"
        />
        <SplitText
          text={anyWorker
            ? `${ranked.length} ustads available`
            : "No ustads available"}
          className="font-mono text-sm text-muted"
          splitType="words"
          delay={30}
          duration={0.8}
          from={{ opacity: 0, y: 15 }}
          to={{ opacity: 1, y: 0 }}
          tag="p"
        />
      </header>

      {/* Transcription */}
      {data.transcript && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
          className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15">
            <IconMicrophone size={16} className="text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              You said
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-text">
              {data.transcript}
            </p>
          </div>
        </motion.div>
      )}

      {/* Worker list */}
      <section className="flex flex-col gap-3">
        {anyWorker ? (
          <motion.ul
            className="flex flex-col gap-3"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {ranked.map((w, i) => (
              <motion.li key={w.id} variants={cardItem}>
                <WorkerMatchCard
                  worker={w}
                  rank={i + 1}
                  selected={selectedId === w.id}
                  onSelect={() => setSelectedId(selectedId === w.id ? null : w.id)}
                />
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
            className="rounded-xl border border-divider bg-surface p-6 text-center"
          >
            <p className="text-sm text-muted">
              No ustads available right now — try again in a few minutes.
            </p>
          </motion.div>
        )}
      </section>

      {/* Sticky offer button */}
      <AnimatePresence>
        {selectedWorker && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <button
              type="button"
              onClick={() => setOfferFor(selectedId)}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold shadow-lg transition-colors",
                "bg-accent text-bg hover:bg-accent/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              )}
            >
              Offer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeWorker && (
          <TechnicianRequestModal
            key={activeWorker.id}
            worker={activeWorker}
            understanding={u}
            input={{
              type: data.transcript ? "voice" : "text",
              original_text: u.description ?? "",
              transcript: data.transcript,
            }}
            location={location}
            onClose={() => setOfferFor(null)}
            onSubmitted={(result) => {
              setOfferFor(null);
              setSelectedId(null);
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
  selected,
  onSelect,
}: {
  worker: WorkerOption;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const isBest = rank === 1;
  const categoryLabel = CATEGORY_LABELS[worker.category] ?? worker.category;

  return (
    <article
      data-testid={`match-card-${worker.id}`}
      data-best-match={isBest ? "true" : "false"}
      onClick={onSelect}
      className={cn(
        "cursor-pointer rounded-xl border bg-surface p-5 transition-all",
        selected
          ? "border-accent ring-2 ring-accent/20"
          : isBest
            ? "border-accent"
            : "border-divider hover:border-accent/40",
      )}
    >
      <div className="flex items-start gap-4">
        <Avatar name={worker.name} />
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
          </div>

          {/* Trade category */}
          <div className="mt-1 text-sm text-muted">
            <span>{categoryLabel}</span>
          </div>

          {/* Rating + distance */}
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <li
              className="flex items-center gap-1.5"
              aria-label={`Rating ${worker.average_rating.toFixed(1)} out of 5`}
            >
              <IconStarFilled size={14} stroke={0} className="text-warning" aria-hidden="true" />
              <span className="font-mono text-text">{worker.average_rating.toFixed(1)}</span>
              <span className="font-mono text-xs text-muted">/ 5</span>
            </li>

            {worker.distance_km != null && worker.distance_km > 0 && (
              <li
                className="flex items-center gap-1.5"
                aria-label={`Distance ${worker.distance_km.toFixed(1)} km`}
              >
                <IconMapPin size={14} stroke={1.6} className="text-muted" aria-hidden="true" />
                <span className="font-mono text-text">{worker.distance_km.toFixed(1)}</span>
                <span className="font-mono text-xs text-muted">km</span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </article>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-divider bg-bg"
    >
      <span className="font-display text-base font-semibold text-text">
        {initials(name)}
      </span>
    </div>
  );
}
