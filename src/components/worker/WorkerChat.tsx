"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { fileToPhotoBase64 } from "@/lib/image";
import { useJobStream } from "@/lib/useJobStream";

interface ChatMessage {
  id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  media_ids: string[];
  location: { lat: number; lng: number } | null;
  created_at: string;
}

const POLL_MS = 10000;

/**
 * Simple job chat between the worker and the customer. Supports text,
 * photos and a shared live location. Lifecycle events arrive as system
 * messages ("Job accepted", "On the way", ...). Phone numbers are never
 * part of the chat.
 */
export default function WorkerChat({ jobId }: { jobId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/messages`, { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        data?: { messages?: ChatMessage[] };
      } | null;
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Could not load messages");
      }
      setMessages(body.data?.messages ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load messages");
    }
  }, [jobId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useJobStream(jobId, () => void load());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(body: {
    content?: string;
    photo_ids?: string[];
    location?: { lat: number; lng: number };
  }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const parsed = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !parsed?.success) {
        throw new Error(parsed?.error ?? "Message failed");
      }
      setDraft("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendPhoto(file: File) {
    try {
      if (!file.type.startsWith("image/")) return;
      const { mime, data } = await fileToPhotoBase64(file);
      const res = await fetch("/api/workers/me/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mime, data }),
      });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        data?: { photo_id?: string };
      } | null;
      if (!res.ok || !body?.success || !body.data?.photo_id) {
        throw new Error(body?.error ?? "Photo upload failed");
      }
      await send({ photo_ids: [body.data.photo_id] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo upload failed");
    }
  }

  function sendLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location sharing is not available on this device");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        void send({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }).finally(
          () => setBusy(false)
        ),
      () => {
        setError("Could not read your location");
        setBusy(false);
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }

  return (
    <div className="flex h-80 flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted">
            No messages yet — say salam to get started.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex flex-col">
              {m.sender_type === "system" ? (
                <p className="mx-auto rounded-full bg-surface px-3 py-1 text-center text-xs text-muted">
                  {m.content}
                </p>
              ) : (
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm shadow-sm ${
                    m.sender_type === "worker"
                      ? "self-end rounded-br-sm bg-accent text-bg"
                      : "self-start rounded-bl-sm bg-surface text-text ring-1 ring-divider"
                  }`}
                >
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide opacity-70">
                    {m.sender_type === "customer" ? m.sender_name : "You"}
                  </p>
                  {m.content && <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>}
                  {m.media_ids.map((id) => (
                    <img
                      key={id}
                      src={`/api/photos/${id}`}
                      alt="Shared photo"
                      className="mt-1 max-h-40 rounded-lg object-cover"
                    />
                  ))}
                  {m.location && (
                    <a
                      href={`https://www.google.com/maps?q=${m.location.lat},${m.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-1 flex items-center gap-1 text-xs font-semibold underline ${
                        m.sender_type === "worker" ? "text-bg" : "text-accent"
                      }`}
                    >
                      📍 Shared location — open in maps
                    </a>
                  )}
                  <p className="mt-1 text-right text-xs opacity-60">
                    {new Date(m.created_at).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="mb-1 text-xs text-warning">{error}</p>}

      <div className="mt-2 flex items-center gap-2 border-t border-divider pt-2">
        <motion.button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-label="Send a photo"
          title="Send a photo"
          className="shrink-0 rounded-xl border border-divider bg-surface px-2.5 py-2 text-sm transition-colors hover:bg-bg disabled:opacity-60"
          whileTap={{ scale: 0.95 }}
          whileHover={{ y: -1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          📷
        </motion.button>
        <motion.button
          type="button"
          onClick={sendLocation}
          disabled={busy}
          aria-label="Share location"
          title="Share location"
          className="shrink-0 rounded-xl border border-divider bg-surface px-2.5 py-2 text-sm transition-colors hover:bg-bg disabled:opacity-60"
          whileTap={{ scale: 0.95 }}
          whileHover={{ y: -1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          📍
        </motion.button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          aria-label="Chat photo"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void sendPhoto(file);
            e.target.value = "";
          }}
        />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim() && !busy) {
              void send({ content: draft.trim() });
            }
          }}
          placeholder="Type a message…"
          aria-label="Chat message"
          className="min-w-0 flex-1 rounded-xl border border-divider bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
        />
        <motion.button
          type="button"
          onClick={() => {
            if (draft.trim() && !busy) void send({ content: draft.trim() });
          }}
          disabled={busy || !draft.trim()}
          className="btn-primary shrink-0 !rounded-xl !px-3 !py-2 text-sm disabled:opacity-60"
          whileTap={{ scale: 0.95 }}
          whileHover={{ y: -1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          Send
        </motion.button>
      </div>
    </div>
  );
}
