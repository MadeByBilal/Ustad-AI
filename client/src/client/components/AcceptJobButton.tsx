"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { getApiErrorMessage } from "@/client/lib/api-client";

export default function AcceptJobButton({ jobId }: { jobId: string }) {
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/accept`, { method: "POST" });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: unknown;
      } | null;
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, `Request failed (${res.status})`));
      }
      setAccepted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (accepted) {
    return (
      <span className="badge shrink-0 bg-success text-success-fg">
        <Check className="h-3.5 w-3.5 inline mr-1" /> Accepted
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <motion.button
        type="button"
        onClick={handleAccept}
        disabled={busy}
        className="btn-primary !rounded-xl !px-4 !py-2 text-sm disabled:opacity-60"
        whileTap={{ scale: 0.95 }}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        {busy ? "Accepting…" : "Accept job"}
      </motion.button>
      {error && <span className="text-xs text-warning">{error}</span>}
    </div>
  );
}
