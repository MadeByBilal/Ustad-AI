import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";

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
      <main className="page-main">{children}</main>
      <BottomNav role={role} />
    </div>
  );
}
