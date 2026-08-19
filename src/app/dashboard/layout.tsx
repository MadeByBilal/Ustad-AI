import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  const isWorker = session.user.role === "worker";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0e5f44] text-base font-bold text-white">
              ا
            </span>
            <span className="font-bold tracking-tight">
              Ustad <span className="text-[#0e5f44]">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">
                {session.user.name ?? "Guest"}
              </p>
              <p className="text-xs capitalize text-stone-500">
                {session.user.role} · {isWorker ? "Technician" : "Customer"}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}