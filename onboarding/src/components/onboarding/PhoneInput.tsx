"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Phone, AlertCircle, Check } from "lucide-react";
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

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}

function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return "Phone number is required";
  if (digits.length < 10) return "Enter a valid 10-digit Pakistani number";
  // Pakistani mobile numbers start with 03
  if (!digits.startsWith("03")) return "Pakistani numbers start with 03";
  return null;
}

interface PhoneInputProps {
  phone: string;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (phone: string) => void;
}

export function PhoneInput({ phone, onNext, onBack, onUpdate }: PhoneInputProps) {
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatted = formatPhone(phone);
  const error = touched ? validatePhone(formatted) : null;
  const isValid = !validatePhone(formatted);
  const digits = phone.replace(/\D/g, "");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    onUpdate(raw);
    if (!touched) setTouched(true);
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
          What's your phone number?
        </motion.h2>
        <motion.p
          className="mt-2 text-base text-muted sm:text-center"
          variants={itemVariants}
        >
          We'll use this to verify your account
        </motion.p>

        {/* Input */}
        <motion.div className="mt-8" variants={itemVariants}>
          <div
            className={cn(
              "relative rounded-2xl border-2 transition-all duration-300",
              focused ? "border-accent shadow-glow" : error ? "border-warning" : "border-divider"
            )}
          >
            <div className="flex items-center gap-3 px-4">
              {/* Country code */}
              <div className="flex items-center gap-2 border-r border-divider pr-3">
                <span className="text-lg">🇵🇰</span>
                <span className="text-sm font-medium text-muted">+92</span>
              </div>
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="tel"
                  className="w-full bg-transparent py-4 text-lg font-medium text-text placeholder:text-muted/40 focus:outline-none"
                  placeholder="0300-123-4567"
                  value={formatted}
                  onChange={handleChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => {
                    setFocused(false);
                    setTouched(true);
                  }}
                  autoFocus
                />
                {digits.length > 0 && (
                  <motion.div
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    {isValid ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
                        <Check className="h-3.5 w-3.5 text-success-fg" />
                      </div>
                    ) : (
                      <Phone className="h-5 w-5 text-muted/40" />
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mt-2 flex items-center gap-2 text-sm text-warning"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Character count */}
          <motion.div
            className="mt-3 flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-xs text-muted/50">{digits.length}/11</span>
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
