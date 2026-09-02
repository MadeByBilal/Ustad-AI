"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TrackingPageClient from "./TrackingPageClient";

interface TrackingData {
  jobStatus: string;
  workerName: string;
  initialWorkerLocation: { lat: number; lng: number } | null;
  initialCustomerLocation: { lat: number; lng: number } | null;
  initialPrecomputedRoute: [number, number][] | null;
  destination: { lat: number; lng: number; label: string } | null;
  originalText: string;
  category: string;
}

export default function TrackingPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [trackingRes, jobRes] = await Promise.all([
          fetch(`/api/jobs/${jobId}/tracking`),
          fetch(`/api/jobs/${jobId}`),
        ]);

        if (trackingRes.status === 401 || trackingRes.status === 403) {
          router.push("/login");
          return;
        }
        if (trackingRes.status === 404) {
          if (!cancelled) setError("Job not found");
          return;
        }

        const trackingBody = await trackingRes.json().catch(() => null);
        const jobBody = await jobRes.json().catch(() => null);

        if (!trackingBody?.success) {
          if (!cancelled) setError("Failed to load tracking data");
          return;
        }

        const t = trackingBody.data;

        // Map flat API fields to the interface the client expects
        const destination =
          t.destination_lat != null && t.destination_lng != null
            ? {
                lat: t.destination_lat as number,
                lng: t.destination_lng as number,
                label: (t.destination_label as string) ?? "",
              }
            : null;

        const workerLocation =
          t.worker_lat != null && t.worker_lng != null
            ? { lat: t.worker_lat as number, lng: t.worker_lng as number }
            : null;
        const customerLocation =
          t.customer_lat != null && t.customer_lng != null
            ? { lat: t.customer_lat as number, lng: t.customer_lng as number }
            : null;

        // Pull originalText and category from the job detail endpoint
        const job = jobBody?.data?.job;
        const originalText: string = job?.input?.original_text ?? "";
        const category: string = job?.understanding?.category ?? "";

        if (!cancelled) {
          setData({
            jobStatus: t.status as string,
            workerName: (t.worker_name as string) ?? "Ustad",
            initialWorkerLocation: workerLocation,
            initialCustomerLocation: customerLocation,
            initialPrecomputedRoute: (t.precomputed_route as [number, number][]) ?? null,
            destination,
            originalText,
            category,
          });
        }
      } catch {
        if (!cancelled) setError("Failed to load tracking data");
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [jobId, router]);

  if (error) {
    return <div className="p-4 text-sm text-warning">{error}</div>;
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return (
    <TrackingPageClient
      jobId={jobId}
      jobStatus={data.jobStatus}
      workerName={data.workerName}
      destination={data.destination}
      initialWorkerLocation={data.initialWorkerLocation}
      initialCustomerLocation={data.initialCustomerLocation}
      initialPrecomputedRoute={data.initialPrecomputedRoute}
      originalText={data.originalText}
      category={data.category}
    />
  );
}
