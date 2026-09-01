"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { fileToPhotoBase64 } from "@/client/lib/image";
import { Camera } from "lucide-react";

/**
 * Before/after photo upload for an active job. The image is compressed in
 * the browser, uploaded via /api/workers/me/photos and attached to the
 * job with POST /api/jobs/:id/media (with an optional work note).
 */
export default function JobPhotoUpload({
  jobId,
  type,
  currentId,
  onChanged,
}: {
  jobId: string;
  type: "before" | "after";
  currentId: string | null;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (!file.type.startsWith("image/")) {
        setError("Only images are allowed");
        return;
      }
      const { mime, data } = await fileToPhotoBase64(file);
      const uploadRes = await fetch("/api/workers/me/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mime, data }),
      });
      const uploadBody = (await uploadRes.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        data?: { photo_id?: string };
      } | null;
      if (!uploadRes.ok || !uploadBody?.success || !uploadBody.data?.photo_id) {
        throw new Error(uploadBody?.error ?? "Photo upload failed");
      }

      const attachRes = await fetch(`/api/jobs/${jobId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          photo_id: uploadBody.data.photo_id,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      const attachBody = (await attachRes.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;
      if (!attachRes.ok || !attachBody?.success) {
        throw new Error(attachBody?.error ?? "Photo attach failed");
      }

      setPreview(URL.createObjectURL(file));
      setNote("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setBusy(false);
    }
  }

  const shown = preview ?? (currentId ? `/api/photos/${currentId}` : null);

  return (
    <div className="rounded-xl border border-divider bg-surface p-3">
      <div className="flex flex-wrap items-center gap-3">
        {shown ? (
          <img
            src={shown}
            alt={`${type} photo`}
            className="h-16 w-16 rounded-lg object-cover ring-1 ring-divider"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-bg text-muted">
            <Camera className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            {type === "before" ? "Before photo" : "After photo"}
          </p>
          <p className="text-xs text-muted">
            {type === "before"
              ? "Required for normal jobs before starting work"
              : "Required before completing the job"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            aria-label={`${type} photo`}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <motion.button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-2 rounded-lg border border-divider bg-bg px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface disabled:opacity-60"
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {busy ? "Uploading…" : currentId || preview ? "Replace photo" : "Add photo"}
          </motion.button>
        </div>
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note, e.g. Replaced faucet washer"
        aria-label={`${type} photo note`}
        className="mt-2 w-full rounded-lg border border-divider bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
      />

      {error && <p className="mt-1 text-xs text-warning">{error}</p>}
    </div>
  );
}
