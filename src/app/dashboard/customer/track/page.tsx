import { redirect } from "next/navigation";
import { requireRole } from "@/server/lib/auth";
import TrackingJobsList from "@/client/components/tracking/TrackingJobsList";
import TranslatedHeading from "@/client/components/TranslatedHeading";

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
