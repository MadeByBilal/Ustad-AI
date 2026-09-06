"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import TrackingMap from "@/client/components/tracking/dynamicTrackingMap";
import LiveCustomerLocation from "@/client/components/tracking/LiveCustomerLocation";
import type { RouteComputedPayload } from "@/client/lib/route-types";
import { getApiErrorMessage } from "@/client/lib/api-client";

interface TrackingPageClientProps {
  jobId: string;
  jobStatus: string;
  workerName: string;
  destination: { lat: number; lng: number; label: string } | null;
  initialWorkerLocation: { lat: number; lng: number } | null;
  initialCustomerLocation?: { lat: number; lng: number } | null;
  initialPrecomputedRoute: [number, number][] | null;
  originalText: string;
  category: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACCEPTED: { label: "Worker accepted", color: "text-success-fg" },
  EN_ROUTE: { label: "On the way to you", color: "text-accent" },
  ARRIVED: { label: "Has arrived", color: "text-accent" },
  IN_PROGRESS: { label: "Working", color: "text-accent" },
  AWAITING_CUSTOMER_CONFIRMATION: {
    label: "Work Complete",
    color: "text-warning",
  },
  COMPLETED: { label: "Completed", color: "text-success-fg" },
};

export default function TrackingPageClient({
  jobId,
  jobStatus: initialStatus,
  workerName,
  destination,
  initialWorkerLocation,
  initialCustomerLocation = null,
  initialPrecomputedRoute,
  originalText,
  category,
}: TrackingPageClientProps) {
  const [workerLocation, setWorkerLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(initialWorkerLocation);
  const [customerLocation, setCustomerLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(initialCustomerLocation);
  const [distanceKm, setDistanceKm] = useState<number | undefined>();
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState(initialStatus);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [precomputedRoute, setPrecomputedRoute] = useState<
    [number, number][] | null
  >(initialPrecomputedRoute);
  const [inspectionOffer, setInspectionOffer] = useState<{
    offerId: string;
    price: number;
  } | null>(null);
  const [respondingOffer, setRespondingOffer] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const lastWorkerLocRef = useRef<string | null>(null);
  const lastCustomerLocRef = useRef<string | null>(null);
  const socketActiveRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasInspectionOfferRef = useRef(false);

  const handleLocationUpdate = useCallback(
    (data: {
      lat: number;
      lng: number;
      distanceKm: number;
      etaMinutes: number;
    }) => {
      const key = `${data.lat.toFixed(6)},${data.lng.toFixed(6)}`;
      const changed = lastWorkerLocRef.current !== key;
      lastWorkerLocRef.current = key;
      if (changed) setWorkerLocation({ lat: data.lat, lng: data.lng });
      setDistanceKm(data.distanceKm);
      setEtaMinutes(data.etaMinutes);
      setLastUpdate(new Date());
      socketActiveRef.current = true;
    },
    [],
  );

  // Socket.io for real-time updates
  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | null = null;

    async function connect() {
      try {
        const { joinJob } = await import("@/client/lib/socket-client");
        if (!mounted) return;
        const socket = await joinJob(jobId, "customer");

        const handleSocketLocationUpdate = (data: {
          jobId?: string;
          lat: number;
          lng: number;
          distanceKm: number;
          etaMinutes: number;
        }) => {
          if (mounted && (!data.jobId || data.jobId === jobId)) {
            handleLocationUpdate(data);
          }
        };

        const handleRouteComputed = (data: RouteComputedPayload) => {
          if (
            !mounted ||
            data.jobId !== jobId ||
            !Array.isArray(data.polyline) ||
            data.polyline.length < 2
          ) {
            return;
          }
          setPrecomputedRoute(data.polyline);
        };

        const handleWorkerArrived = () => {
          if (mounted) setJobStatus("ARRIVED");
        };

        const handleCustomerLocationUpdate = (data: {
          jobId?: string;
          lat?: number;
          lng?: number;
        }) => {
          if (
            mounted &&
            data.jobId === jobId &&
            typeof data.lat === "number" &&
            typeof data.lng === "number"
          ) {
            const cKey = `${data.lat.toFixed(6)},${data.lng.toFixed(6)}`;
            if (lastCustomerLocRef.current !== cKey) {
              lastCustomerLocRef.current = cKey;
              setCustomerLocation({ lat: data.lat, lng: data.lng });
            }
          }
        };

        const handleStatusUpdate = (data: {
          jobId?: string;
          status?: string;
        }) => {
          if (!mounted || data.jobId !== jobId || !data.status) return;
          setJobStatus(data.status);
        };

        const handleInspectionOffer = (data: {
          jobId?: string;
          offerId: string;
          price: number;
        }) => {
          if (!mounted || (data.jobId && data.jobId !== jobId)) return;
          hasInspectionOfferRef.current = true;
          setInspectionOffer({ offerId: data.offerId, price: data.price });
        };

        const handleInspectionOfferAccepted = (data: { jobId?: string }) => {
          if (!mounted || (data.jobId && data.jobId !== jobId)) return;
          hasInspectionOfferRef.current = false;
          setInspectionOffer(null);
        };

        const handleInspectionOfferDeclined = (data: { jobId?: string }) => {
          if (!mounted || (data.jobId && data.jobId !== jobId)) return;
          hasInspectionOfferRef.current = false;
          setInspectionOffer(null);
        };

        socket.on("location-update", handleSocketLocationUpdate);
        socket.on("route-computed", handleRouteComputed);
        socket.on("worker-arrived", handleWorkerArrived);
        socket.on("customer-location-update", handleCustomerLocationUpdate);
        socket.on("job-status-update", handleStatusUpdate);
        socket.on("inspection-offer", handleInspectionOffer);
        socket.on("inspection-offer-accepted", handleInspectionOfferAccepted);
        socket.on("inspection-offer-declined", handleInspectionOfferDeclined);

        cleanup = () => {
          socket.emit("leave-job", { jobId });
          socket.off("location-update", handleSocketLocationUpdate);
          socket.off("route-computed", handleRouteComputed);
          socket.off("worker-arrived", handleWorkerArrived);
          socket.off("customer-location-update", handleCustomerLocationUpdate);
          socket.off("job-status-update", handleStatusUpdate);
          socket.off("inspection-offer", handleInspectionOffer);
          socket.off("inspection-offer-accepted", handleInspectionOfferAccepted);
          socket.off("inspection-offer-declined", handleInspectionOfferDeclined);
        };
      } catch {
        // Socket not available
      }
    }

    void connect();
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [jobId, handleLocationUpdate]);

  // Poll for tracking data — skip location update if socket is delivering
  useEffect(() => {
    async function fetchTracking() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/tracking`);
        const body = await res.json();
        if (body?.success && body.data) {
          if (body.data.status) setJobStatus(body.data.status);

          if (!socketActiveRef.current) {
            if (body.data.worker_lat != null && body.data.worker_lng != null) {
              const wKey = `${body.data.worker_lat.toFixed(6)},${body.data.worker_lng.toFixed(6)}`;
              if (lastWorkerLocRef.current !== wKey) {
                lastWorkerLocRef.current = wKey;
                setWorkerLocation({
                  lat: body.data.worker_lat,
                  lng: body.data.worker_lng,
                });
              }
            }
            if (body.data.customer_lat != null && body.data.customer_lng != null) {
              const cKey = `${body.data.customer_lat.toFixed(6)},${body.data.customer_lng.toFixed(6)}`;
              if (lastCustomerLocRef.current !== cKey) {
                lastCustomerLocRef.current = cKey;
                setCustomerLocation({
                  lat: body.data.customer_lat,
                  lng: body.data.customer_lng,
                });
              }
            }
            if (body.data.distance_km !== undefined && body.data.distance_km !== null) {
              setDistanceKm(body.data.distance_km);
            }
            if (body.data.eta_minutes !== undefined && body.data.eta_minutes !== null) {
              setEtaMinutes(body.data.eta_minutes);
            }
          }

          if (
            body.data.precomputed_route &&
            Array.isArray(body.data.precomputed_route)
          ) {
            setPrecomputedRoute(
              (current) => current ?? body.data.precomputed_route,
            );
          }
          setLastUpdate(new Date());

          if (body.data.pending_inspection_offer && !hasInspectionOfferRef.current) {
            hasInspectionOfferRef.current = true;
            setInspectionOffer({
              offerId: body.data.pending_inspection_offer.offer_id,
              price: body.data.pending_inspection_offer.price,
            });
          }
        }
      } catch {
        // ignore
      }
    }

    void fetchTracking();
    pollTimerRef.current = setInterval(() => {
      socketActiveRef.current = false;
      void fetchTracking();
    }, 5000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [jobId]);

  const isCancelled = jobStatus === "CANCELLED";
  const isApproval = jobStatus === "AWAITING_CUSTOMER_CONFIRMATION";
  const isCompleted = jobStatus === "COMPLETED";

  async function handleInspectionOfferResponse(action: "accept" | "decline") {
    if (!inspectionOffer) return;
    setRespondingOffer(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/inspection-offer/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Failed to respond"));
      }
      setInspectionOffer(null);
      hasInspectionOfferRef.current = false;
      if (action === "accept") {
        setJobStatus("AWAITING_CUSTOMER_CONFIRMATION");
      }
    } catch {
      // ignore
    } finally {
      setRespondingOffer(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Approval failed"));
      }
      setApproved(true);
      setJobStatus("COMPLETED");
    } catch {
      // ignore
    } finally {
      setApproving(false);
    }
  }

  async function handleDispute() {
    setApproving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispute" }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Dispute failed"));
      }
      setJobStatus("COMPLETED");
      window.location.href = "/dashboard/customer";
    } catch {
      // ignore
    } finally {
      setApproving(false);
    }
  }

  async function handleSubmitReview() {
    try {
      await fetch(`/api/jobs/${jobId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, text: reviewText.trim() || undefined }),
      });
      setReviewSubmitted(true);
    } catch {
      // ignore
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this job?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by customer" }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Cancel failed"));
      }
      window.location.href = "/dashboard/customer";
    } catch {
      // ignore
    } finally {
      setCancelling(false);
    }
  }

  const statusInfo = STATUS_LABELS[jobStatus] ?? {
    label: jobStatus,
    color: "text-muted",
  };

  // ---- COMPLETED / REVIEW STATE ----
  if (isCompleted && approved && !reviewSubmitted) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-text">Work approved!</h2>
        <p className="mt-1 text-sm text-muted">Rate your experience with {workerName}</p>

        <div className="mt-6 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setReviewRating(star)}
              className="p-1"
            >
              <svg className={`h-8 w-8 ${star <= reviewRating ? "text-warning" : "text-divider"}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>

        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience (optional)"
          rows={3}
          className="mt-4 w-full max-w-sm rounded-xl border border-divider bg-surface px-4 py-3 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => void handleSubmitReview()}
            className="rounded-xl bg-accent px-8 py-3 text-sm font-bold text-bg hover:bg-accent/90 active:scale-[0.97]"
          >
            Submit Review
          </button>
          <button
            type="button"
            onClick={() => { setReviewSubmitted(true); window.location.href = "/dashboard/customer"; }}
            className="rounded-xl border border-divider px-6 py-3 text-sm font-semibold text-muted hover:bg-surface active:scale-[0.97]"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // ---- COMPLETED / REVIEW THANK YOU ----
  if (isCompleted && reviewSubmitted) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-text">Thank you!</h2>
        <p className="mt-1 text-sm text-muted">Your feedback helps us improve</p>
        <Link href="/dashboard/customer" className="btn-primary mt-6">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // ---- APPROVAL STATE (AWAITING_CUSTOMER_CONFIRMATION) ----
  if (isApproval) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-bg">
        <div className="flex items-center gap-3 px-4 py-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
          <Link href="/dashboard/customer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface">
            <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text">{workerName}</p>
            <p className="text-xs font-medium text-warning">Work Complete</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warning/15">
            <svg className="h-10 w-10 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-text">Work is complete</h2>
          <p className="mt-2 text-center text-sm text-muted">{workerName} has finished the job. Please review and confirm.</p>

          <p className="mt-4 font-urdu text-sm text-text/80 line-clamp-2">{originalText}</p>

          <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleApprove()}
              disabled={approving}
              className="w-full rounded-xl bg-accent px-6 py-4 text-base font-bold text-bg transition-colors hover:bg-accent/90 active:scale-[0.97] disabled:opacity-60"
            >
              {approving ? "Approving..." : "Approve Work"}
            </button>
            <button
              type="button"
              onClick={() => void handleDispute()}
              disabled={approving}
              className="w-full rounded-xl border border-warning px-6 py-4 text-base font-semibold text-warning transition-colors hover:bg-warning/10 active:scale-[0.97] disabled:opacity-60"
            >
              Dispute
            </button>
          </div>
        </div>

        {/* Inspection Offer Popup */}
        {inspectionOffer && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-6">
            <div className="w-full max-w-sm rounded-2xl border border-divider bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15">
                  <svg className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-3 text-lg font-bold text-text">Inspection Offer</h3>
                <p className="mt-1 text-sm text-muted">The technician found additional work needed</p>
                <p className="mt-3 text-3xl font-bold text-accent">
                  Rs {inspectionOffer.price.toLocaleString("en-PK")}
                </p>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleInspectionOfferResponse("decline")}
                  disabled={respondingOffer}
                  className="flex-1 rounded-xl border border-divider px-4 py-3 text-sm font-semibold text-muted transition-colors hover:bg-surface active:scale-[0.97] disabled:opacity-60"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => void handleInspectionOfferResponse("accept")}
                  disabled={respondingOffer}
                  className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg transition-colors hover:bg-accent/90 active:scale-[0.97] disabled:opacity-60"
                >
                  {respondingOffer ? "Processing..." : "Accept Offer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- TRACKING STATE (normal tracking with map) ----
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-bg">
      {/* Map fills entire viewport */}
      <div className="absolute inset-0 z-0">
        <TrackingMap
          workerLocation={workerLocation}
          userLocation={customerLocation}
          destination={destination}
          distanceKm={distanceKm}
          perspective="customer"
          className="h-full w-full"
          precomputedRoute={precomputedRoute}
        />
      </div>

      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-[1000] flex items-center gap-3 bg-surface/95 px-4 py-3 backdrop-blur-lg" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <Link href="/dashboard/customer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface/80 backdrop-blur-sm">
          <svg className="h-5 w-5 text-text" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text">{workerName}</p>
          <p className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
        </div>
        <Link href={`/dashboard/customer/chat/${jobId}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface/80 backdrop-blur-sm">
          <svg className="h-5 w-5 text-text" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 20.105V4.875A2.625 2.625 0 016.375 2.25h11.25A2.625 2.625 0 0120.25 4.875v10.5A2.625 2.625 0 0117.625 18H7.5l-3.75 2.105z" />
          </svg>
        </Link>
      </div>

      {/* Live customer GPS */}
      {!isCancelled && (
        <LiveCustomerLocation jobId={jobId} onLocationUpdate={setCustomerLocation} />
      )}

      {/* Bottom Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] max-h-[40vh] overflow-y-auto rounded-t-2xl bg-surface px-5 pt-4 pb-28 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-lg font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
            <p className="text-sm text-muted">{category?.replace(/_/g, " ") || "Job in progress"}</p>
          </div>
          <div className="text-right">
            {distanceKm !== undefined && (
              <>
                <p className="text-2xl font-bold text-text">
                  {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
                </p>
                {etaMinutes !== null && <p className="text-sm text-muted">~{etaMinutes} min</p>}
              </>
            )}
          </div>
        </div>

        <p className="mt-3 font-urdu text-sm text-text/80 line-clamp-2">{originalText}</p>

        {!isCancelled && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex gap-3">
              <a href={`/dashboard/customer/chat/${jobId}`} className="btn-secondary flex-1 text-center">
                Chat
              </a>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-warning px-4 py-2.5 text-sm font-semibold text-warning transition-colors hover:bg-warning/10 active:scale-[0.97] disabled:opacity-60"
              >
                {cancelling ? "Cancelling..." : "Cancel Job"}
              </button>
            </div>
            {lastUpdate && (
              <p className="text-center text-xs text-muted">
                Updated {lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="mt-4 rounded-xl border border-warning bg-warning/10 p-4 text-center">
            <p className="text-sm font-semibold text-warning">Job has been cancelled</p>
          </div>
        )}
      </div>

      {/* Inspection Offer Popup */}
      {inspectionOffer && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-6" style={{ WebkitTapHighlightColor: "transparent" }}>
          <div className="w-full max-w-sm rounded-2xl border border-divider bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15">
                <svg className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-bold text-text">Inspection Offer</h3>
              <p className="mt-1 text-sm text-muted">The technician found additional work needed</p>
              <p className="mt-3 text-3xl font-bold text-accent">
                Rs {inspectionOffer.price.toLocaleString("en-PK")}
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => void handleInspectionOfferResponse("decline")}
                disabled={respondingOffer}
                className="flex-1 rounded-xl border border-divider px-4 py-3 text-sm font-semibold text-muted transition-colors hover:bg-surface active:scale-[0.97] disabled:opacity-60"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => void handleInspectionOfferResponse("accept")}
                disabled={respondingOffer}
                className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg transition-colors hover:bg-accent/90 active:scale-[0.97] disabled:opacity-60"
              >
                {respondingOffer ? "Processing..." : "Accept Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
