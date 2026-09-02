import type { JobStatus } from "../../models/index.js";

export const CUSTOMER_CANCELLABLE_STATUSES: readonly JobStatus[] = [
  "WAITING_FOR_CUSTOMER",
  "READY_TO_MATCH",
  "BROADCASTING",
  "WORKER_RESPONSES",
  "CUSTOMER_SELECTING",
  "ACCEPTED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
];

export function canCustomerCancel(status: JobStatus): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.includes(status);
}

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
export function resolveWorkerCancellation(
  input: WorkerCancellationInput,
  workerId: string,
): WorkerCancellationDecision | null {
  if (input.selectedWorkerId === workerId) {
    return {
      targetStatus: "CANCELLED",
      remainingWorkerIds: [],
      cancelsJob: true,
    };
  }

  if (input.status !== "WORKER_RESPONSES") return null;

  const remainingWorkerIds = input.acceptedWorkerIds.filter(
    (acceptedWorkerId) => acceptedWorkerId !== workerId,
  );
  if (remainingWorkerIds.length === input.acceptedWorkerIds.length) {
    return null;
  }

  return {
    targetStatus: remainingWorkerIds.length > 0 ? "WORKER_RESPONSES" : "READY_TO_MATCH",
    remainingWorkerIds,
    cancelsJob: false,
  };
}
