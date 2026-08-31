"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/client/lib/cn";

export type LoadingStateType = "voice" | "matching" | "general";

export interface LoadingStateProps {
  type: LoadingStateType;
  message?: string;
  className?: string;
}

const VOICE_STATUSES = [
  "سن رہا ہوں...",
  "سمجھ رہا ہوں...",
  "تیار کر رہا ہوں...",
];

const ROTATE_INTERVAL_MS = 2000;
const SKELETON_PULSE_DURATION = 1.4;
const WAVEFORM_DURATION = 1;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

function VoiceLoader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % VOICE_STATUSES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex h-12 items-center gap-1" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.span
            key={i}
            className="block w-1 rounded-full bg-accent"
            animate={{ height: ["16px", "40px", "16px"] }}
            transition={{
              duration: WAVEFORM_DURATION,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.08,
            }}
          />
        ))}
      </div>

      <div className="h-8 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="font-urdu text-lg text-text"
          >
            {VOICE_STATUSES[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SkeletonLine({
  width,
  delay,
  height = "h-3",
}: {
  width: string;
  delay: number;
  height?: string;
}) {
  return (
    <motion.div
      className={cn("rounded bg-muted/30", height, width)}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{
        duration: SKELETON_PULSE_DURATION,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

function MatchingLoader() {
  return (
    <div
      role="presentation"
      className="w-full max-w-md rounded-xl border border-divider bg-surface p-4"
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="h-12 w-12 shrink-0 rounded-full bg-muted/30"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{
            duration: SKELETON_PULSE_DURATION,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="w-2/3" delay={0.1} height="h-4" />
          <SkeletonLine width="w-1/2" delay={0.2} />
          <SkeletonLine width="w-3/4" delay={0.3} />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <SkeletonLine width="w-16" delay={0.4} />
        <SkeletonLine width="w-12" delay={0.5} />
      </div>
    </div>
  );
}

function GeneralLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-2 w-2 rounded-full bg-accent"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}

export default function LoadingState({
  type,
  message,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center p-8", className)}
    >
      {type === "voice" && <VoiceLoader />}
      {type === "matching" && <MatchingLoader />}
      {type === "general" && <GeneralLoader message={message} />}
    </div>
  );
}
