"use client";

import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, User, Wrench, Check } from "lucide-react";
import { UserRole } from "@/lib/types";
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

interface RoleSelectionProps {
  selectedRole: UserRole | null;
  onSelect: (role: UserRole) => void;
  onNext: () => void;
  onBack: () => void;
}

export function RoleSelection({ selectedRole, onSelect, onNext, onBack }: RoleSelectionProps) {
  const roles: { id: UserRole; label: string; icon: typeof User; description: string; color: string }[] = [
    {
      id: "customer",
      label: "I need repair work",
      icon: User,
      description: "Find trusted technicians for your home repairs",
      color: "from-accent/20 to-accent/5",
    },
    {
      id: "worker",
      label: "I'm a technician",
      icon: Wrench,
      description: "Join as a skilled worker and find jobs",
      color: "from-success/20 to-success/5",
    },
  ];

  return (
    <motion.div
      className="flex min-h-[100dvh] flex-col px-6 py-8 sm:items-center sm:justify-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="w-full max-w-md" variants={itemVariants}>
        {/* Back button */}
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
          How will you use Ustad AI?
        </motion.h2>
        <motion.p
          className="mt-2 text-base text-muted sm:text-center"
          variants={itemVariants}
        >
          Choose your role to personalize your experience
        </motion.p>

        {/* Role cards */}
        <motion.div className="mt-8 space-y-4" variants={itemVariants}>
          {roles.map((role, i) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <motion.button
                key={role.id}
                className={cn(
                  "group relative w-full overflow-hidden rounded-3xl border-2 p-5 text-left transition-all duration-300",
                  isSelected
                    ? "border-accent bg-gradient-to-br shadow-glow"
                    : "border-divider bg-surface hover:border-accent/40 hover:shadow-card-hover"
                )}
                style={
                  isSelected
                    ? { backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }
                    : undefined
                }
                onClick={() => onSelect(role.id)}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300",
                      isSelected
                        ? "bg-accent text-surface"
                        : "bg-bg text-accent group-hover:bg-accent/10"
                    )}
                  >
                    <Icon className="h-7 w-7" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-text">{role.label}</span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <Check className="h-5 w-5 text-accent" />
                        </motion.div>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted">{role.description}</p>
                  </div>
                </div>

                {/* Selection glow */}
                {isSelected && (
                  <motion.div
                    className="pointer-events-none absolute inset-0 rounded-3xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      background: "radial-gradient(circle at 50% 0%, rgba(236, 154, 92, 0.08) 0%, transparent 60%)",
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Continue button */}
        <motion.div className="mt-8" variants={itemVariants}>
          <motion.button
            className="btn-primary w-full text-base"
            onClick={onNext}
            disabled={!selectedRole}
            whileHover={selectedRole ? { scale: 1.02, y: -1 } : {}}
            whileTap={selectedRole ? { scale: 0.97 } : {}}
          >
            Continue
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
