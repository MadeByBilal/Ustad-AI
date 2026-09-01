import type { JobStatus } from "../models/index.js";

export const JOB_STATUS_STYLES: Record<JobStatus, string> = {
  DRAFT: "bg-surface text-muted",
  ANALYZING: "bg-surface text-accent",
  WAITING_FOR_CUSTOMER: "bg-surface text-muted",
  READY_TO_MATCH: "bg-surface text-accent",
  BROADCASTING: "bg-warning/10 text-warning",
  WORKER_RESPONSES: "bg-surface text-muted",
  CUSTOMER_SELECTING: "bg-surface text-accent",
  ACCEPTED: "bg-success text-success-fg",
  EN_ROUTE: "bg-accent/15 text-accent",
  ARRIVED: "bg-accent/15 text-accent",
  IN_PROGRESS: "bg-accent/15 text-accent",
  AWAITING_CUSTOMER_CONFIRMATION: "bg-warning/10 text-warning",
  COMPLETED: "bg-success text-success-fg",
  CANCELLED: "bg-warning/10 text-warning",
  EXPIRED: "bg-surface text-muted",
  DISPUTED: "bg-warning/10 text-warning",
};
