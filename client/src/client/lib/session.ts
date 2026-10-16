"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface SessionUser {
  id: string;
  role: string;
  name?: string;
  email?: string;
  language?: string;
  profile_image?: string | null;
  stats?: {
    average_rating: number;
    reviews_count: number;
    trust_score: number;
    cancellations: number;
  };
}

export interface SessionWorker {
  _id: string;
  name?: string;
  category?: string;
  active_job_id?: string | null;
}

export type SessionResult =
  | { status: "authed"; user: SessionUser }
  | { status: "anonymous" }
  | { status: "unreachable" };

export type WorkerResult =
  | { status: "found"; worker: SessionWorker }
  | { status: "none" }
  | { status: "unreachable" };

const REQUEST_TIMEOUT_MS = 12_000;
const FETCH_ATTEMPTS = 4;
const RETRY_DELAY_MS = 5_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * JSON fetch with patience. Free-tier hosts sleep when idle and the first
 * request after a while can fail or hang, so transient errors are retried a
 * few times instead of surfacing — a cold start must never look like being
 * logged out.
 *
 * Returns null only when every attempt failed (server unreachable).
 */
async function fetchJson(
  path: string,
): Promise<{ status: number; body: unknown } | null> {
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(path, {
          cache: "no-store",
          signal: controller.signal,
        });
        // Definite answers — including auth rejections — are worth no retry.
        if (
          res.ok ||
          res.status === 401 ||
          res.status === 403 ||
          res.status === 404
        ) {
          const body = await res.json().catch(() => null);
          return { status: res.status, body };
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Network error / timeout — fall through and retry.
    }
    if (attempt < FETCH_ATTEMPTS - 1) await sleep(700 * (attempt + 1));
  }
  return null;
}

export async function fetchSession(): Promise<SessionResult> {
  const res = await fetchJson("/api/auth/me");
  if (!res) return { status: "unreachable" };
  if (res.status === 401 || res.status === 403) return { status: "anonymous" };

  const body = res.body as
    | { success?: boolean; data?: { user?: SessionUser | null } }
    | null;
  if (body?.success && body.data?.user) {
    return { status: "authed", user: body.data.user };
  }
  if (body?.success) return { status: "anonymous" };
  return { status: "unreachable" };
}

export async function fetchWorker(userId: string): Promise<WorkerResult> {
  const res = await fetchJson(`/api/workers/by-user/${encodeURIComponent(userId)}`);
  if (!res) return { status: "unreachable" };
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    return { status: "none" };
  }

  const body = res.body as
    | { success?: boolean; data?: SessionWorker }
    | null;
  if (body?.success && body.data?._id) {
    return { status: "found", worker: body.data };
  }
  return { status: "none" };
}

/**
 * Verifies the current session. Only redirects to /login when the server
 * explicitly reports no session — transient failures keep retrying in the
 * background (e.g. the first request while a sleeping server wakes up).
 */
export function useSession(): SessionUser | null {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      const result = await fetchSession();
      if (cancelled) return;
      if (result.status === "authed") {
        setUser(result.user);
        return;
      }
      if (result.status === "anonymous") {
        router.push("/login");
        return;
      }
      retryTimer = setTimeout(load, RETRY_DELAY_MS);
    }

    void load();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [router]);

  return user;
}

/**
 * Session + worker profile in one step for the worker dashboard pages.
 * Same rules: only a definite rejection (wrong role / no worker) goes to
 * /login, everything transient retries.
 */
export function useWorker(): SessionWorker | null {
  const router = useRouter();
  const user = useSession();
  const [worker, setWorker] = useState<SessionWorker | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      const result = await fetchWorker(userId);
      if (cancelled) return;
      if (result.status === "found") {
        setWorker(result.worker);
        return;
      }
      if (result.status === "none") {
        router.push("/login");
        return;
      }
      retryTimer = setTimeout(load, RETRY_DELAY_MS);
    }

    void load();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [user, router]);

  return worker;
}
