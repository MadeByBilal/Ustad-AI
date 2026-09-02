import type { JobStatus } from "../../models/index.js";
export declare const CUSTOMER_CANCELLABLE_STATUSES: readonly JobStatus[];
export declare function canCustomerCancel(status: JobStatus): boolean;
interface WorkerCancellationInput {
    status: JobStatus;
    selectedWorkerId: string | null;
    acceptedWorkerIds: string[];
}
export interface WorkerCancellationDecision {
    targetStatus: JobStatus;
    remainingWorkerIds: string[];
    cancelsJob: boolean;
}
/**
 * Decides whether a worker can withdraw and whether that withdrawal closes
 * the job or only removes the worker from the response round.
 */
export declare function resolveWorkerCancellation(input: WorkerCancellationInput, workerId: string): WorkerCancellationDecision | null;
export {};
//# sourceMappingURL=cancellation.d.ts.map