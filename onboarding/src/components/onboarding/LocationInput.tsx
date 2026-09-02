"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, MapPin, Navigation, AlertCircle, Check } from "lucide-react";
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

const SUGGESTED_AREAS = [
  "Gulberg, Lahore",
  "DHA, Lahore",
  "Johar Town, Lahore",
  "Clifton, Karachi",
  "Defence, Karachi",
  "F-8, Islamabad",
  "G-11, Islamabad",
];

function validateLocation(location: string): string | null {
  if (location.length === 0) return "Location is required";
  if (location.length < 3) return "Please enter a valid location";
  return null;
}

interface LocationInputProps {
  location: string;
  role: "customer" | "worker";
  onNext: () => void;
  onBack: () => void;
  onUpdate: (location: string) => void;
}

export function LocationInput({ location, role, onNext, onBack, onUpdate }: LocationInputProps) {
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const error = touched ? validateLocation(location) : null;
  const isValid = !validateLocation(location);

  const handleDetectLocation = () => {
    setDetecting(true);
    // Simulate geolocation detection
    setTimeout(() => {
      onUpdate("Gulberg, Lahore");
      setDetecting(false);
      setTouched(true);
    }, 1500);
  };

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
          {role === "worker" ? "Where do you work?" : "Where do you live?"}
        </motion.h2>
        <motion.p
          className="mt-2 text-base text-muted sm:text-center"
          variants={itemVariants}
        >
          {role === "worker"
            ? "This helps us match you with nearby jobs"
            : "This helps us find technicians near you"}
        </motion.p>

        {/* Map preview */}
        <motion.div
          className="relative mt-6 overflow-hidden rounded-2xl border border-divider bg-surface"
          variants={itemVariants}
        >
          <div className="relative h-40 overflow-hidden bg-gradient-to-br from-accent/10 via-bg to-success/10">
            {/* Decorative map-like pattern */}
            <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 400 200">
              <path d="M0 100 Q100 50 200 100 T400 100" fill="none" stroke="currentColor" strokeWidth="1" className="text-accent/30" />
              <path d="M0 120 Q100 70 200 120 T400 120" fill="none" stroke="currentColor" strokeWidth="1" className="text-accent/20" />
              <path d="M0 80 Q100 30 200 80 T400 80" fill="none" stroke="currentColor" strokeWidth="1" className="text-accent/10" />
              {/* Grid lines */}
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 25} x2="400" y2={i * 25} stroke="currentColor" strokeWidth="0.5" className="text-divider/30" />
              ))}
              {Array.from({ length: 16 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="200" stroke="currentColor" strokeWidth="0.5" className="text-divider/30" />
              ))}
            </svg>
            {location && (
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-button">
                  <MapPin className="h-6 w-6 text-surface" />
                </div>
                <motion.div
                  className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-accent/40"
                  animate={{
                    scale: [1, 1.8, 1],
                    opacity: [0.6, 0, 0.6],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Input */}
        <motion.div className="mt-6" variants={itemVariants}>
          <div
            className={cn(
              "relative rounded-2xl border-2 transition-all duration-300",
              focused ? "border-accent shadow-glow" : error ? "border-warning" : "border-divider"
            )}
          >
            <div className="flex items-center gap-3 px-4">
              <MapPin className="h-5 w-5 text-muted/40" />
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent py-4 text-base font-medium text-text placeholder:text-muted/40 focus:outline-none"
                placeholder={role === "worker" ? "e.g. Gulberg, Lahore" : "e.g. DHA, Karachi"}
                value={location}
                onChange={(e) => {
                  onUpdate(e.target.value);
                  if (!touched) setTouched(true);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  setFocused(false);
                  setTouched(true);
                }}
                autoFocus
              />
              {location && (
                <motion.button
                  className="rounded-lg p-1.5 text-muted/40 transition-colors hover:text-text"
                  onClick={() => onUpdate("")}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ×
                </motion.button>
              )}
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mt-2 flex items-center gap-2 text-sm text-warning"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Detect location button */}
          <motion.button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-divider bg-surface py-3 text-sm font-medium text-accent transition-all hover:border-accent/40 hover:bg-accent/5"
            onClick={handleDetectLocation}
            disabled={detecting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {detecting ? (
              <motion.div
                className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {detecting ? "Detecting..." : "Use current location"}
          </motion.button>

          {/* Suggested areas */}
          <motion.div className="mt-5" variants={itemVariants}>
            <p className="mb-2 text-xs font-medium text-muted/60">Popular areas</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_AREAS.map((area, i) => (
                <motion.button
                  key={area}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    location === area
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-divider bg-surface text-muted hover:border-accent/40"
                  )}
                  onClick={() => {
                    onUpdate(area);
                    setTouched(true);
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {location === area && (
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{ width: "auto" }}
                      className="inline-block"
                    >
                      ✓{" "}
                    </motion.span>
                  )}
                  {area}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Continue */}
        <motion.div className="mt-8" variants={itemVariants}>
          <motion.button
            className="btn-primary w-full text-base"
            onClick={onNext}
            disabled={!isValid}
            whileHover={isValid ? { scale: 1.02, y: -1 } : {}}
            whileTap={isValid ? { scale: 0.97 } : {}}
          >
            Continue
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
