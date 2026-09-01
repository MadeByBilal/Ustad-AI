"use client";

import TrackingJobsList from "@/client/components/tracking/TrackingJobsList";
import TranslatedHeading from "@/client/components/TranslatedHeading";

export default function CustomerTrackPage() {
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
