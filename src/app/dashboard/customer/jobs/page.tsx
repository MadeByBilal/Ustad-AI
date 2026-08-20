import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import CustomerJobsList from "@/components/CustomerJobsList";

export const dynamic = "force-dynamic";

export default async function CustomerJobsPage() {
  try {
    await requireRole(["customer"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="text-lg font-bold text-stone-900">My Jobs</h1>
      </div>
      <div className="page-content">
        <CustomerJobsList />
      </div>
    </div>
  );
}
