import type { JobStatus, UrgencyLevel } from "../../models/index.js";
export type JobActor = "customer" | "worker" | "system";
export declare const NORMAL_ACCEPTANCE_MINUTES = 10;
export declare const EMERGENCY_ACCEPTANCE_MINUTES = 4;
export declare const SELECTION_MINUTES = 5;
/** Forward transitions for the job lifecycle. */
export declare const TRANSITIONS: Record<JobStatus, JobStatus[]>;
export declare function canTransition(from: JobStatus, to: JobStatus, actor: JobActor): boolean;
/** Throws with a descriptive message when the transition is not allowed. */
export declare function assertAllowedTransition(from: JobStatus, to: JobStatus, actor: JobActor): void;
export declare function resolveAcceptanceDeadline(urgency: UrgencyLevel, now?: Date): Date;
export declare function resolveSelectionDeadline(now?: Date): Date;
interface DeadlineFields {
    acceptance_deadline?: unknown;
    selection_deadline?: unknown;
}
/**
 * Lazy expiry: returns "EXPIRED" when a deadline has passed for a
 * waiting status, otherwise null. Callers apply the transition.
 */
export declare function expireIfDeadlinePassed(status: JobStatus, deadlines: DeadlineFields | null | undefined, now?: Date): JobStatus | null;
export {};
//# sourceMappingURL=state-machine.d.ts.map