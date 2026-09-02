"use client";

import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { WorkerCategory, CATEGORY_INFO } from "@/lib/types";
import { cn } from "@/lib/cn";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
  exit: {
    opacity: 0,
    x: -40,
    transition: { duration: 0.3, ease: EASE_OUT },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.3 + i * 0.1,
      duration: 0.5,
      ease: EASE_OUT,
    },
  }),
};

interface CategorySelectProps {
  selected: WorkerCategory | null;
  onNext: () => void;
  onBack: () => void;
  onSelect: (category: WorkerCategory) => void;
}

export function CategorySelect({ selected, onNext, onBack, onSelect }: CategorySelectProps) {
  const categories = Object.entries(CATEGORY_INFO) as [WorkerCategory, typeof CATEGORY_INFO[WorkerCategory]][];

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
          What's your trade?
        </motion.h2>
        <motion.p
          className="mt-2 text-base text-muted sm:text-center"
          variants={itemVariants}
        >
          Select your primary skill category
        </motion.p>

        {/* Category grid */}
        <motion.div className="mt-8 grid grid-cols-2 gap-3" variants={itemVariants}>
          {categories.map(([key, info], i) => {
            const isSelected = selected === key;
            return (
              <motion.button
                key={key}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300",
                  isSelected
                    ? "border-accent bg-accent/5 shadow-glow"
                    : "border-divider bg-surface hover:border-accent/30 hover:shadow-card"
                )}
                custom={i}
                variants={cardVariants}
                onClick={() => onSelect(key)}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Icon */}
                <motion.div
                  className="mb-3 text-3xl"
                  animate={isSelected ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  {info.icon}
                </motion.div>

                {/* Label */}
                <span className="text-sm font-semibold text-text">{info.label}</span>

                {/* Description */}
                <p className="mt-1 text-xs text-muted/70 leading-relaxed">{info.description}</p>

                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    className="absolute right-3 top-3"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                      <Check className="h-3.5 w-3.5 text-surface" />
                    </div>
                  </motion.div>
                )}

                {/* Hover gradient */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-accent/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.button>
            );
          })}
        </motion.div>

        {/* Continue */}
        <motion.div className="mt-8" variants={itemVariants}>
          <motion.button
            className="btn-primary w-full text-base"
            onClick={onNext}
            disabled={!selected}
            whileHover={selected ? { scale: 1.02, y: -1 } : {}}
            whileTap={selected ? { scale: 0.97 } : {}}
          >
            Continue
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
