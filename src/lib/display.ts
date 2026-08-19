import type { JobStatus } from "@/models";

export const JOB_STATUS_STYLES: Record<JobStatus, string> = {
  DRAFT: "bg-stone-100 text-stone-600",
  ANALYZING: "bg-sky-100 text-sky-800",
  WAITING_FOR_CUSTOMER: "bg-violet-100 text-violet-800",
  READY_TO_MATCH: "bg-indigo-100 text-indigo-800",
  BROADCASTING: "bg-amber-100 text-amber-800",
  WORKER_RESPONSES: "bg-cyan-100 text-cyan-800",
  CUSTOMER_SELECTING: "bg-fuchsia-100 text-fuchsia-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  EN_ROUTE: "bg-emerald-100 text-emerald-800",
  ARRIVED: "bg-emerald-100 text-emerald-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  AWAITING_CUSTOMER_CONFIRMATION: "bg-violet-100 text-violet-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
  EXPIRED: "bg-stone-200 text-stone-500",
  DISPUTED: "bg-red-100 text-red-700",
};