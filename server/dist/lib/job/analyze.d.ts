import type { UrgencyLevel, WorkerCategory } from "../../models/index.js";
import type { ComplexityLevel } from "./pricing.js";
export interface PriceEstimate {
    min: number;
    max: number;
}
export declare const CATEGORY_ESTIMATES: Record<WorkerCategory, PriceEstimate>;
/**
 * Visit-and-check fee: the only amount the customer commits to upfront.
 * The main repair payment is settled after the ustad inspects the problem.
 */
export declare const INSPECTION_FEES: Record<WorkerCategory, number>;
export declare function inspectionFeeFor(category: WorkerCategory | null): number;
export declare const CANONICAL_SKILLS: Record<WorkerCategory, string[]>;
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
export declare function complexityFor(text: string): ComplexityLevel;
export declare function analyzeJobInput(text: string, opts?: {
    categoryHint?: WorkerCategory;
    urgencyHint?: UrgencyLevel;
}): AnalysisResult;
/** Re-derives skills, estimates and flags for a customer-edited summary. */
export declare function deriveAnalysisForCategory(category: WorkerCategory, subcategory: string, urgency: UrgencyLevel): AnalysisResult;
export declare function findEmergencyFlags(text: string): string[];
//# sourceMappingURL=analyze.d.ts.map