"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkerHome from "@/client/components/worker/WorkerHome";
import TranslatedHeading from "@/client/components/TranslatedHeading";

export default function WorkerDashboardPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((body: { success?: boolean; data?: { user?: { id?: string } } }) => {
        if (!body?.success || !body.data?.user) {
          router.push("/login");
          return;
        }
        return fetch(`/api/workers/by-user/${body.data.user.id}`);
      })
      .then((r) => r?.json())
      .then((body: { success?: boolean; data?: { _id?: string } } | undefined) => {
        if (body?.success && body.data?._id) {
          setWorkerId(body.data._id);
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  if (!workerId) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <TranslatedHeading translationKey="home" />
      </div>
      <div className="page-content">
        <WorkerHome workerId={workerId} />
      </div>
    </>
  );
}
