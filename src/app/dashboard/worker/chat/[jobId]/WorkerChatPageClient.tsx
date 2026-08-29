"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WorkerChat from "@/components/worker/WorkerChat";
import JobPhotoUpload from "@/components/worker/JobPhotoUpload";
import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n/context";

export default function WorkerChatPageClient({
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
  const router = useRouter();
  const { t } = useLang();
  const [jobStatus, setJobStatus] = useState(initialStatus);
  const [completion, setCompletion] = useState(initialCompletion);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const NEXT_ACTIONS: Record<string, { label: string; to: string }> = {
    ACCEPTED: { label: t("onTheWay"), to: "EN_ROUTE" },
    EN_ROUTE: { label: t("arrived"), to: "ARRIVED" },
    ARRIVED: { label: t("startWork"), to: "IN_PROGRESS" },
    IN_PROGRESS: { label: t("completed"), to: "AWAITING_CUSTOMER_CONFIRMATION" },
  };

  const nextAction = NEXT_ACTIONS[jobStatus];
  const canAttachPhotos = ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(jobStatus);

  async function handleAdvance() {
    if (!nextAction) return;
    setAdvancing(true);
    setAdvanceError(null);
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
    } catch (e) {
      setAdvanceError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAdvancing(false);
    }
  }

  function handlePhotoChanged() {
    // Re-fetch job to get updated completion data
    fetch(`/api/jobs/${jobId}/tracking`)
      .then((r) => r.json())
      .then((body) => {
        if (body?.success && body.data) {
          setCompletion({
            before_photo_id: body.data.before_photo_id ?? null,
            after_photo_id: body.data.after_photo_id ?? null,
            note: body.data.note ?? null,
          });
        }
      })
      .catch(() => {});
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-divider bg-surface px-4 py-3">
        <motion.button
          type="button"
          onClick={() => router.back()}
          whileTap={{ scale: 0.95 }}
          whileHover={{ y: -1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bg"
        >
          <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </motion.button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text">{t("customerLabel")}</p>
          <p className="truncate text-xs text-muted">{originalText}</p>
        </div>
        <span className="badge bg-accent text-bg">
          {jobStatus.replace(/_/g, " ")}
        </span>
      </div>

      {/* Photo uploads + Complete button */}
      {canAttachPhotos && (
        <div className="space-y-3 border-b border-divider bg-surface px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            {t("jobPhotos")}
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

          {nextAction && (
            <div className="flex items-center gap-2">
              {advanceError && (
                <span className="text-xs text-warning">{advanceError}</span>
              )}
              <motion.button
                type="button"
                onClick={() => void handleAdvance()}
                disabled={advancing}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="btn-primary w-full !rounded-xl !px-4 !py-2.5 text-sm disabled:opacity-60"
              >
                {advancing ? t("loading") : nextAction.label}
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <WorkerChat jobId={jobId} />
      </div>
    </div>
  );
}
