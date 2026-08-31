"use client";

import { motion } from "framer-motion";
import type { Icon as TablerIcon } from "@tabler/icons-react";
import { cn } from "@/client/lib/cn";

export type EmptyStateIcon = TablerIcon;

export interface EmptyStateProps {
  icon: EmptyStateIcon;
  message: { urdu: string; english: string };
  ctaLabel: string;
  onCta: () => void;
  className?: string;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export default function EmptyState({
  icon: Icon,
  message,
  ctaLabel,
  onCta,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 rounded-xl border border-divider bg-surface p-8 text-center",
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg">
        <Icon size={32} stroke={1.5} className="text-muted" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <p className="font-urdu text-lg text-text">{message.urdu}</p>
        <p className="text-sm text-muted">{message.english}</p>
      </div>

      <motion.button
        type="button"
        onClick={onCta}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.18, ease: EASE_OUT }}
        className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-base font-semibold text-bg transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        {ctaLabel}
      </motion.button>
    </div>
  );
}
