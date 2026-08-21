"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import JobPhotoUpload from "@/components/worker/JobPhotoUpload";
import { useJobStream } from "@/lib/useJobStream";

const NEXT_ACTIONS: Record<string, { label: string; to: string }> = {
  ACCEPTED: { label: "On the way", to: "EN_ROUTE" },
  EN_ROUTE: { label: "Arrived", to: "ARRIVED" },
  ARRIVED: { label: "Start work", to: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Complete", to: "AWAITING_CUSTOMER_CONFIRMATION" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACCEPTED: { label: "Ready to go", color: "text-emerald-600" },
  EN_ROUTE: { label: "On the way", color: "text-green-600" },
  ARRIVED: { label: "Arrived", color: "text-blue-600" },
  IN_PROGRESS: { label: "Working", color: "text-violet-600" },
  AWAITING_CUSTOMER_CONFIRMATION: { label: "Waiting for confirmation", color: "text-amber-600" },
  COMPLETED: { label: "Completed", color: "text-emerald-600" },
  CANCELLED: { label: "Cancelled", color: "text-red-600" },
};

export default function WorkerWorkPageClient({
  jobId,
  jobStatus: initialStatus,
  originalText,
  completion: initialCompletion,
}: {
  jobId: string;
  jobStatus: string;
  originalText: string;
  completion?: {
    before_photo_id?: string | null;
    after_photo_id?: string | null;
    note?: string | null;
  } | null;
}) {
  const [jobStatus, setJobStatus] = useState(initialStatus);
  const [completion, setCompletion] = useState(initialCompletion);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [advanceSuccess, setAdvanceSuccess] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/tracking`);
      const body = await res.json().catch(() => null);
      if (body?.success && body.data) {
        if (body.data.status) setJobStatus(body.data.status);
        setCompletion({
          before_photo_id: body.data.before_photo_id ?? null,
          after_photo_id: body.data.after_photo_id ?? null,
          note: body.data.note ?? null,
        });
      }
    } catch {
      // ignore
    }
  }, [jobId]);

  // Real-time updates via SSE
  useJobStream(jobId, () => {
    void refresh();
  });

  // Also poll every 5 seconds as fallback
  useEffect(() => {
    const poll = setInterval(() => void refresh(), 5000);
    return () => clearInterval(poll);
  }, [refresh]);

  const nextAction = NEXT_ACTIONS[jobStatus];
  const statusInfo = STATUS_LABELS[jobStatus] ?? { label: jobStatus, color: "text-stone-600" };
  const canAttachPhotos = ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(jobStatus);
  const isCompleted = jobStatus === "COMPLETED";
  const isCancelled = jobStatus === "CANCELLED";

  async function handleAdvance() {
    if (!nextAction) return;
    setAdvancing(true);
    setAdvanceError(null);
    setAdvanceSuccess(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextAction.to }),
      });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Status update failed");
      }
      setJobStatus(nextAction.to);
      setAdvanceSuccess(`${nextAction.label} — done`);
    } catch (e) {
      setAdvanceError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAdvancing(false);
    }
  }

  function handlePhotoChanged() {
    void refresh();
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this job?")) return;
    setCancelling(true);
    setAdvanceError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by worker" }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Cancel failed");
      }
      setJobStatus("CANCELLED");
    } catch (e) {
      setAdvanceError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }

  // Completed state
  if (isCompleted) {
    return (
      <div className="card flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-stone-800">Job Completed!</p>
          <p className="mt-1 text-sm text-stone-500">The customer has confirmed the work.</p>
        </div>
        <Link
          href="/dashboard/worker"
          className="rounded-xl bg-[#0e5f44] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b4c37]"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Cancelled state
  if (isCancelled) {
    return (
      <div className="card flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-stone-800">Job Cancelled</p>
          <p className="mt-1 text-sm text-stone-500">This job has been cancelled.</p>
        </div>
        <Link
          href="/dashboard/worker"
          className="rounded-xl bg-[#0e5f44] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b4c37]"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Job Info */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-sm font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
            <p className="mt-1 font-urdu text-sm text-stone-700">
              {originalText || "Job in progress"}
            </p>
          </div>
          <Link
            href={`/dashboard/worker/chat/${jobId}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0e5f44] text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Photos */}
      {canAttachPhotos && (
        <div className="card space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Job Photos
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <JobPhotoUpload
              jobId={jobId}
              type="before"
              currentId={completion?.before_photo_id ?? null}
              onChanged={handlePhotoChanged}
            />
            <JobPhotoUpload
              jobId={jobId}
              type="after"
              currentId={completion?.after_photo_id ?? null}
              onChanged={handlePhotoChanged}
            />
          </div>
        </div>
      )}

      {/* Messages */}
      {advanceError && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {advanceError}
        </div>
      )}
      {advanceSuccess && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {advanceSuccess}
        </div>
      )}

      {/* Advance Button */}
      {nextAction && (
        <button
          type="button"
          onClick={() => void handleAdvance()}
          disabled={advancing}
          className="w-full rounded-xl bg-[#0e5f44] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0b4c37] disabled:opacity-60"
        >
          {advancing ? "Updating…" : nextAction.label}
        </button>
      )}

      {/* Cancel Button */}
      <button
        type="button"
        onClick={() => void handleCancel()}
        disabled={cancelling}
        className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
      >
        {cancelling ? "Cancelling…" : "Cancel Job"}
      </button>
    </div>
  );
}
