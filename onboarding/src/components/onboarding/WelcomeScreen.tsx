"use client";

import { motion } from "framer-motion";
import { ArrowRight, Wrench, Mic } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const blobVariants = {
  animate: {
    scale: [1, 1.2, 1.1, 1.3, 1],
    rotate: [0, 5, -5, 3, 0],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

const iconPulse = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

interface WelcomeScreenProps {
  onNext: () => void;
}

export function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  return (
    <motion.div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Background blobs */}
      <motion.div
        className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
        variants={blobVariants}
        animate="animate"
      />
      <motion.div
        className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-warning/10 blur-3xl"
        variants={blobVariants}
        animate="animate"
        style={{ animationDelay: "2s" }}
      />
      <motion.div
        className="pointer-events-none absolute top-1/3 left-1/4 h-48 w-48 rounded-full bg-success/8 blur-3xl"
        variants={blobVariants}
        animate="animate"
        style={{ animationDelay: "4s" }}
      />

      {/* Logo / Icon */}
      <motion.div
        className="relative z-10 mb-8"
        variants={itemVariants}
      >
        <motion.div
          className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-warning shadow-glow"
          variants={iconPulse}
          animate="animate"
        >
          <Wrench className="h-12 w-12 text-surface" strokeWidth={1.5} />
        </motion.div>
      </motion.div>

      {/* Heading */}
      <motion.div className="relative z-10 text-center" variants={itemVariants}>
        <motion.h1
          className="font-display text-4xl font-bold tracking-tight text-text sm:text-5xl"
          variants={itemVariants}
        >
          Ustad AI
        </motion.h1>
        <motion.p
          className="mt-3 text-lg text-muted sm:text-xl"
          variants={itemVariants}
        >
          Your trusted home repair marketplace
        </motion.p>
      </motion.div>

      {/* Feature pills */}
      <motion.div
        className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-3"
        variants={itemVariants}
      >
        {["Voice-first", "AI-powered", "Trusted workers"].map((feature, i) => (
          <motion.span
            key={feature}
            className="rounded-full border border-divider bg-surface/80 px-4 py-2 text-sm font-medium text-muted backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.05, y: -2 }}
          >
            {feature}
          </motion.span>
        ))}
      </motion.div>

      {/* Mic illustration */}
      <motion.div
        className="relative z-10 mt-12"
        variants={itemVariants}
      >
        <motion.div
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent/30 bg-accent/10"
          animate={{
            boxShadow: [
              "0 0 0 0px rgba(236, 154, 92, 0.1)",
              "0 0 0 12px rgba(236, 154, 92, 0)",
              "0 0 0 0px rgba(236, 154, 92, 0.1)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Mic className="h-7 w-7 text-accent" />
        </motion.div>
      </motion.div>

      {/* CTA */}
      <motion.div className="relative z-10 mt-12 w-full max-w-xs" variants={itemVariants}>
        <motion.button
          className="btn-primary w-full text-base"
          onClick={onNext}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          Get Started
          <motion.span
            className="inline-block"
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowRight className="h-5 w-5" />
          </motion.span>
        </motion.button>
        <motion.p
          className="mt-4 text-center text-xs text-muted/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Already have an account?{" "}
          <span className="font-medium text-accent">Sign in</span>
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
