"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/client/components/BottomNav";
import DesktopNav from "@/client/components/DesktopNav";

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

  if (!loaded || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return (
    <div className="page">
      <DesktopNav role={role} userName={userName} />
      <div className="page-scroll md:pt-0">
        <main className="flex min-h-0 flex-1 flex-col pb-16 md:pb-0">{children}</main>
      </div>
      <BottomNav role={role} />
    </div>
  );
}
