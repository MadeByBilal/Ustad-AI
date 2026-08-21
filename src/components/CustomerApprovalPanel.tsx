"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { parseApiResponse } from "@/lib/api-client";

const POLL_MS = 5000;

interface ApprovalJob {
  job_id: string;
  status: string;
  category: string;
  original_text: string;
  worker_name: string;
  final_price: number | null;
}

export default function CustomerApprovalPanel() {
  const [jobs, setJobs] = useState<ApprovalJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const body = await parseApiResponse<{ requests: ApprovalJob[] }>(
        await fetch("/api/requests/list", { cache: "no-store" })
      );
      const pending = (body.requests ?? []).filter(
        (r) => r.status === "AWAITING_CUSTOMER_CONFIRMATION"
      );
      setJobs(pending);
      setMessage(null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  async function handleApprove(jobId: string, action: "approve" | "dispute") {
    setApproving(jobId);
    setMessage(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Action failed");
      }
      setMessage({
        ok: true,
        text: action === "approve" ? "Work approved!" : "Dispute submitted",
      });
      await refresh();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Action failed" });
    } finally {
      setApproving(null);
    }
  }

  if (loading || jobs.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-warning" />
        <h2 className="font-display text-base font-bold text-text">Needs Your Approval</h2>
      </div>

      {message && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            message.ok ? "bg-success/15 text-success-fg" : "bg-warning/10 text-warning"
          }`}
        >
          {message.text}
        </p>
      )}

      {jobs.map((job) => (
        <motion.div key={job.job_id} className="card border-warning/40 bg-surface" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success">
              <svg className="h-6 w-6 text-success-fg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text">Work completed</p>
            <p className="font-urdu text-base font-semibold text-text">
                {job.worker_name}
              </p>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                {job.original_text}
              </p>
              {job.final_price && (
                <p className="mt-1 font-mono text-sm font-semibold text-success-fg">
                  Rs {job.final_price.toLocaleString("en-PK")}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <motion.button
              type="button"
              onClick={() => void handleApprove(job.job_id, "approve")}
              disabled={approving !== null}
              className="btn-primary flex-1"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {approving === job.job_id ? "Approving…" : "Approve Work"}
            </motion.button>
            <motion.button
              type="button"
              onClick={() => void handleApprove(job.job_id, "dispute")}
              disabled={approving !== null}
              className="btn-danger flex-1"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {approving === job.job_id ? "Submitting…" : "Dispute"}
            </motion.button>
          </div>
        </motion.div>
      ))}
    </section>
  );
}
