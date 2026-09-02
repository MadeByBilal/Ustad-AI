import type { WorkerCategory } from "./worker";
import type { UrgencyLevel, ComplexityLevel } from "./job";

// ─── Price Estimates ─────────────────────────────────────────────────────────

export interface PriceEstimate {
  min: number;
  max: number;
}

export const CATEGORY_ESTIMATES: Record<WorkerCategory, PriceEstimate> = {
  plumber: { min: 800, max: 1500 },
  electrician: { min: 1500, max: 4000 },
  ac_technician: { min: 2000, max: 6000 },
  carpenter: { min: 1500, max: 5000 },
};

// ─── Inspection Fees ─────────────────────────────────────────────────────────

export const INSPECTION_FEES: Record<WorkerCategory, number> = {
  plumber: 300,
  electrician: 350,
  ac_technician: 500,
  carpenter: 300,
};

// ─── Canonical Skills ────────────────────────────────────────────────────────

export const CANONICAL_SKILLS: Record<WorkerCategory, string[]> = {
  plumber: [
    "faucet repair",
    "pipe fitting",
    "drain cleaning",
    "geyser installation",
    "water tank installation",
  ],
  electrician: [
    "wiring",
    "fault finding",
    "switchboard installation",
    "inverter installation",
    "lighting",
  ],
  ac_technician: [
    "ac repair",
    "compressor service",
    "gas refilling",
    "ac installation",
    "deep cleaning",
  ],
  carpenter: [
    "door repair",
    "furniture making",
    "cabinet repair",
    "wardrobe installation",
    "kitchen cabinets",
  ],
};

// ─── Analysis Result ─────────────────────────────────────────────────────────

export interface AnalysisResult {
  category: WorkerCategory | null;
  subcategory: string;
  description: string;
  required_skills: string[];
  urgency: UrgencyLevel;
  safety_flags: string[];
  confidence: number;
  clarification_required: boolean;
  estimate_min: number;
  estimate_max: number;
  inspection_fee: number;
  complexity?: ComplexityLevel;
}

// ─── AI Understand Result ────────────────────────────────────────────────────

export interface AiUnderstandResult {
  source: "gemini" | "fallback";
  understanding: AnalysisResult;
  clarification_question?: string;
  clarification_options?: string[];
  manual_fallback?: boolean;
}
