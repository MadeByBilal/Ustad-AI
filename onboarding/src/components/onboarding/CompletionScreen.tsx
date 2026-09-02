"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles, Wrench, User } from "lucide-react";
import { UserRole } from "@/lib/types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// Confetti particle component
function ConfettiParticle({ index }: { index: number }) {
  const colors = ["bg-accent", "bg-warning", "bg-success", "bg-surface"];
  const color = colors[index % colors.length];
  const x = Math.random() * 300 - 150;
  const delay = Math.random() * 0.5;
  const duration = 1.5 + Math.random() * 1;
  const rotation = Math.random() * 720 - 360;
  const size = 6 + Math.random() * 8;

  return (
    <motion.div
      className={`absolute ${color} rounded-full`}
      style={{
        width: size,
        height: size,
        left: "50%",
        top: "50%",
      }}
      initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
      animate={{
        x: x,
        y: -200 - Math.random() * 150,
        scale: [0, 1, 1, 0],
        opacity: [0, 1, 1, 0],
        rotate: rotation,
      }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    />
  );
}

// Success checkmark animation
function SuccessCheck() {
  return (
    <motion.div
      className="relative"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
    >
      {/* Outer ring pulse */}
      <motion.div
        className="absolute inset-0 rounded-full bg-success/20"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: 120, height: 120, marginLeft: -16, marginTop: -16 }}
      />
      {/* Main circle */}
      <motion.div
        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-success to-success-fg shadow-glow"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
      >
        <motion.div
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Check className="h-12 w-12 text-surface" strokeWidth={3} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

interface CompletionScreenProps {
  role: UserRole;
  name: string;
}

export function CompletionScreen({ role, name }: CompletionScreenProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background blobs */}
      <motion.div
        className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-success/10 blur-3xl"
        animate={{
          scale: [1, 1.2, 1.1, 1.3, 1],
          rotate: [0, 5, -5, 3, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
        animate={{
          scale: [1, 1.15, 1.05, 1.2, 1],
          rotate: [0, -3, 5, -2, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Confetti */}
      {showConfetti && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* Success icon */}
      <motion.div className="relative z-10 mb-8" variants={itemVariants}>
        <SuccessCheck />
      </motion.div>

      {/* Heading */}
      <motion.div className="relative z-10 text-center" variants={itemVariants}>
        <motion.h1
          className="font-display text-4xl font-bold text-text sm:text-5xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          You're all set!
        </motion.h1>
        <motion.p
          className="mt-3 text-lg text-muted sm:text-xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6 }}
        >
          Welcome to Ustad AI, {name}
        </motion.p>
      </motion.div>

      {/* Role-specific card */}
      <motion.div
        className="relative z-10 mt-8 w-full max-w-sm"
        variants={itemVariants}
      >
        <div className="rounded-3xl border border-divider bg-surface p-6 shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              {role === "worker" ? (
                <Wrench className="h-7 w-7 text-accent" />
              ) : (
                <User className="h-7 w-7 text-accent" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted">
                {role === "worker" ? "Technician Account" : "Customer Account"}
              </p>
              <p className="text-lg font-bold text-text">
                {role === "worker" ? "Ready to find jobs" : "Ready to find workers"}
              </p>
            </div>
          </div>

          {/* Feature list */}
          <div className="mt-5 space-y-3">
            {(
              role === "worker"
                ? ["Accept job broadcasts", "Track your earnings", "Build your reputation"]
                : ["Describe problems with voice", "Get AI price estimates", "Track workers in real-time"]
            ).map((feature, i) => (
              <motion.div
                key={feature}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20">
                  <Check className="h-3 w-3 text-success" />
                </div>
                <span className="text-sm text-muted">{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        className="relative z-10 mt-8 w-full max-w-sm"
        variants={itemVariants}
      >
        <motion.button
          className="btn-primary w-full text-base"
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          <Sparkles className="h-5 w-5" />
          Go to Dashboard
          <ArrowRight className="h-5 w-5" />
        </motion.button>
      </motion.div>

      {/* Sparkle accents */}
      {[
        { top: "15%", left: "10%", delay: 0 },
        { top: "25%", right: "15%", delay: 0.5 },
        { bottom: "30%", left: "20%", delay: 1 },
        { bottom: "20%", right: "10%", delay: 1.5 },
      ].map((pos, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute z-10"
          style={pos}
          initial={{ opacity: 0, scale: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            rotate: [0, 180],
          }}
          transition={{
            duration: 2,
            delay: pos.delay,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        >
          <Sparkles className="h-4 w-4 text-accent/40" />
        </motion.div>
      ))}
    </motion.div>
  );
}
