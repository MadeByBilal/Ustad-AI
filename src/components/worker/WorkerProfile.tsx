"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkerDashboardData } from "@/lib/worker/dashboard";
import WorkerAvailability from "@/components/WorkerAvailability";
import LocationUpdater from "./LocationUpdater";

const POLL_MS = 15000;

export default function WorkerProfile({ workerId }: { workerId: string }) {
  const [data, setData] = useState<WorkerDashboardData | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers/${workerId}/dashboard`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        data?: WorkerDashboardData;
      } | null;
      if (body?.success) setData(body.data ?? null);
    } catch {
      // ignore
    }
  }, [workerId]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-[#0e5f44]" />
      </div>
    );
  }

  const w = data.worker;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="card flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0e5f44]">
          <span className="text-2xl font-bold text-white">
            {w.name?.charAt(0) ?? "U"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-urdu text-lg font-bold text-stone-900">{w.name}</h2>
          <p className="text-sm capitalize text-stone-500">
            {w.category.replace(/_/g, " ")}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {w.skills.slice(0, 4).map((skill) => (
              <span key={skill} className="badge !bg-stone-100 !text-stone-600">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="card">
        <h3 className="mb-3 text-sm font-bold text-stone-800">Performance</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-stone-50 p-3 text-center">
            <p className="text-xl font-bold text-[#0e5f44]">{w.ustad_score}</p>
            <p className="text-[10px] text-stone-500">Ustad Score</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3 text-center">
            <p className="text-xl font-bold text-stone-800">{w.completed_jobs}</p>
            <p className="text-[10px] text-stone-500">Jobs Done</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3 text-center">
            <p className="text-xl font-bold text-amber-500">{w.average_rating.toFixed(1)}</p>
            <p className="text-[10px] text-stone-500">Rating</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3 text-center">
            <p className="text-xl font-bold text-stone-800">{w.response_rate}%</p>
            <p className="text-[10px] text-stone-500">Response Rate</p>
          </div>
        </div>
      </div>

      {/* Verification */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-800">Verification</h3>
            <p className="text-xs text-stone-500">
              {w.verification_level === "documents_verified"
                ? "Documents verified"
                : "Identity reviewed"}
            </p>
          </div>
          <span
            className={`badge ${
              w.verification_level === "documents_verified"
                ? "!bg-emerald-100 !text-emerald-800"
                : "!bg-amber-100 !text-amber-800"
            }`}
          >
            {w.verification_level === "documents_verified" ? "✓ Verified" : "⏳ Pending"}
          </span>
        </div>
      </div>

      {/* Availability */}
      <WorkerAvailability
        initial={{
          is_available: w.is_available,
          is_online: w.is_online,
          emergency_available: w.emergency_available,
        }}
        onChanged={() => void refresh()}
      />

      {/* Location */}
      <LocationUpdater
        lastUpdated={w.location_updated_at}
        onChanged={() => void refresh()}
      />

      {/* Logout */}
      <div className="pt-4">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="btn-danger w-full"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
