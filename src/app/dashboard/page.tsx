import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardIndexPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role === "customer") {
    redirect("/dashboard/customer");
  }
  if (session.user.role === "worker") {
    redirect("/dashboard/worker");
  }
  redirect("/login");
}