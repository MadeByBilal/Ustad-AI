"use client";

import { useState } from "react";
import JobPhotoUpload from "./JobPhotoUpload";
import WorkerChat from "./WorkerChat";
import LiveTracker from "./LiveTracker";

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
    style: "!bg-cyan-100 !text-cyan-800",
  },
  ACCEPTED: { label: "Job accepted", style: "!bg-emerald-100 !text-emerald-800" },
  EN_ROUTE: { label: "On the way", style: "!bg-emerald-100 !text-emerald-800" },
  ARRIVED: { label: "Arrived", style: "!bg-emerald-100 !text-emerald-800" },
  IN_PROGRESS: { label: "Work in progress", style: "!bg-blue-100 !text-blue-800" },
  AWAITING_CUSTOMER_CONFIRMATION: {
    label: "Work complete — awaiting confirmation",
    style: "!bg-violet-100 !text-violet-800",
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
  onChanged,
}: {
  job: ActiveJob | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!job) {
    return (
      <section className="card">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
          Active job
        </h2>
        <p className="mt-3 rounded-xl border border-dashed border-stone-200 p-4 text-sm text-stone-400">
          No active job. Accept a job below to start working.
        </p>
      </section>
    );
  }

  const activeJob = job;

  const statusInfo = STATUS_LABELS[activeJob.status] ?? {
    label: activeJob.status.replace(/_/g, " "),
    style: "!bg-stone-100 !text-stone-600",
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
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Status update failed");
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
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
            Active job
          </h2>
          <p className="mt-1 font-urdu text-lg font-bold leading-relaxed text-stone-800">
            {job.input?.original_text}
          </p>
          {job.understanding?.description && (
            <p className="mt-1 text-sm text-stone-600">
              {job.understanding.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <span className="badge !bg-stone-100 !text-stone-600 capitalize">
              {job.understanding?.category?.replace(/_/g, " ")}
            </span>
            {emergency && <span className="badge !bg-red-600 !text-white">Emergency</span>}
            <span className="font-semibold text-stone-800">
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
        <p className="rounded-xl bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
          Your offer is with the customer — they will confirm or decline shortly.
          The job starts as soon as they approve.
        </p>
      )}

      {next && (
        <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-3">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            type="button"
            onClick={() => void advance()}
            disabled={busy}
            className="rounded-xl bg-[#0e5f44] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b4c37] disabled:opacity-60"
          >
            {busy ? "Updating…" : next.label}
          </button>
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
        <p className="rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-600">
          Work note: {completionNote}
        </p>
      )}

      {activeJob.status === "EN_ROUTE" && (
        <LiveTracker jobId={activeJob._id} />
      )}

      <div className="border-t border-stone-100 pt-3">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">
          Chat with customer
        </h3>
        <WorkerChat jobId={job._id} />
      </div>
    </section>
  );
}