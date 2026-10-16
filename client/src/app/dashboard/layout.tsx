"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/client/components/BottomNav";
import DesktopNav from "@/client/components/DesktopNav";
import LiquidGlassToastContainer from "@/client/components/LiquidGlassToast";
import { fetchSession } from "@/client/lib/session";
import "@/app/dark-glass-theme.css";

const TRACKING_STATUSES = new Set(["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION"]);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [role, setRole] = useState<"customer" | "worker" | null>(null);
  const [userName, setUserName] = useState("Guest");
  const [authState, setAuthState] = useState<"checking" | "ready" | "unreachable">("checking");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      const result = await fetchSession();
      if (cancelled) return;

      if (result.status === "authed") {
        setRole(result.user.role as "customer" | "worker");
        setUserName(result.user.name ?? "Guest");
        setAuthState("ready");
        return;
      }
      if (result.status === "anonymous") {
        // Server explicitly says there is no session — the only real logout.
        router.push("/login");
        return;
      }

      // Server unreachable (cold start, flaky network). The user stays signed
      // in: show a soft notice and keep retrying in the background instead of
      // dumping them on the login screen.
      setAuthState("unreachable");
      retryTimer = setTimeout(() => setRetryKey((k) => k + 1), 6000);
    }

    void load();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [router, retryKey]);

  // Socket-based instant redirect: when worker accepts, redirect from ANY page
  useEffect(() => {
    if (role !== "customer") return;

    // Don't redirect if already on a tracking page
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard/customer/track")) return;

    let mounted = true;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        // Find the active job — include BROADCASTING so we join early
        const listRes = await fetch("/api/requests/list", { cache: "no-store" });
        const listBody = await listRes.json().catch(() => null);
        if (!listBody?.success || !mounted) return;

        const active = (listBody.data?.requests ?? []).find((r: { status: string; job_id: string }) =>
          ["BROADCASTING", "WORKER_RESPONSES", "CUSTOMER_SELECTING", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION"].includes(r.status)
        );
        if (!active || !mounted) return;

        const jobId = active.job_id;

        // If already in a tracking status, redirect immediately
        if (TRACKING_STATUSES.has(active.status)) {
          window.location.href = `/dashboard/customer/track/${jobId}`;
          return;
        }

        // Join the socket room for BROADCASTING/WORKER_RESPONSES/CUSTOMER_SELECTING jobs
        const { joinJob } = await import("@/client/lib/socket-client");
        if (!mounted) return;
        const socket = await joinJob(jobId, "customer");

        const handleStatusUpdate = (data: { jobId?: string; status?: string }) => {
          if (!mounted) return;
          if (data.jobId && data.jobId !== jobId) return;
          if (data.status && TRACKING_STATUSES.has(data.status)) {
            window.location.href = `/dashboard/customer/track/${jobId}`;
          }
        };

        socket.on("job-status-update", handleStatusUpdate);
        cleanup = () => {
          socket.emit("leave-job", { jobId });
          socket.off("job-status-update", handleStatusUpdate);
        };
      } catch {
        // ignore — socket not available
      }
    }

    void setup();
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [role]);

  if (authState === "unreachable") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="card w-full max-w-sm space-y-4 p-6 text-center">
          <h2 className="text-lg font-bold text-text">Can&apos;t reach the server</h2>
          <p className="text-sm text-muted">
            You&apos;re still signed in — we&apos;ll keep trying. This can take up
            to a minute if the server is waking up.
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="btn-primary w-full"
          >
            Try now
          </button>
          <Link href="/login" className="block text-xs text-muted underline-offset-2 hover:underline">
            Sign in with a different account
          </Link>
        </div>
      </div>
    );
  }

  if (authState !== "ready" || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#26A650]" />
      </div>
    );
  }

  return (
    <div className="page">
      <LiquidGlassToastContainer />
      <DesktopNav role={role} userName={userName} />
      <div className="page-scroll md:pt-0">
        <main className="flex min-h-0 flex-1 flex-col page-bottom-safe md:pb-0">{children}</main>
      </div>
      <BottomNav role={role} />
    </div>
  );
}
