"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import ReviewScreen from "./ReviewScreen";
import { motion } from "framer-motion";
import TrackingMap from "@/components/tracking/dynamicTrackingMap";
import { useLang } from "@/lib/i18n/context";
import { MapPin, ArrowLeft, MessageCircle, AlertTriangle } from "lucide-react";

interface ActiveJob {
  job_id: string;
  status: string;
  category: string;
  original_text: string;
  worker_name: string;
  destination: { lat: number; lng: number; label: string } | null;
}

export default function ActiveJobTracking() {
  const { t } = useLang();
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [workerLocation, setWorkerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | undefined>();
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [approving, setApproving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    ACCEPTED: { label: t("workerAccepted"), color: "text-success-fg" },
    EN_ROUTE: { label: t("onTheWay"), color: "text-accent" },
    ARRIVED: { label: t("arrived"), color: "text-accent" },
    IN_PROGRESS: { label: t("workInProgress"), color: "text-accent" },
    AWAITING_CUSTOMER_CONFIRMATION: { label: t("needsApproval"), color: "text-warning" },
  };

  // Fetch active job
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/requests/list", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!body?.success) return;

      const active = (body.data?.requests ?? []).find((r: { status: string }) =>
        ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION"].includes(r.status)
      );

      if (active) {
        // Get destination from job detail
        const jobRes = await fetch(`/api/jobs/${active.job_id}/tracking`);
        const jobBody = await jobRes.json().catch(() => null);

        setJob({
          job_id: active.job_id,
          status: active.status,
          category: active.category,
          original_text: active.original_text,
          worker_name: active.worker_name ?? t("worker"),
          destination: jobBody?.data?.destination_lat ? {
            lat: jobBody.data.destination_lat,
            lng: jobBody.data.destination_lng,
            label: jobBody.data.destination_label ?? t("location"),
          } : null,
        });

        if (jobBody?.data?.worker_lat && jobBody?.data?.worker_lng) {
          setWorkerLocation({ lat: jobBody.data.worker_lat, lng: jobBody.data.worker_lng });
          setDistanceKm(jobBody.data.distance_km);
          setEtaMinutes(jobBody.data.eta_minutes);
          setLastUpdate(new Date());
        }
      }
    } catch {
      // ignore
    }
  }, [t]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), 3000);
    return () => clearInterval(poll);
  }, [refresh]);

  // Socket.io for real-time updates
  const activeJobId = job?.job_id;
  useEffect(() => {
    if (!activeJobId) return;
    let mounted = true;

    async function connect() {
      try {
        const { connectSocket } = await import("@/lib/socket-client");
        const socket = connectSocket();
        socket.emit("join-job", { jobId: activeJobId, role: "customer" });

        socket.on("location-update", (data: { lat: number; lng: number; distanceKm: number; etaMinutes: number }) => {
          if (!mounted) return;
          setWorkerLocation({ lat: data.lat, lng: data.lng });
          setDistanceKm(data.distanceKm);
          setEtaMinutes(data.etaMinutes);
          setLastUpdate(new Date());
        });

        socket.on("worker-arrived", () => {
          if (!mounted) return;
          setDistanceKm(0);
          setEtaMinutes(0);
          void refresh();
        });

        return () => {
          socket.emit("leave-job", { jobId: activeJobId });
          socket.off("location-update");
          socket.off("worker-arrived");
        };
      } catch {
        // Socket not available
      }
    }

    void connect();
    return () => { mounted = false; };
  }, [activeJobId, refresh]);

  // Approve work
  async function handleApprove(action: "approve" | "dispute") {
    if (!job) return;
    setApproving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/jobs/${job.job_id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? t("actionFailed"));
      }
      setMessage({
        ok: true,
        text: action === "approve" ? t("workApproved") : t("disputeSubmitted"),
      });
      if (action === "approve") {
        setTimeout(() => setShowReview(true), 1000);
      } else {
        setTimeout(() => void refresh(), 1000);
      }
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : t("actionFailed") });
    } finally {
      setApproving(false);
    }
  }

  async function handleCancel() {
    if (!job || !window.confirm(t("confirmCancel"))) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/jobs/${job.job_id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: t("cancelledByCustomer") }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? t("cancelFailed"));
      }
      setJob(null);
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : t("cancelFailed") });
    } finally {
      setCancelling(false);
    }
  }

  // Force map to resize after mount
  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!job) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-bg px-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface">
          <MapPin className="h-10 w-10 text-muted" />
        </div>
        <p className="mt-5 text-lg font-bold text-text">{t("noActiveJob")}</p>
        <p className="mt-1 text-sm text-muted">
          {t("trackingWillAppear")}
        </p>
        <Link href="/dashboard/customer" className="btn-primary mt-6">
          {t("backToHome")}
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[job.status] ?? { label: job.status, color: "text-muted" };
  const isApproval = job.status === "AWAITING_CUSTOMER_CONFIRMATION";

  // Show review screen after approval
  if (showReview) {
    return (
      <ReviewScreen
        jobId={job.job_id}
        workerName={job.worker_name}
        onDone={() => {
          setShowReview(false);
          setJob(null);
        }}
      />
    );
  }

  // Show completion screen after dispute
  if (message?.ok && message.text === t("disputeSubmitted")) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-bg px-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
          <AlertTriangle className="h-10 w-10 text-warning" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold text-text">{t("disputeSubmitted")}</h1>
        <p className="mt-2 text-center text-base text-muted">
          {t("disputeReviewMsg")}
        </p>
        <Link href="/dashboard/customer" className="btn-primary mt-8">
          {t("backToHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center gap-3 bg-surface/95 px-4 py-3 backdrop-blur-lg">
        <Link
          href="/dashboard/customer"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface"
        >
          <ArrowLeft className="h-5 w-5 text-muted" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text">{job.worker_name}</p>
          <p className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
        </div>
        {!isApproval && (
          <Link
            href={`/dashboard/customer/chat/${job.job_id}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-bg"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
        )}
      </div>

      {/* Map - Always render, show waiting message inside */}
      <div ref={mapContainerRef} className="h-[65vh] w-full shrink-0">
        {mapReady ? (
          <TrackingMap
            workerLocation={workerLocation}
            destination={job.destination}
            distanceKm={distanceKm}
            perspective="customer"
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-surface">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div className="flex-1 bg-surface px-5 pt-4 pb-6">
        {/* Status + Distance */}
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-lg font-bold ${statusInfo.color}`}>
              {isApproval ? t("workComplete") : statusInfo.label}
            </p>
            <p className="text-sm text-muted">{job.worker_name}</p>
          </div>
          <div className="text-right">
            {distanceKm !== undefined && !isApproval && (
              <>
                <p className="text-2xl font-bold text-text">
                  {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
                </p>
                {etaMinutes !== null && (
                  <p className="text-sm text-muted">~{etaMinutes} min</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <p className={`mt-3 rounded-xl px-4 py-3 text-sm ${message.ok ? "bg-success/15 text-success-fg" : "bg-warning/10 text-warning"}`}>
            {message.text}
          </p>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex gap-3">
          {isApproval ? (
            <>
              <motion.button
                type="button"
                onClick={() => void handleApprove("approve")}
                disabled={approving}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="btn-primary flex-1 disabled:opacity-60"
              >
                {approving ? t("approving") : t("approveWork")}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => void handleApprove("dispute")}
                disabled={approving}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="btn-danger flex-1 disabled:opacity-60"
              >
                {approving ? t("submitting") : t("dispute")}
              </motion.button>
            </>
          ) : (
            <Link
              href={`/dashboard/customer/chat/${job.job_id}`}
              className="btn-primary flex-1 text-center"
            >
              <MessageCircle className="mr-2 inline h-5 w-5" />
              {t("chatWithWorker")}
            </Link>
          )}
        </div>

        {!isApproval && (
          <motion.button
            type="button"
            onClick={() => void handleCancel()}
            disabled={cancelling}
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="mt-3 w-full rounded-xl border border-warning px-4 py-2.5 text-sm font-semibold text-warning transition-colors hover:bg-warning/10 disabled:opacity-60"
          >
            {cancelling ? t("cancelling") : t("cancelJob")}
          </motion.button>
        )}

        {lastUpdate && (
          <p className="mt-3 text-center text-xs text-muted">
            {t("lastUpdated")} {lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}
