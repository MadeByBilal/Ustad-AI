"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkerChatList from "@/client/components/worker/WorkerChatList";
import TranslatedHeading from "@/client/components/TranslatedHeading";

export default function WorkerChatPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((body: { success?: boolean; data?: { user?: { _id?: string } } }) => {
        if (!body?.success || !body.data?.user) {
          router.push("/login");
          return;
        }
        return fetch(`/api/workers/by-user/${body.data.user._id}`);
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
    <div className="relative">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-warning/6 blur-3xl" />
      <div className="page-header">
        <TranslatedHeading translationKey="chats" />
      </div>
      <div className="page-content">
        <WorkerChatList workerId={workerId} />
      </div>
    </div>
  );
}
