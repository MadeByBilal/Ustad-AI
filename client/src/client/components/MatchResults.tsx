"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconStarFilled,
  IconMapPin,
  IconMicrophone,
  IconBriefcase,
  IconTrophy,
} from "@tabler/icons-react";
import type { WorkerCategory, WorkerOption } from "@contracts/worker";
import type { AiUnderstandResult } from "@contracts/ai";
import { cn } from "@/client/lib/cn";
import { BOTTOM_NAV_BOTTOM_OFFSET } from "@/client/lib/layout-constants";
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
          className="font-display text-2xl font-semibold text-text sm:text-3xl"
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
            className="glass-card p-6 text-center"
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
            className="fixed inset-x-0 z-50 flex justify-center p-4"
            style={{ bottom: BOTTOM_NAV_BOTTOM_OFFSET }}
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
        "glass-card",
        isBest ? "p-5 sm:p-5" : "p-4 sm:p-5",
        selected
          ? "border-2 border-accent ring-2 ring-accent/40"
          : isBest
            ? "border-warning/25"
            : "border-white/[0.06]",
      )}
    >
      <div className={cn("flex items-start gap-4", isBest && "gap-5")}>
        <Avatar name={worker.name} isBest={isBest} />
        <div className="min-w-0 flex-1">
          {/* Name + badge row */}
          <div className="flex items-center gap-2.5">
            <h4 className={cn(
              "font-display font-semibold leading-tight text-text truncate",
              isBest ? "text-xl" : "text-lg",
            )}>
              {worker.name}
            </h4>
            {isBest && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-warning">
                <IconTrophy size={10} stroke={2} />
                Best Match
              </span>
            )}
          </div>

          {/* Category */}
          <p className={cn("text-muted", isBest ? "mt-1 text-base" : "mt-0.5 text-sm")}>
            {categoryLabel}
          </p>

          {/* Stats row */}
          <div className={cn("flex items-center gap-3 text-sm", isBest ? "mt-3" : "mt-2.5")}>
            {/* Distance — always exact */}
            <span className="flex items-center gap-1 text-text">
              <IconMapPin size={15} stroke={1.8} className="text-muted" />
              {worker.distance_km != null
                ? worker.distance_km < 1
                  ? `${Math.round(worker.distance_km * 1000)} m`
                  : `${worker.distance_km.toFixed(1)} km`
                : "—"}
            </span>

            <span className="text-white/10">|</span>

            {/* Completed jobs */}
            <span className="flex items-center gap-1 text-text">
              <IconBriefcase size={15} stroke={1.8} className="text-muted" />
              {worker.completed_jobs} jobs
            </span>

            <span className="text-white/10">|</span>

            {/* Rating */}
            <span className="flex items-center gap-1" aria-label={`Rating ${worker.average_rating.toFixed(1)} out of 5`}>
              <IconStarFilled size={14} stroke={0} className="text-warning" />
              <span className="text-text">{worker.average_rating.toFixed(1)}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function Avatar({ name, isBest }: { name: string; isBest?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center rounded-full border ${
        isBest
          ? "h-20 w-20 border-warning/30 bg-warning/10"
          : "h-16 w-16 border-white/[0.06] bg-white/[0.04]"
      }`}
    >
      <span className={`font-display font-semibold ${isBest ? "text-2xl text-warning" : "text-lg text-text"}`}>
        {initials(name)}
      </span>
    </div>
  );
}
