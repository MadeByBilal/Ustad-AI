import type { JobStatus, UrgencyLevel } from "@/models";

export type JobActor = "customer" | "worker" | "system";

export const NORMAL_ACCEPTANCE_MINUTES = 10;
export const EMERGENCY_ACCEPTANCE_MINUTES = 4;
export const SELECTION_MINUTES = 5;

/** Forward transitions for the job lifecycle. */
export const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ["ANALYZING"],
  ANALYZING: ["WAITING_FOR_CUSTOMER"],
  WAITING_FOR_CUSTOMER: ["ANALYZING", "READY_TO_MATCH", "CANCELLED"],
  READY_TO_MATCH: ["BROADCASTING", "CANCELLED"],
  BROADCASTING: ["WORKER_RESPONSES", "CUSTOMER_SELECTING", "ACCEPTED", "EXPIRED", "CANCELLED"],
  WORKER_RESPONSES: ["CUSTOMER_SELECTING", "READY_TO_MATCH", "EXPIRED", "CANCELLED"],
  CUSTOMER_SELECTING: ["ACCEPTED", "READY_TO_MATCH", "EXPIRED", "CANCELLED"],
  ACCEPTED: ["EN_ROUTE", "CANCELLED"],
  EN_ROUTE: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["AWAITING_CUSTOMER_CONFIRMATION", "CANCELLED"],
  AWAITING_CUSTOMER_CONFIRMATION: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
  DISPUTED: [],
};

/**
 * Which actors may drive each transition. Transitions absent from this
 * map are denied for every actor.
 */
const ACTOR_ALLOWANCES: Record<string, JobActor[]> = {
  "DRAFT->ANALYZING": ["system"],
  "ANALYZING->WAITING_FOR_CUSTOMER": ["system"],
  "WAITING_FOR_CUSTOMER->ANALYZING": ["customer"],
  "WAITING_FOR_CUSTOMER->READY_TO_MATCH": ["customer", "system"],
  "READY_TO_MATCH->BROADCASTING": ["customer", "system"],
  "BROADCASTING->WORKER_RESPONSES": ["worker", "system"],
  "BROADCASTING->CUSTOMER_SELECTING": ["customer", "system"],
  "BROADCASTING->ACCEPTED": ["worker", "system"],
  "BROADCASTING->EXPIRED": ["system"],
  "WORKER_RESPONSES->CUSTOMER_SELECTING": ["system"],
  "WORKER_RESPONSES->READY_TO_MATCH": ["customer", "system"],
  "WORKER_RESPONSES->EXPIRED": ["system"],
  "CUSTOMER_SELECTING->ACCEPTED": ["customer"],
  "CUSTOMER_SELECTING->READY_TO_MATCH": ["customer", "system"],
  "CUSTOMER_SELECTING->EXPIRED": ["system"],
  "ACCEPTED->EN_ROUTE": ["worker"],
  "EN_ROUTE->ARRIVED": ["worker", "system"],
  "ARRIVED->IN_PROGRESS": ["worker"],
  "IN_PROGRESS->AWAITING_CUSTOMER_CONFIRMATION": ["worker"],
  "AWAITING_CUSTOMER_CONFIRMATION->COMPLETED": ["customer", "system"],
  "AWAITING_CUSTOMER_CONFIRMATION->DISPUTED": ["customer"],
  "*->CANCELLED": ["customer", "worker", "system"],
};

export function canTransition(
  from: JobStatus,
  to: JobStatus,
  actor: JobActor
): boolean {
  const next = TRANSITIONS[from] ?? [];
  if (!next.includes(to)) {
    return false;
  }
  const allowed = ACTOR_ALLOWANCES[`${from}->${to}`] ?? ACTOR_ALLOWANCES["*->CANCELLED"];
  return allowed?.includes(actor) ?? false;
}

/** Throws with a descriptive message when the transition is not allowed. */
export function assertAllowedTransition(
  from: JobStatus,
  to: JobStatus,
  actor: JobActor
): void {
  if (!canTransition(from, to, actor)) {
    throw new Error(
      `Invalid transition ${from} -> ${to} for actor ${actor}`
    );
  }
}

export function resolveAcceptanceDeadline(
  urgency: UrgencyLevel,
  now: Date = new Date()
): Date {
  const minutes =
    urgency === "emergency"
      ? EMERGENCY_ACCEPTANCE_MINUTES
      : NORMAL_ACCEPTANCE_MINUTES;
  return new Date(now.getTime() + minutes * 60_000);
}

export function resolveSelectionDeadline(now: Date = new Date()): Date {
  return new Date(now.getTime() + SELECTION_MINUTES * 60_000);
}

interface DeadlineFields {
  acceptance_deadline?: unknown;
  selection_deadline?: unknown;
}

/**
 * Lazy expiry: returns "EXPIRED" when a deadline has passed for a
 * waiting status, otherwise null. Callers apply the transition.
 */
export function expireIfDeadlinePassed(
  status: JobStatus,
  deadlines: DeadlineFields | null | undefined,
  now: Date = new Date()
): JobStatus | null {
  const acceptanceDeadline = deadlines?.acceptance_deadline
    ? new Date(deadlines?.acceptance_deadline as Date)
    : null;
  const selectionDeadline = deadlines?.selection_deadline
    ? new Date(deadlines?.selection_deadline as Date)
    : null;

  if (
    (status === "BROADCASTING" || status === "WORKER_RESPONSES") &&
    acceptanceDeadline &&
    now.getTime() > acceptanceDeadline.getTime()
  ) {
    return "EXPIRED";
  }
  if (
    status === "WORKER_RESPONSES" &&
    selectionDeadline &&
    now.getTime() > selectionDeadline.getTime()
  ) {
    return "EXPIRED";
  }
  if (
    status === "CUSTOMER_SELECTING" &&
    selectionDeadline &&
    now.getTime() > selectionDeadline.getTime()
  ) {
    return "EXPIRED";
  }
  return null;
}
