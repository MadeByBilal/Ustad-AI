"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { WelcomeScreen } from "./WelcomeScreen";
import { RoleSelection } from "./RoleSelection";
import { PhoneInput } from "./PhoneInput";
import { PasswordInput } from "./PasswordInput";
import { LocationInput } from "./LocationInput";
import { CategorySelect } from "./CategorySelect";
import { ServiceArea } from "./ServiceArea";
import { ProfileSetup } from "./ProfileSetup";
import { CompletionScreen } from "./CompletionScreen";
import { UserRole } from "@/lib/types";

// Page transition variants — direction-aware slide + fade
const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.98,
  }),
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

export function OnboardingFlow() {
  const {
    currentStep,
    direction,
    data,
    progress,
    goNext,
    goBack,
    updateData,
  } = useOnboarding();

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      {/* Persistent progress bar — only show after welcome */}
      {currentStep !== "welcome" && currentStep !== "complete" && (
        <motion.div
          className="fixed inset-x-0 top-0 z-50 px-6 pt-4 pb-2 bg-bg/80 backdrop-blur-xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mx-auto max-w-md">
            <ProgressBar progress={progress} />
          </div>
        </motion.div>
      )}

      {/* Animated page transitions */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={pageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={pageTransition}
          className="min-h-screen"
        >
          {currentStep === "welcome" && (
            <WelcomeScreen onNext={goNext} />
          )}

          {currentStep === "role" && (
            <RoleSelection
              selectedRole={data.role}
              onSelect={(role: UserRole) => updateData({ role })}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {currentStep === "phone" && (
            <PhoneInput
              phone={data.phone}
              onNext={goNext}
              onBack={goBack}
              onUpdate={(phone) => updateData({ phone })}
            />
          )}

          {currentStep === "password" && (
            <PasswordInput
              password={data.password}
              onNext={goNext}
              onBack={goBack}
              onUpdate={(password) => updateData({ password })}
            />
          )}

          {currentStep === "location" && (
            <LocationInput
              location={data.location}
              role={data.role || "customer"}
              onNext={goNext}
              onBack={goBack}
              onUpdate={(location) => updateData({ location })}
            />
          )}

          {currentStep === "category" && (
            <CategorySelect
              selected={data.category}
              onNext={goNext}
              onBack={goBack}
              onSelect={(category) => updateData({ category })}
            />
          )}

          {currentStep === "service-area" && (
            <ServiceArea
              serviceArea={data.serviceArea}
              location={data.location}
              onNext={goNext}
              onBack={goBack}
              onUpdate={(serviceArea) => updateData({ serviceArea })}
            />
          )}

          {currentStep === "profile" && (
            <ProfileSetup
              name={data.name}
              role={data.role || "customer"}
              onNext={goNext}
              onBack={goBack}
              onUpdate={(name) => updateData({ name })}
            />
          )}

          {currentStep === "complete" && (
            <CompletionScreen
              role={data.role || "customer"}
              name={data.name}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
