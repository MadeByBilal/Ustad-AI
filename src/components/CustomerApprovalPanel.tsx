"use client";

import { useCallback, useEffect, useState } from "react";
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
        <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
        <h2 className="text-base font-bold text-stone-800">Needs Your Approval</h2>
      </div>

      {message && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      {jobs.map((job) => (
        <div key={job.job_id} className="card border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-stone-800">Work completed</p>
              <p className="font-urdu text-base font-semibold text-stone-900">
                {job.worker_name}
              </p>
              <p className="mt-0.5 line-clamp-1 text-sm text-stone-500">
                {job.original_text}
              </p>
              {job.final_price && (
                <p className="mt-1 text-sm font-semibold text-[#0e5f44]">
                  Rs {job.final_price.toLocaleString("en-PK")}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => void handleApprove(job.job_id, "approve")}
              disabled={approving !== null}
              className="btn-primary flex-1 !bg-emerald-600 hover:!bg-emerald-700"
            >
              {approving === job.job_id ? "Approving…" : "Approve Work"}
            </button>
            <button
              type="button"
              onClick={() => void handleApprove(job.job_id, "dispute")}
              disabled={approving !== null}
              className="btn-danger flex-1"
            >
              {approving === job.job_id ? "Submitting…" : "Dispute"}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
