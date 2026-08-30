import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import TrackingJobsList from "@/components/tracking/TrackingJobsList";
import TranslatedHeading from "@/components/TranslatedHeading";

export const dynamic = "force-dynamic";

export default async function CustomerTrackPage() {
  try {
    await requireRole(["customer"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  return (
    <div>
      <div className="page-header">
        <TranslatedHeading translationKey="liveTracking" />
      </div>
      <div className="page-content">
        <TrackingJobsList />
      </div>
    </div>
  );
}
