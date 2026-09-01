import type { WorkerCategory } from "./worker";
import type { UrgencyLevel, ComplexityLevel } from "./job";
export interface PriceEstimate {
    min: number;
    max: number;
}
export declare const CATEGORY_ESTIMATES: Record<WorkerCategory, PriceEstimate>;
export declare const INSPECTION_FEES: Record<WorkerCategory, number>;
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
export interface AiUnderstandResult {
    source: "gemini" | "fallback";
    understanding: AnalysisResult;
    clarification_question?: string;
    clarification_options?: string[];
    manual_fallback?: boolean;
}
//# sourceMappingURL=ai.d.ts.map