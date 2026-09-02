"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/client/components/BottomNav";
import DesktopNav from "@/client/components/DesktopNav";
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((body: { success?: boolean; data?: { user?: { role?: string; name?: string } } }) => {
        if (!body?.success || !body.data?.user) {
          router.push("/login");
          return;
        }
        setRole(body.data.user.role as "customer" | "worker");
        setUserName(body.data.user.name ?? "Guest");
        setLoaded(true);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  // Socket-based instant redirect: when worker accepts, redirect from ANY page
  useEffect(() => {
    if (role !== "customer") return;

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

  if (!loaded || !role) {
    return (
      <div className="dark-glass-theme flex min-h-screen items-center justify-center" style={{ background: "#0B0F0C" }}>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#26A650]" />
      </div>
    );
  }

  const isCustomer = role === "customer";

  return (
    <div className={`page ${isCustomer ? "dark-glass-theme" : ""}`} style={isCustomer ? { background: "#0B0F0C" } : undefined}>
      <DesktopNav role={role} userName={userName} />
      <div className="page-scroll md:pt-0">
        <main className="flex min-h-0 flex-1 flex-col pb-16 md:pb-0">{children}</main>
      </div>
      <BottomNav role={role} />
    </div>
  );
}
