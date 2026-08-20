import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import TrackingJobsList from "@/components/tracking/TrackingJobsList";

export const dynamic = "force-dynamic";

export default async function CustomerTrackPage() {
  try {
    await requireRole(["customer"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="text-lg font-bold text-stone-900">Live Tracking</h1>
      </div>
      <div className="page-content">
        <TrackingJobsList />
      </div>
    </div>
  );
}
