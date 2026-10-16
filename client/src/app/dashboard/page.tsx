"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/client/lib/session";

export default function DashboardPage() {
  const router = useRouter();
  const user = useSession();

  useEffect(() => {
    if (!user) return;
    router.replace(
      user.role === "worker" ? "/dashboard/worker" : "/dashboard/customer",
    );
  }, [user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#26A650]" />
    </div>
  );
}
