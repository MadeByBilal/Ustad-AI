"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const POLL_MS = 10000;

interface ChatJob {
  job_id: string;
  status: string;
  category: string;
  original_text: string;
  customer_name: string;
  last_message: string;
  last_message_at: string;
  unread: boolean;
}

export default function WorkerChatList({ workerId }: { workerId: string }) {
  const [jobs, setJobs] = useState<ChatJob[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers/${workerId}/dashboard`, {
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (!body?.success) return;

      const activeJob = body.data?.active_job;
      const chatJobs: ChatJob[] = [];

      if (activeJob && ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(activeJob.status)) {
        chatJobs.push({
          job_id: activeJob._id,
          status: activeJob.status,
          category: activeJob.understanding?.category ?? "",
          original_text: activeJob.input?.original_text ?? "",
          customer_name: "Customer",
          last_message: "Open chat",
          last_message_at: new Date().toISOString(),
          unread: false,
        });
      }

      setJobs(chatJobs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-[#0e5f44]" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
          <svg className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-stone-600">No active chats</p>
        <p className="text-xs text-stone-400">Chat will appear when you have an active job</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <Link
          key={job.job_id}
          href={`/dashboard/worker/chat/${job.job_id}`}
          className="block"
        >
          <div className="card flex items-center gap-3 transition-all active:scale-[0.98]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0e5f44]">
              <span className="text-lg font-bold text-white">
                {job.customer_name.charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-stone-800">{job.customer_name}</p>
                <span className="text-[10px] text-stone-400">
                  {new Date(job.last_message_at).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="truncate text-xs text-stone-500">{job.last_message}</p>
              <p className="mt-0.5 text-[10px] text-stone-400">
                {job.category?.replace(/_/g, " ")}
              </p>
            </div>
            {job.unread && (
              <div className="h-3 w-3 shrink-0 rounded-full bg-[#0e5f44]" />
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
