"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle, Shield } from "lucide-react";
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

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-warning" };
  if (score <= 2) return { score, label: "Fair", color: "bg-warning/70" };
  if (score <= 3) return { score, label: "Good", color: "bg-accent" };
  if (score <= 4) return { score, label: "Strong", color: "bg-success" };
  return { score, label: "Very Strong", color: "bg-success" };
}

function validatePassword(password: string): string | null {
  if (password.length === 0) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  return null;
}

interface PasswordInputProps {
  password: string;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (password: string) => void;
}

export function PasswordInput({ password, onNext, onBack, onUpdate }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const error = touched ? validatePassword(password) : null;
  const strength = getPasswordStrength(password);
  const isValid = !validatePassword(password);

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
          Create a password
        </motion.h2>
        <motion.p
          className="mt-2 text-base text-muted sm:text-center"
          variants={itemVariants}
        >
          Make it strong and memorable
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
              <Shield className="h-5 w-5 text-muted/40" />
              <input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                className="flex-1 bg-transparent py-4 text-base font-medium text-text placeholder:text-muted/40 focus:outline-none"
                placeholder="Enter your password"
                value={password}
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
              <motion.button
                type="button"
                className="rounded-lg p-1.5 text-muted/60 transition-colors hover:text-text"
                onClick={() => setShowPassword(!showPassword)}
                whileTap={{ scale: 0.9 }}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </motion.button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mt-2 flex items-center gap-2 text-sm text-warning"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Strength indicator */}
          <AnimatePresence>
            {password.length > 0 && (
              <motion.div
                className="mt-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted">Password strength</span>
                  <motion.span
                    className={cn(
                      "text-xs font-semibold",
                      strength.score <= 2 ? "text-warning" : "text-success"
                    )}
                    key={strength.label}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {strength.label}
                  </motion.span>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors duration-300",
                        i <= strength.score ? strength.color : "bg-divider/50"
                      )}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Requirements */}
          <motion.div
            className="mt-4 space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {[
              { met: password.length >= 8, text: "At least 8 characters" },
              { met: /[A-Z]/.test(password), text: "One uppercase letter" },
              { met: /\d/.test(password), text: "One number" },
              { met: /[^a-zA-Z0-9]/.test(password), text: "One special character" },
            ].map((req, i) => (
              <motion.div
                key={req.text}
                className="flex items-center gap-2 text-xs"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                <motion.div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    req.met ? "bg-success" : "bg-divider"
                  )}
                  animate={req.met ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.3 }}
                />
                <span className={cn("transition-colors", req.met ? "text-success" : "text-muted/60")}>
                  {req.text}
                </span>
              </motion.div>
            ))}
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
