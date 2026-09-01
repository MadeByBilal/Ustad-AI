"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CustomerChatPageClient from "./CustomerChatPageClient";

export default function CustomerChatPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const [originalText, setOriginalText] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          router.push("/login");
          return null;
        }
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((body: { success?: boolean; data?: { input?: { original_text?: string }; status?: string } } | null) => {
        if (body?.success && body.data) {
          const status = body.data.status;
          if (!["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION"].includes(status ?? "")) {
            setNotFound(true);
            return;
          }
          setOriginalText(body.data.input?.original_text ?? "");
        }
      })
      .catch(() => setNotFound(true));
  }, [jobId, router]);

  if (notFound) {
    return <div className="p-4 text-sm text-warning">Job not found</div>;
  }

  if (originalText === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return <CustomerChatPageClient jobId={jobId} originalText={originalText} />;
}
