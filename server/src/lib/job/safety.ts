import type { UrgencyLevel } from "../../models/index.js";

export interface SafetyGuidance {
  title: string;
  steps: string[];
}

export const DEFAULT_EMERGENCY_GUIDANCE: SafetyGuidance = {
  title: "Pehle apni hifazat",
  steps: [
    "Masla wala area chal raha hai to wahin se door ho jayen",
    "Bachon aur bozurghon ko khatre wali jagah se door rakhein",
    "Ustad ke aane tak koi khud repair karne ki koshish na karein",
    "Telephone pe apne ghar wale ko update karte rahein",
  ],
};

const FLAG_GUIDANCE: Record<string, SafetyGuidance> = {
  "short circuit": {
    title: "Short circuit",
    steps: [
      "Fauran ghar ka main switch / MCB band kar dein",
      "Paani ke paas koi bijli ka instrument na chhuein",
      "Bijli wali jagah par khaare (wood/plastic) se door rahen",
    ],
  },
  "power outage": {
    title: "Bijli ja rahi hai",
    steps: [
      "Main circuit breaker band karke check karein",
      "Emergency light / torch tayar rakhein",
      "Ustad ke aane tak koi wiring haath na lagayein",
    ],
  },
  "fuse blowout": {
    title: "Fuse ud raha hai",
    steps: [
      "Fuse dobara lagane se pehle asal masla talaash karein",
      "Appliance band kar dein jo fuse udwa raha ho",
      "Kabhi bhi fuse ko taar se na bandhein",
    ],
  },
  "gas leak": {
    title: "Gas leak",
    steps: [
      "Gas ka main valve turant band karein",
      "Windows aur darwaze khol kar hawa guzarein",
      "Light switch ya mobile charge khatka na karein — spark gas ko aag laga sakti hai",
      "Ghar se bahar nikal kar Ustad ya gas company ko call karein",
    ],
  },
  "fire risk": {
    title: "Fire / aag ka khatra",
    steps: [
      "Fire extinguisher ya paani ki baldi paas rakhein",
      "Sab log ghar se bahar niklein agar aag phail rahi ho",
      "1122 par fire brigade ko call karein",
    ],
  },
  "electric shock risk": {
    title: "Electric shock",
    steps: [
      "Jo instrument shock de raha ho, use turant band karein",
      "Shock lage to pehle main switch band karein, phir madad karein",
      "Bachon ko bijli ke taaron se door rakhein",
    ],
  },
};

/**
 * Safety guidance shown to the customer. Normal jobs get none;
 * emergencies get the generic guidance plus any flag-specific cards.
 */
export function getSafetyGuidance(
  urgency: UrgencyLevel,
  safetyFlags: string[]
): SafetyGuidance[] {
  if (urgency !== "emergency") {
    return [];
  }

  const seen = new Set<string>();
  const result: SafetyGuidance[] = [];

  for (const flag of safetyFlags) {
    const guidance = FLAG_GUIDANCE[flag];
    if (guidance && !seen.has(guidance.title)) {
      seen.add(guidance.title);
      result.push(guidance);
    }
  }

  if (result.length === 0) {
    result.push(DEFAULT_EMERGENCY_GUIDANCE);
  }

  return result;
}
