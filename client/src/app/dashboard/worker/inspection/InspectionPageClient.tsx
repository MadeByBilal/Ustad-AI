"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import JobPhotoUpload from "@/client/components/worker/JobPhotoUpload";
import { useJobStream } from "@/client/hooks/useJobStream";
import { motion, AnimatePresence } from "framer-motion";
import { getApiErrorMessage } from "@/client/lib/api-client";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ARRIVED: { label: "Arrived", color: "text-accent" },
  IN_PROGRESS: { label: "Working", color: "text-accent" },
  AWAITING_CUSTOMER_CONFIRMATION: { label: "Waiting for confirmation", color: "text-warning" },
  COMPLETED: { label: "Completed", color: "text-success-fg" },
};

export default function InspectionPageClient({
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
  const [description, setDescription] = useState(initialCompletion?.note ?? "");
  const [inspectionDone, setInspectionDone] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
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

  useJobStream(jobId, () => { void refresh(); });

  useEffect(() => {
    const poll = setInterval(() => void refresh(), 5000);
    return () => clearInterval(poll);
  }, [refresh]);

  const statusInfo = STATUS_LABELS[jobStatus] ?? { label: jobStatus, color: "text-muted" };
  const hasBeforePhoto = Boolean(completion?.before_photo_id);

  function handlePhotoChanged() {
    void refresh();
  }

  // Handle "Inspection Done" — show two choices
  async function handleInspectionDone() {
    if (!hasBeforePhoto) {
      setAdvanceError("Please take a photo before continuing");
      return;
    }
    setInspectionDone(true);
  }

  // Choice 1: Just inspection — advance to AWAITING_CUSTOMER_CONFIRMATION
  async function handleJustInspection() {
    setAdvancing(true);
    setAdvanceError(null);
    try {
      // If at ARRIVED, must go through IN_PROGRESS first
      if (jobStatus === "ARRIVED") {
        const res = await fetch(`/api/jobs/${jobId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.success) {
          throw new Error(getApiErrorMessage(body, "Status update failed"));
        }
      }

      // Now go to AWAITING_CUSTOMER_CONFIRMATION
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "AWAITING_CUSTOMER_CONFIRMATION" }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Status update failed"));
      }

      window.location.href = `/dashboard/worker/work`;
    } catch (e) {
      setAdvanceError(e instanceof Error ? e.message : "Failed");
      setAdvancing(false);
    }
  }

  // Choice 2: Needs work — send price offer to customer
  async function handleNeedsWork() {
    const price = parseInt(offerPrice, 10);
    if (!price || price <= 0) {
      setAdvanceError("Please enter a valid price");
      return;
    }
    setSendingOffer(true);
    setAdvanceError(null);
    try {
      // Advance to IN_PROGRESS first if needed
      if (jobStatus === "ARRIVED") {
        const res = await fetch(`/api/jobs/${jobId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.success) {
          throw new Error(getApiErrorMessage(body, "Status update failed"));
        }
      }

      // Send counter offer via chat
      const msgRes = await fetch(`/api/jobs/${jobId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `Inspection complete. This job needs additional work. My offer: Rs ${price.toLocaleString("en-PK")}`,
        }),
      });
      const msgBody = await msgRes.json().catch(() => null);
      if (!msgRes.ok || !msgBody?.success) {
        throw new Error(getApiErrorMessage(msgBody, "Failed to send offer"));
      }

      setOfferSent(true);
    } catch (e) {
      setAdvanceError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSendingOffer(false);
    }
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
      if (!res.ok && !(res.status === 409 && body?.details?.code === "invalid_status")) {
        throw new Error(getApiErrorMessage(body, "Cancel failed"));
      }
      window.location.href = "/dashboard/worker";
    } catch (e) {
      setAdvanceError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }

  // Completed / Cancelled states
  if (jobStatus === "COMPLETED") {
    return (
      <div className="card flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success">
          <svg className="h-8 w-8 text-success-fg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-text">Job Completed!</p>
          <p className="mt-1 text-sm text-muted">The customer has confirmed the work.</p>
        </div>
        <Link href="/dashboard/worker" className="btn-primary !rounded-xl !px-6 !py-2.5 text-sm">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (jobStatus === "CANCELLED") {
    return (
      <div className="card flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
          <svg className="h-8 w-8 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-text">Job Cancelled</p>
          <p className="mt-1 text-sm text-muted">This job has been cancelled.</p>
        </div>
        <Link href="/dashboard/worker" className="btn-primary !rounded-xl !px-6 !py-2.5 text-sm">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Offer sent confirmation
  if (offerSent) {
    return (
      <div className="space-y-4">
        <motion.div
          className="card flex flex-col items-center gap-4 py-12 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
            <svg className="h-8 w-8 text-success-fg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-text">Offer Sent!</p>
            <p className="mt-1 text-sm text-muted">
              Waiting for customer to accept your offer of Rs {parseInt(offerPrice, 10).toLocaleString("en-PK")}
            </p>
          </div>
          <Link href={`/dashboard/worker/chat/${jobId}`} className="btn-primary !rounded-xl !px-6 !py-2.5 text-sm">
            Open Chat
          </Link>
        </motion.div>
      </div>
    );
  }

  // Two-path choice after inspection done
  if (inspectionDone) {
    return (
      <div className="space-y-4">
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-sm font-bold text-text">What happens next?</p>
          <p className="mt-1 text-xs text-muted">Choose how to proceed with this job</p>
        </motion.div>

        {advanceError && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            {advanceError}
          </div>
        )}

        {/* Choice 1: Just Inspection */}
        <motion.button
          type="button"
          onClick={() => void handleJustInspection()}
          disabled={advancing}
          whileTap={{ scale: 0.97 }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="card w-full text-left transition-colors hover:bg-accent/5 disabled:opacity-60"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/15">
              <svg className="h-6 w-6 text-success-fg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-text">Just Inspection</p>
              <p className="mt-0.5 text-xs text-muted">
                Customer already decided payment. Mark job as complete.
              </p>
            </div>
          </div>
        </motion.button>

        {/* Choice 2: Needs Work */}
        <motion.div
          className="card transition-colors"
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15">
              <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text">Needs Work</p>
              <p className="mt-0.5 text-xs text-muted">
                Set a price and send offer to customer.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm font-bold text-muted">Rs</span>
            <input
              type="number"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              placeholder="Enter price"
              min="0"
              className="flex-1 rounded-xl border border-divider bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-accent"
            />
            <motion.button
              type="button"
              onClick={() => void handleNeedsWork()}
              disabled={sendingOffer || !offerPrice}
              whileTap={{ scale: 0.97 }}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-bg transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {sendingOffer ? "Sending..." : "Send Offer"}
            </motion.button>
          </div>
        </motion.div>

        <motion.button
          type="button"
          onClick={() => setInspectionDone(false)}
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-xl border border-divider px-4 py-3 text-sm font-semibold text-muted transition-colors hover:bg-surface"
        >
          Go Back
        </motion.button>
      </div>
    );
  }

  // Main inspection view
  return (
    <div className="space-y-4">
      {/* Job Info */}
      <motion.div className="card" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-sm font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
            <p className="mt-1 font-urdu text-sm text-text">
              {originalText || "Job in progress"}
            </p>
          </div>
          <Link
            href={`/dashboard/worker/chat/${jobId}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-bg"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </Link>
        </div>
      </motion.div>

      {/* Photo Upload — required */}
      <motion.div className="card space-y-3" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Inspection Photo
          </p>
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
            Required
          </span>
        </div>
        <JobPhotoUpload
          jobId={jobId}
          type="before"
          currentId={completion?.before_photo_id ?? null}
          onChanged={handlePhotoChanged}
          label="Inspection photo"
          description="Take a photo of the current state"
        />
      </motion.div>

      {/* Description */}
      <motion.div className="card space-y-3" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Description
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you found during inspection..."
          rows={3}
          className="w-full rounded-xl border border-divider bg-bg px-4 py-3 text-sm text-text outline-none focus:border-accent resize-none"
        />
      </motion.div>

      {/* Error */}
      {advanceError && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {advanceError}
        </div>
      )}

      {/* Inspection Done Button */}
      <motion.button
        type="button"
        onClick={() => void handleInspectionDone()}
        disabled={!hasBeforePhoto}
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="btn-primary w-full !rounded-xl !px-4 !py-3 text-sm disabled:opacity-50"
      >
        Inspection Done
      </motion.button>

      {/* Cancel */}
      <motion.button
        type="button"
        onClick={() => void handleCancel()}
        disabled={cancelling}
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="w-full rounded-xl border border-warning px-4 py-3 text-sm font-semibold text-warning transition-colors hover:bg-warning/10 disabled:opacity-60"
      >
        {cancelling ? "Cancelling..." : "Cancel Job"}
      </motion.button>
    </div>
  );
}
