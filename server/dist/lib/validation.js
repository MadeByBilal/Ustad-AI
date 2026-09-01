export const OFFER_LOW_FACTOR = 0.5;
/**
 * Validates a customer's offer against the AI/historical estimate.
 * Offers must be at least 50% of estimate_min. Customers may enter any
 * higher amount because complexity, materials, and travel can exceed the AI
 * estimate. An empty estimate (0/0) is treated as unconstrained.
 */
export function validateCustomerOffer(amount, estimateMin, estimateMax) {
    void estimateMax;
    if (!Number.isFinite(amount) || amount <= 0) {
        return { valid: false, reason: "too_low", min_allowed: 1, max_allowed: 0 };
    }
    const max_allowed = 0;
    const min_allowed = estimateMin > 0 ? Math.round(estimateMin * OFFER_LOW_FACTOR) : 0;
    if (min_allowed > 0 && amount < min_allowed) {
        return { valid: false, reason: "too_low", min_allowed, max_allowed };
    }
    return { valid: true, min_allowed, max_allowed };
}
export function roundTo50(n) {
    return Math.round(n / 50) * 50;
}
/** Default offer used when price negotiation is skipped (emergency). */
export function midpointOffer(estimateMin, estimateMax) {
    if (estimateMax <= 0) {
        return 0;
    }
    return roundTo50((estimateMin + estimateMax) / 2);
}
export const COUNTER_LOW_FACTOR = 0.5;
export const COUNTER_HIGH_FACTOR = 2.0;
/**
 * Validates a worker's counter offer against the customer offer. Counters
 * must stay within [50%, 200%] of the customer offer. When no customer
 * offer exists (emergency), the counter is capped at 200% of the estimate;
 * an empty estimate is unconstrained.
 */
export function validateWorkerCounter(amount, customerOffer, estimateMax = 0) {
    if (!Number.isFinite(amount) || amount <= 0) {
        return { valid: false, reason: "too_low", min_allowed: 1, max_allowed: 0 };
    }
    if (customerOffer > 0) {
        const min_allowed = Math.round(customerOffer * COUNTER_LOW_FACTOR);
        const max_allowed = Math.round(customerOffer * COUNTER_HIGH_FACTOR);
        if (amount < min_allowed) {
            return { valid: false, reason: "too_low", min_allowed, max_allowed };
        }
        if (amount > max_allowed) {
            return { valid: false, reason: "too_high", min_allowed, max_allowed };
        }
        return { valid: true, min_allowed, max_allowed };
    }
    if (estimateMax > 0) {
        const max_allowed = Math.round(estimateMax * COUNTER_HIGH_FACTOR);
        if (amount > max_allowed) {
            return { valid: false, reason: "too_high", min_allowed: 1, max_allowed };
        }
        return { valid: true, min_allowed: 1, max_allowed };
    }
    return { valid: true, min_allowed: 1, max_allowed: 0 };
}
/** Lazy expiry check for a pending offer's negotiation window. */
export function offerIsExpired(expiresAt, now = new Date()) {
    return expiresAt != null && now.getTime() > expiresAt.getTime();
}
//# sourceMappingURL=validation.js.map