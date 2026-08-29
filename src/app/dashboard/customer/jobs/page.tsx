import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import CustomerJobsContent from "@/components/CustomerJobsContent";

export const dynamic = "force-dynamic";

export default async function CustomerJobsPage() {
  try {
    await requireRole(["customer"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  return <CustomerJobsContent />;
}
