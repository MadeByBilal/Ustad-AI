import { type UrgencyLevel, type WorkerCategory } from "../models/index.js";
import type { ComplexityLevel } from "./job/pricing.js";
export declare const RANKING_WEIGHTS: {
    readonly skill_match: 0.3;
    readonly distance: 0.25;
    readonly reliability: 0.2;
    readonly ustad: 0.15;
    readonly response: 0.1;
};
/** Bonus for workers who opted into emergency service on emergency jobs. */
export declare const EMERGENCY_CAPABILITY_BONUS = 10;
/** Bonus applied to verified workers in the voice-match options path. */
export declare const VERIFIED_BONUS = 5;
/**
 * Weights used by getWorkerOptions when no geo context is available
 * (radius_km = 0). The 25% distance weight is redistributed to skill
 * match and reliability so it doesn't zero-out every candidate.
 */
export declare const NO_GEO_WEIGHTS: {
    readonly skill_match: 0.35;
    readonly distance: 0;
    readonly reliability: 0.25;
    readonly ustad: 0.2;
    readonly response: 0.1;
    readonly rating: 0.1;
};
export declare const LOCATION_FRESHNESS_NORMAL_MS: number;
export declare const LOCATION_FRESHNESS_EMERGENCY_MS: number;
export interface WorkerScoreInput {
    skills: string[];
    ustad_score: number;
    completed_jobs: number;
    confirmed_jobs: number;
    response_rate: number;
    cancellation_rate: number;
    average_rating: number;
    emergency_available: boolean;
    emergency_capabilities: string[];
}
export interface MatchContext {
    required_skills: string[];
    radius_km: number;
    urgency: UrgencyLevel;
}
export interface WorkerScore extends WorkerScoreInput {
    _id: unknown;
    name: string;
    category: WorkerCategory | null;
    distance_km: number;
    matched_skills: string[];
    skill_match_score: number;
    distance_score: number;
    reliability_score: number;
    response_score: number;
    rating_score: number;
    final_score: number;
}
export interface SearchFilters extends MatchContext {
    category: WorkerCategory;
    lat: number;
    lng: number;
    limit?: number;
}
/** Canonicalize a skill string so synonym and token overlap can be compared. */
export declare function canonicalizeSkill(skill: string): string;
export declare function scoreWorker(worker: WorkerScoreInput, ctx: MatchContext & {
    distance_km: number;
}, id?: unknown, name?: string, category?: WorkerCategory): WorkerScore;
export declare function rankWorkers(workers: WorkerScore[]): WorkerScore[];
/**
 * Deterministic eligible-worker search:
 *   - category + at least one required skill (enforced post-query by score)
 *   - verified, online, available, not suspended, no active job
 *   - fresh location (5 min normal / 2 min emergency)
 *   - within search_radius_km (geo box pre-filter, exact haversine post-filter)
 *   - service area covers the customer location
 *   - emergency jobs additionally require emergency_available
 *
 * A bounding-box $geoWithin pre-filter (instead of $near) is used so the
 * query stays unambiguous with the collection's two 2dsphere indexes
 * (location + service_area) — see README "Geo search" note. Exact distance
 * is enforced with haversine before ranking.
 */
export declare function searchEligibleWorkers(filters: SearchFilters): Promise<WorkerScore[]>;
/** Minimal public metadata about an eligible worker for the results UI. */
export interface WorkerResult {
    id: string;
    name: string;
    category: WorkerCategory;
    skills: string[];
    matched_skills: string[];
    verification_level: string;
    verified: boolean;
    completeness_pct: number;
    ustad_score: number;
    completed_jobs: number;
    average_rating: number;
    distance_km: number;
    skills_match: number;
    final_score: number;
}
export declare const FRESH_LOCATION_DAYS = 7;
interface CompletenessSignals {
    name?: string;
    skills?: string[];
    location_updated_at?: Date | string;
    verification_level?: string;
}
/**
 * How complete a worker's public profile is, as a percent. Used by the
 * results UI to nudge workers to finish onboarding.
 */
export declare function workerCompletenessPct(signals: CompletenessSignals, now?: Date): number;
export declare function getWorkerResults(filters: SearchFilters): Promise<WorkerResult[]>;
/** Lightweight public worker profile for the landing flow (no geo required). */
export interface WorkerOption {
    id: string;
    name: string;
    category: WorkerCategory;
    skills: string[];
    verified: boolean;
    verification_level: string;
    ustad_score: number;
    completed_jobs: number;
    average_rating: number;
    /** % of jobs the worker responds to (0-100). Closest honest signal to "responsiveness". */
    response_rate?: number;
    skills_match: number;
    final_score: number;
    distance_km?: number | null;
    predicted_price?: number;
    travel_cost_pkr?: number;
}
export interface WorkerOptionsFilters {
    category: WorkerCategory | null;
    required_skills: string[];
    urgency: UrgencyLevel;
    limit?: number;
    location?: {
        lat: number;
        lng: number;
    };
    estimate_min?: number;
    estimate_max?: number;
    complexity?: ComplexityLevel;
}
/**
 * Splits a ranked worker list into the single best match plus the
 * alternative options shown below it. The best is the first item; others
 * are capped at `limit - 1`.
 */
export declare function pickBestAndOthers(ranked: WorkerOption[], limit: number): {
    best: WorkerOption | null;
    others: WorkerOption[];
};
/**
 * Whole-catalogue match for the landing and dashboard experiences:
 * finds currently-available workers in the category (or any category
 * when the analysis is unsure) and ranks them by fit.  No geo box or
 * location freshness is applied — this is a "best guess" showcase, not
 * the customer's exact broadcast.
 *
 * Unverified workers are included so self-registered technicians are
 * discoverable immediately.  Verified workers receive a bonus.
 */
export declare function getWorkerOptions(filters: WorkerOptionsFilters): Promise<{
    best: WorkerOption | null;
    others: WorkerOption[];
    ranked: WorkerOption[];
}>;
export {};
//# sourceMappingURL=matching.d.ts.map