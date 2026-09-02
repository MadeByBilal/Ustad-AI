"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, User, AlertCircle, Check } from "lucide-react";
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

function validateName(name: string): string | null {
  if (name.length === 0) return "Name is required";
  if (name.length < 2) return "Name must be at least 2 characters";
  return null;
}

interface ProfileSetupProps {
  name: string;
  role: "customer" | "worker";
  onNext: () => void;
  onBack: () => void;
  onUpdate: (name: string) => void;
}

export function ProfileSetup({ name, role, onNext, onBack, onUpdate }: ProfileSetupProps) {
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const error = touched ? validateName(name) : null;
  const isValid = !validateName(name);

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
          What should we call you?
        </motion.h2>
        <motion.p
          className="mt-2 text-base text-muted sm:text-center"
          variants={itemVariants}
        >
          {role === "worker"
            ? "This will be shown to customers"
            : "Your display name for your profile"}
        </motion.p>

        {/* Avatar placeholder */}
        <motion.div
          className="mt-8 flex justify-center"
          variants={itemVariants}
        >
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-warning/20 border-2 border-accent/30">
              {name ? (
                <motion.span
                  key={name}
                  className="text-2xl font-bold text-accent"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  {name.charAt(0).toUpperCase()}
                </motion.span>
              ) : (
                <User className="h-8 w-8 text-accent/40" />
              )}
            </div>
            {name && (
              <motion.div
                className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-success"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Check className="h-3.5 w-3.5 text-success-fg" />
              </motion.div>
            )}
          </motion.div>
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
              <User className="h-5 w-5 text-muted/40" />
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent py-4 text-base font-medium text-text placeholder:text-muted/40 focus:outline-none"
                placeholder={role === "worker" ? "e.g. Ahmed Khan" : "e.g. Fatima"}
                value={name}
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
              {name && name.length >= 2 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Check className="h-5 w-5 text-success" />
                </motion.div>
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
        </motion.div>

        {/* Summary card */}
        <motion.div
          className="mt-6 rounded-2xl border border-divider bg-surface p-4"
          variants={itemVariants}
        >
          <p className="mb-3 text-xs font-medium text-muted/60 uppercase tracking-wide">Your account summary</p>
          <div className="space-y-2">
            {[
              { label: "Role", value: role === "worker" ? "Technician" : "Customer" },
              { label: "Phone", value: "0300-123-4567" },
              { label: "Location", value: "Gulberg, Lahore" },
              ...(role === "worker" ? [{ label: "Category", value: "Plumber" }] : []),
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="flex items-center justify-between"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
              >
                <span className="text-sm text-muted">{item.label}</span>
                <span className="text-sm font-medium text-text">{item.value}</span>
              </motion.div>
            ))}
          </div>
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
            Create Account
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
