"use client";

import { useRouter } from "next/navigation";
import WorkerChat from "@/components/worker/WorkerChat";

export default function CustomerChatPageClient({
  jobId,
  originalText,
}: {
  jobId: string;
  originalText: string;
}) {
  const router = useRouter();

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-stone-100"
        >
          <svg className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-stone-800">Worker</p>
          <p className="truncate text-sm text-stone-500">{originalText}</p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <WorkerChat jobId={jobId} />
      </div>
    </div>
  );
}
