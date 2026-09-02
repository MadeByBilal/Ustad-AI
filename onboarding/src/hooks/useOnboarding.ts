"use client";

import { useState, useCallback, useEffect } from "react";
import {
  OnboardingData,
  OnboardingStep,
  UserRole,
  WorkerCategory,
  CUSTOMER_STEPS,
  WORKER_STEPS,
} from "@/lib/types";

const STORAGE_KEY = "ustad-onboarding-data";

function loadSavedData(): Partial<OnboardingData> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveData(data: OnboardingData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // silently fail
  }
}

export function useOnboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [data, setData] = useState<OnboardingData>({
    role: null,
    phone: "",
    password: "",
    name: "",
    location: "",
    category: null,
    serviceArea: "",
  });

  // Load saved data on mount
  useEffect(() => {
    const saved = loadSavedData();
    if (saved) {
      setData((prev) => ({ ...prev, ...saved }));
    }
  }, []);

  // Persist on change
  useEffect(() => {
    saveData(data);
  }, [data]);

  const steps = data.role === "worker" ? WORKER_STEPS : CUSTOMER_STEPS;
  const currentIndex = steps.indexOf(currentStep);
  const progress = currentIndex >= 0 ? ((currentIndex) / (steps.length - 1)) * 100 : 0;

  const goNext = useCallback(() => {
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) {
      setDirection(1);
      setCurrentStep(steps[idx + 1]);
    }
  }, [currentStep, steps]);

  const goBack = useCallback(() => {
    const idx = steps.indexOf(currentStep);
    if (idx > 0) {
      setDirection(-1);
      setCurrentStep(steps[idx - 1]);
    }
  }, [currentStep, steps]);

  const goTo = useCallback(
    (step: OnboardingStep) => {
      const targetIdx = steps.indexOf(step);
      const currentIdx = steps.indexOf(currentStep);
      setDirection(targetIdx > currentIdx ? 1 : -1);
      setCurrentStep(step);
    },
    [currentStep, steps]
  );

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => {
      const next = { ...prev, ...updates };
      // If role changed, reset role-specific fields
      if (updates.role && updates.role !== prev.role) {
        next.category = null;
        next.serviceArea = "";
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setDirection(1);
    setCurrentStep("welcome");
    setData({
      role: null,
      phone: "",
      password: "",
      name: "",
      location: "",
      category: null,
      serviceArea: "",
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    currentStep,
    direction,
    data,
    steps,
    currentIndex,
    progress,
    goNext,
    goBack,
    goTo,
    updateData,
    reset,
  };
}
