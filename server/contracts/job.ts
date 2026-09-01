// ─── Job Status ──────────────────────────────────────────────────────────────

export const JOB_STATUSES = [
  "DRAFT",
  "ANALYZING",
  "WAITING_FOR_CUSTOMER",
  "READY_TO_MATCH",
  "BROADCASTING",
  "WORKER_RESPONSES",
  "CUSTOMER_SELECTING",
  "ACCEPTED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "AWAITING_CUSTOMER_CONFIRMATION",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "DISPUTED",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

// ─── Input Types ─────────────────────────────────────────────────────────────

export const INPUT_TYPES = ["voice", "text", "photo"] as const;
export type InputType = (typeof INPUT_TYPES)[number];

// ─── Urgency ─────────────────────────────────────────────────────────────────

export const URGENCY_LEVELS = [
  "normal",
  "potentially_urgent",
  "emergency",
] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

// ─── Pricing ─────────────────────────────────────────────────────────────────

export const PRICING_STATUSES = ["pending", "agreed", "disputed"] as const;
export type PricingStatus = (typeof PRICING_STATUSES)[number];

// ─── Complexity ──────────────────────────────────────────────────────────────

export type ComplexityLevel = "low" | "medium" | "high";

// ─── Job Input ───────────────────────────────────────────────────────────────

export interface JobInput {
  type: InputType;
  original_text: string;
  transcript: string;
  photo_ids: string[];
}

// ─── Job Understanding ───────────────────────────────────────────────────────

export interface JobUnderstanding {
  category: string;
  subcategory: string;
  description: string;
  required_skills: string[];
  urgency: UrgencyLevel;
  safety_flags: string[];
  confidence: number;
  clarification_required: boolean;
  complexity: ComplexityLevel;
}

// ─── Job Location ────────────────────────────────────────────────────────────

export interface JobLocation {
  type: "Point";
  coordinates: number[];
  address_label: string;
}

// ─── Job Pricing ─────────────────────────────────────────────────────────────

export interface JobPricing {
  estimate_min: number;
  estimate_max: number;
  inspection_fee: number;
  customer_offer: number;
  worker_counter_offer: number | null;
  final_price: number | null;
  currency: string;
  status: PricingStatus;
}

// ─── Job Matching ────────────────────────────────────────────────────────────

export interface JobMatching {
  search_radius_km: number;
  broadcast_round: number;
  broadcast_id: string | null;
  eligible_workers_count: number;
  acceptance_deadline: string | null;
  selection_deadline: string | null;
  accepted_worker_ids: string[];
  selected_worker_id: string | null;
}

// ─── Job Completion ──────────────────────────────────────────────────────────

export interface JobCompletion {
  before_photo_id: string | null;
  after_photo_id: string | null;
  note: string | null;
  ai_work_confirmation: string | null;
  customer_confirmed: boolean;
}

// ─── Job Route ───────────────────────────────────────────────────────────────

import type { RoutePoint } from "./api";

export interface JobRoute {
  polyline: RoutePoint[] | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  computed_at: string | null;
}

// ─── Full Job Data (API response shape) ──────────────────────────────────────

export interface JobData {
  id: string;
  customer_id: string;
  status: JobStatus;
  input: JobInput;
  understanding: JobUnderstanding;
  location: JobLocation;
  pricing: JobPricing;
  matching: JobMatching;
  completion: JobCompletion;
  route: JobRoute | null;
  created_at: string;
  updated_at: string;
}
