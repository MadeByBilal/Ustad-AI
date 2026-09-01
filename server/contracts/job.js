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
];
// ─── Input Types ─────────────────────────────────────────────────────────────
export const INPUT_TYPES = ["voice", "text", "photo"];
// ─── Urgency ─────────────────────────────────────────────────────────────────
export const URGENCY_LEVELS = [
    "normal",
    "potentially_urgent",
    "emergency",
];
// ─── Pricing ─────────────────────────────────────────────────────────────────
export const PRICING_STATUSES = ["pending", "agreed", "disputed"];
//# sourceMappingURL=job.js.map