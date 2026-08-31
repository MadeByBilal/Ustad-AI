import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/lib/auth";
import BottomNav from "@/client/components/BottomNav";
import DesktopNav from "@/client/components/DesktopNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role as "customer" | "worker";
  const userName = session.user.name ?? "Guest";

  return (
    <div className="page">
      <DesktopNav role={role} userName={userName} />
      <div className="page-scroll md:pt-0 overflow-x-hidden">
        <main className="flex min-h-0 flex-1 flex-col pb-16 md:pb-0">{children}</main>
      </div>
      <BottomNav role={role} />
    </div>
  );
}
