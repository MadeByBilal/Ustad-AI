export declare const OFFER_LOW_FACTOR = 0.5;
export interface OfferValidation {
    valid: boolean;
    reason?: "too_low" | "too_high";
    min_allowed: number;
    max_allowed: number;
}
/**
 * Validates a customer's offer. Only checks that the amount is a positive
 * number — no floor or ceiling is enforced so customers may offer any price.
 */
export declare function validateCustomerOffer(amount: number, _estimateMin: number, _estimateMax: number): OfferValidation;
export declare function roundTo50(n: number): number;
/** Default offer used when price negotiation is skipped (emergency). */
export declare function midpointOffer(estimateMin: number, estimateMax: number): number;
export declare const COUNTER_LOW_FACTOR = 0.5;
export declare const COUNTER_HIGH_FACTOR = 2;
/**
 * Validates a worker's counter offer against the customer offer. Counters
 * must stay within [50%, 200%] of the customer offer. When no customer
 * offer exists (emergency), the counter is capped at 200% of the estimate;
 * an empty estimate is unconstrained.
 */
export declare function validateWorkerCounter(amount: number, customerOffer: number, estimateMax?: number): OfferValidation;
/** Lazy expiry check for a pending offer's negotiation window. */
export declare function offerIsExpired(expiresAt: Date | null | undefined, now?: Date): boolean;
//# sourceMappingURL=validation.d.ts.map