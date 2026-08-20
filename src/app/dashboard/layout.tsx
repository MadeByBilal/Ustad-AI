import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import BottomNav from "@/components/BottomNav";

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

  return (
    <div className="page">
      <main>{children}</main>
      <BottomNav role={role} />
    </div>
  );
}
