import type { UrgencyLevel } from "../../models/index.js";
export interface SafetyGuidance {
    title: string;
    steps: string[];
}
export declare const DEFAULT_EMERGENCY_GUIDANCE: SafetyGuidance;
/**
 * Safety guidance shown to the customer. Normal jobs get none;
 * emergencies get the generic guidance plus any flag-specific cards.
 */
export declare function getSafetyGuidance(urgency: UrgencyLevel, safetyFlags: string[]): SafetyGuidance[];
//# sourceMappingURL=safety.d.ts.map