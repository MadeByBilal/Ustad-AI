"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkerProfile from "@/client/components/worker/WorkerProfile";
import TranslatedHeading from "@/client/components/TranslatedHeading";

export default function WorkerProfilePage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meBody = (await meRes.json()) as {
          success?: boolean;
          data?: { user?: { id?: string } };
        };

        if (cancelled) return;
        if (!meBody?.success || !meBody.data?.user?.id) {
          router.push("/login");
          return;
        }

        const workerRes = await fetch(
          `/api/workers/by-user/${meBody.data.user.id}`,
        );
        const workerBody = (await workerRes.json()) as {
          success?: boolean;
          data?: { _id?: string };
        };

        if (cancelled) return;
        if (workerBody?.success && workerBody.data?._id) {
          setWorkerId(workerBody.data._id);
        } else {
          router.push("/login");
        }
      } catch {
        if (!cancelled) router.push("/login");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!workerId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-warning/6 blur-3xl" />
      <div className="page-header">
        <TranslatedHeading translationKey="profile" />
      </div>
      <div className="page-content">
        <WorkerProfile workerId={workerId} />
      </div>
    </div>
  );
}
