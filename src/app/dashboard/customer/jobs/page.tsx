import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import CustomerJobsList from "@/components/CustomerJobsList";
import TranslatedHeading from "@/components/TranslatedHeading";

export const dynamic = "force-dynamic";

export default async function CustomerJobsPage() {
  try {
    await requireRole(["customer"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-warning/6 blur-3xl" />
      <div className="page-header">
        <TranslatedHeading translationKey="myJobs" />
      </div>
      <div className="page-content">
        <CustomerJobsList />
      </div>
    </div>
  );
}
