"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, MapPin, Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
  exit: {
    opacity: 0,
    x: -40,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const RADIUS_OPTIONS = [
  { value: 3, label: "3 km", description: "Same neighborhood" },
  { value: 5, label: "5 km", description: "Nearby areas" },
  { value: 10, label: "10 km", description: "City-wide" },
  { value: 15, label: "15 km", description: "Extended range" },
];

interface ServiceAreaProps {
  serviceArea: string;
  location: string;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (area: string) => void;
}

export function ServiceArea({ serviceArea, location, onNext, onBack, onUpdate }: ServiceAreaProps) {
  const [radius, setRadius] = useState(5);
  const selectedArea = serviceArea || `${radius} km radius from ${location}`;

  return (
    <motion.div
      className="flex min-h-[100dvh] flex-col px-6 py-8 sm:items-center sm:justify-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="w-full max-w-md" variants={itemVariants}>
        {/* Back */}
        <motion.button
          className="mb-6 flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-text"
          onClick={onBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </motion.button>

        {/* Heading */}
        <motion.h2
          className="font-display text-3xl font-bold text-text sm:text-center"
          variants={itemVariants}
        >
          Define your service area
        </motion.h2>
        <motion.p
          className="mt-2 text-base text-muted sm:text-center"
          variants={itemVariants}
        >
          How far are you willing to travel for jobs?
        </motion.p>

        {/* Map visualization */}
        <motion.div
          className="relative mt-6 overflow-hidden rounded-2xl border border-divider bg-surface"
          variants={itemVariants}
        >
          <div className="relative h-48 overflow-hidden bg-gradient-to-br from-accent/10 via-bg to-success/10">
            {/* Decorative map */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 200">
              {/* Grid */}
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 25} x2="400" y2={i * 25} stroke="currentColor" strokeWidth="0.5" className="text-divider/20" />
              ))}
              {Array.from({ length: 17 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="200" stroke="currentColor" strokeWidth="0.5" className="text-divider/20" />
              ))}
              {/* Roads */}
              <path d="M0 100 Q200 80 400 100" fill="none" stroke="currentColor" strokeWidth="2" className="text-divider/30" />
              <path d="M200 0 Q180 100 200 200" fill="none" stroke="currentColor" strokeWidth="2" className="text-divider/30" />
            </svg>

            {/* Service area circle */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {/* Radius circle */}
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-accent/30 bg-accent/5"
                animate={{
                  width: radius * 12,
                  height: radius * 12,
                }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
              />
              {/* Center pin */}
              <motion.div
                className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-accent shadow-button"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <MapPin className="h-5 w-5 text-surface" />
              </motion.div>
            </motion.div>
          </div>

          {/* Radius display */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted">Service radius</span>
            <div className="flex items-center gap-3">
              <motion.button
                className="flex h-8 w-8 items-center justify-center rounded-full border border-divider bg-bg text-muted transition-colors hover:border-accent hover:text-accent"
                onClick={() => setRadius(Math.max(1, radius - 1))}
                whileTap={{ scale: 0.9 }}
              >
                <Minus className="h-4 w-4" />
              </motion.button>
              <motion.span
                key={radius}
                className="min-w-[48px] text-center text-lg font-bold text-accent"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                {radius} km
              </motion.span>
              <motion.button
                className="flex h-8 w-8 items-center justify-center rounded-full border border-divider bg-bg text-muted transition-colors hover:border-accent hover:text-accent"
                onClick={() => setRadius(Math.min(20, radius + 1))}
                whileTap={{ scale: 0.9 }}
              >
                <Plus className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Quick options */}
        <motion.div className="mt-5 space-y-2" variants={itemVariants}>
          {RADIUS_OPTIONS.map((option, i) => (
            <motion.button
              key={option.value}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                radius === option.value
                  ? "border-accent bg-accent/5"
                  : "border-divider bg-surface hover:border-accent/30"
              )}
              onClick={() => setRadius(option.value)}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                  radius === option.value ? "border-accent bg-accent" : "border-divider"
                )}
              >
                {radius === option.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <Check className="h-3 w-3 text-surface" />
                  </motion.div>
                )}
              </div>
              <div>
                <span className="text-sm font-semibold text-text">{option.label}</span>
                <span className="ml-2 text-xs text-muted">— {option.description}</span>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Continue */}
        <motion.div className="mt-8" variants={itemVariants}>
          <motion.button
            className="btn-primary w-full text-base"
            onClick={() => {
              onUpdate(`${radius} km radius from ${location}`);
              onNext();
            }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            Continue
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
