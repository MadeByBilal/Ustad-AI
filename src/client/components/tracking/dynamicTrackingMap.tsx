"use client";

import dynamic from "next/dynamic";

function MapFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface px-4 text-center">
      <p className="text-sm text-muted">
        Map is unavailable right now. Please refresh the page.
      </p>
    </div>
  );
}

// Load the map chunk defensively. If the chunk fails to load (e.g. a stale dev
// build cache after the dev server was restarted), fall back to a message
// instead of letting the ChunkLoadError white-screen the whole page.
const TrackingMap = dynamic(
  () =>
    import("./TrackingMap").catch(() => ({
      default: MapFallback,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-surface">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    ),
  }
);

export default TrackingMap;
