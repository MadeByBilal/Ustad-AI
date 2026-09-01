export declare const JOB_STATUSES: readonly ["DRAFT", "ANALYZING", "WAITING_FOR_CUSTOMER", "READY_TO_MATCH", "BROADCASTING", "WORKER_RESPONSES", "CUSTOMER_SELECTING", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION", "COMPLETED", "CANCELLED", "EXPIRED", "DISPUTED"];
export type JobStatus = (typeof JOB_STATUSES)[number];
export declare const INPUT_TYPES: readonly ["voice", "text", "photo"];
export type InputType = (typeof INPUT_TYPES)[number];
export declare const URGENCY_LEVELS: readonly ["normal", "potentially_urgent", "emergency"];
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];
export declare const PRICING_STATUSES: readonly ["pending", "agreed", "disputed"];
export type PricingStatus = (typeof PRICING_STATUSES)[number];
export type ComplexityLevel = "low" | "medium" | "high";
export interface JobInput {
    type: InputType;
    original_text: string;
    transcript: string;
    photo_ids: string[];
}
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
export interface JobLocation {
    type: "Point";
    coordinates: number[];
    address_label: string;
}
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
export interface JobCompletion {
    before_photo_id: string | null;
    after_photo_id: string | null;
    note: string | null;
    ai_work_confirmation: string | null;
    customer_confirmed: boolean;
}
import type { RoutePoint } from "./api";
export interface JobRoute {
    polyline: RoutePoint[] | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    computed_at: string | null;
}
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
//# sourceMappingURL=job.d.ts.map