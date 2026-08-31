"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { WorkerDashboardData } from "@/server/lib/worker/dashboard";
import { useLang } from "@/client/lib/i18n/context";
import WorkerAvailability from "@/client/components/WorkerAvailability";
import LocationUpdater from "./LocationUpdater";
import { Check, Clock } from "lucide-react";

const POLL_MS = 15000;

export default function WorkerProfile({ workerId }: { workerId: string }) {
  const { t, lang } = useLang();
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  const w = data.worker;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <motion.div className="card flex items-center gap-4" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
          <span className="text-2xl font-bold text-bg">
            {w.name?.charAt(0) ?? "U"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-urdu text-lg font-bold text-text">{w.name}</h2>
          <p className="text-sm capitalize text-muted">
            {w.category.replace(/_/g, " ")}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {w.skills.slice(0, 4).map((skill) => (
              <span key={skill} className="badge bg-surface text-muted">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div className="card" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <h3 className={`mb-3 text-sm font-bold text-text ${lang === "ur" ? "font-urdu" : ""}`}>{t("ustadScore")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-bg p-3 text-center">
            <p className="text-xl font-bold text-accent">{w.ustad_score}</p>
            <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>{t("ustadScore")}</p>
          </div>
          <div className="rounded-xl bg-bg p-3 text-center">
            <p className="text-xl font-bold text-text">{w.completed_jobs}</p>
            <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>{t("completedJobs")}</p>
          </div>
          <div className="rounded-xl bg-bg p-3 text-center">
            <p className="font-mono text-xl font-bold text-warning">{w.average_rating.toFixed(1)}</p>
            <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>{t("rating")}</p>
          </div>
          <div className="rounded-xl bg-bg p-3 text-center">
            <p className="font-mono text-xl font-bold text-text">{w.response_rate}%</p>
            <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>{t("responseRate")}</p>
          </div>
        </div>
      </motion.div>

      {/* Verification */}
      <motion.div className="card" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-sm font-bold text-text ${lang === "ur" ? "font-urdu" : ""}`}>{t("verification")}</h3>
            <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
              {w.verification_level === "documents_verified"
                ? t("verified")
                : t("notVerified")}
            </p>
          </div>
          <span
            className={`badge ${
              w.verification_level === "documents_verified"
                ? "bg-success text-success-fg"
                : "bg-warning/10 text-warning"
            }`}
          >
            {w.verification_level === "documents_verified" ? <><Check className="h-3.5 w-3.5 inline" /> {t("verified")}</> : <><Clock className="h-3.5 w-3.5 inline" /> {t("pending")}</>}
          </span>
        </div>
      </motion.div>

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
          <motion.button
            type="submit"
            className="btn-danger w-full"
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {t("signOut")}
          </motion.button>
        </form>
      </div>
    </div>
  );
}
