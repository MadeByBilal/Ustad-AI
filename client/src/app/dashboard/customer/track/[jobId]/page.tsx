"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TrackingPageClient from "./TrackingPageClient";

interface TrackingData {
  jobStatus: string;
  workerName: string;
  initialWorkerLocation: { lat: number; lng: number } | null;
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
    fetch(`/api/jobs/${jobId}/tracking`)
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          router.push("/login");
          return null;
        }
        if (r.status === 404) {
          setError("Job not found");
          return null;
        }
        return r.json();
      })
      .then((body: { success?: boolean; data?: TrackingData } | null) => {
        if (body?.success && body.data) {
          setData(body.data);
        } else if (!error) {
          setError("Failed to load tracking data");
        }
      })
      .catch(() => setError("Failed to load tracking data"));
  }, [jobId, router, error]);

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
      initialPrecomputedRoute={data.initialPrecomputedRoute}
      originalText={data.originalText}
      category={data.category}
    />
  );
}
