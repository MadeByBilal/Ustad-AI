"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import JobPhotoUpload from "./JobPhotoUpload";
import LiveTracker from "./LiveTracker";
import { getApiErrorMessage } from "@/client/lib/api-client";

interface ActiveJob {
  _id: string;
  status: string;
  input?: {
    original_text?: string;
  };
  understanding?: {
    category?: string;
    subcategory?: string;
    description?: string;
    required_skills?: string[];
    urgency?: string;
  };
  pricing?: {
    customer_offer?: number;
    worker_counter_offer?: number | null;
    final_price?: number | null;
    currency?: string;
  };
  location?: {
    address_label?: string;
  };
  completion?: {
    before_photo_id?: string | null;
    after_photo_id?: string | null;
    note?: string | null;
  };
}

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  WORKER_RESPONSES: {
    label: "Awaiting customer approval",
    style: "bg-surface text-muted",
  },
  ACCEPTED: { label: "Job accepted", style: "bg-success text-white" },
  EN_ROUTE: { label: "On the way", style: "bg-accent/15 text-accent" },
  ARRIVED: { label: "Arrived", style: "bg-accent/15 text-accent" },
  IN_PROGRESS: { label: "Work in progress", style: "bg-accent/15 text-accent" },
  AWAITING_CUSTOMER_CONFIRMATION: {
    label: "Work complete — awaiting confirmation",
    style: "bg-warning/10 text-warning",
  },
};

const NEXT_ACTIONS: Record<
  string,
  { label: string; to: string; key: string }
> = {
  ACCEPTED: { label: "On the way", to: "EN_ROUTE", key: "en_route" },
  EN_ROUTE: { label: "Arrived", to: "ARRIVED", key: "arrived" },
  ARRIVED: { label: "Start work", to: "IN_PROGRESS", key: "start" },
  IN_PROGRESS: {
    label: "Complete",
    to: "AWAITING_CUSTOMER_CONFIRMATION",
    key: "complete",
  },
};

/**
 * Active job panel: prominent status, the next lifecycle action, the
 * before/after photo gates and the live chat with the customer.
 */
export default function ActiveJobPanel({
  job,
  workerId,
  onChanged,
}: {
  job: ActiveJob | null;
  workerId?: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!job) {
    return (
      <section className="card">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Active job
        </h2>
        <p className="mt-3 rounded-xl border border-dashed border-divider p-4 text-sm text-muted">
          No active job. Accept a job below to start working.
        </p>
      </section>
    );
  }

  const activeJob = job;

  const statusInfo = STATUS_LABELS[activeJob.status] ?? {
    label: activeJob.status.replace(/_/g, " "),
    style: "bg-surface text-muted",
  };
  const next = NEXT_ACTIONS[activeJob.status];
  const emergency = activeJob.understanding?.urgency === "emergency";
  const price =
    activeJob.pricing?.final_price ??
    activeJob.pricing?.worker_counter_offer ??
    activeJob.pricing?.customer_offer ??
    0;

  async function advance() {
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${activeJob._id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next.to }),
      });
       const body = await res.json().catch(() => null);
       if (!res.ok || !body?.success) {
         throw new Error(getApiErrorMessage(body, "Status update failed"));
      }
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  const canAttachPhotos = ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(
    job.status
  );
  const completionNote = job.completion?.note;

  return (
    <section className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Active job
          </h2>
          <p className="mt-1 font-urdu text-lg font-bold leading-relaxed text-text">
            {job.input?.original_text}
          </p>
          {job.understanding?.description && (
            <p className="mt-1 text-sm text-muted">
              {job.understanding.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="badge bg-surface text-muted capitalize">
              {job.understanding?.category?.replace(/_/g, " ")}
            </span>
            {emergency && <span className="badge bg-warning text-bg">Emergency</span>}
            <span className="font-mono font-semibold text-text">
              {job.pricing?.currency ?? "Rs"} {price.toLocaleString("en-PK")}
            </span>
            {job.location?.address_label && (
              <span>· {job.location.address_label}</span>
            )}
          </div>
        </div>
        <span className={`badge shrink-0 text-center ${statusInfo.style}`}>
          {statusInfo.label}
        </span>
      </div>

      {job.status === "WORKER_RESPONSES" && (
          <p className="rounded-xl bg-surface px-3 py-2 text-sm text-muted">
          Your offer is with the customer — they will confirm or decline shortly.
          The job starts as soon as they approve.
        </p>
      )}

      {next && (
        <div className="flex items-center justify-end gap-2 border-t border-divider pt-3">
          {error && <span className="text-xs text-warning">{error}</span>}
          <motion.button
            type="button"
            onClick={() => void advance()}
            disabled={busy}
            className="btn-primary !rounded-xl !px-4 !py-2 text-sm disabled:opacity-60"
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {busy ? "Updating…" : next.label}
          </motion.button>
        </div>
      )}

      {canAttachPhotos && (
        <div className="grid gap-3 sm:grid-cols-2">
          <JobPhotoUpload
            jobId={job._id}
            type="before"
            currentId={job.completion?.before_photo_id ?? null}
            onChanged={onChanged}
          />
          <JobPhotoUpload
            jobId={job._id}
            type="after"
            currentId={job.completion?.after_photo_id ?? null}
            onChanged={onChanged}
          />
        </div>
      )}

      {completionNote && (
        <p className="rounded-xl bg-surface px-3 py-2 text-xs text-muted">
          Work note: {completionNote}
        </p>
      )}

      {activeJob.status === "EN_ROUTE" && (
        <LiveTracker
          jobId={activeJob._id}
          workerId={workerId}
          onArrived={onChanged}
        />
      )}
    </section>
  );
}
