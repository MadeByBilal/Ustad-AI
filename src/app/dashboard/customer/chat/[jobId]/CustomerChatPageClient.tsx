"use client";

import { useRouter } from "next/navigation";
import WorkerChat from "@/components/worker/WorkerChat";
import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n/context";

export default function CustomerChatPageClient({
  jobId,
  originalText,
}: {
  jobId: string;
  originalText: string;
}) {
  const router = useRouter();
  const { t } = useLang();

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
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-bg"
        >
          <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </motion.button>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-text">{t("worker")}</p>
          <p className="truncate text-sm text-muted">{originalText}</p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <WorkerChat jobId={jobId} />
      </div>
    </div>
  );
}
