import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role === "worker") {
    redirect("/dashboard/worker");
  }
  redirect("/dashboard/customer");
}
