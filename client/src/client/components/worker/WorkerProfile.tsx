"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { WorkerDashboardData, CompletedJobView, WorkerReviewView } from "@contracts/worker";
import { useLang } from "@/client/lib/i18n/context";
import WorkerAvailability from "@/client/components/WorkerAvailability";
import LogoutButton from "@/client/components/LogoutButton";
import LocationUpdater from "./LocationUpdater";
import { Check, Clock, Edit3, Save, X, Star } from "lucide-react";
import { getApiErrorMessage } from "@/client/lib/api-client";
import { WORKER_CATEGORIES } from "@contracts/worker";

const POLL_MS = 15000;

export default function WorkerProfile({ workerId }: { workerId: string }) {
  const { t, lang } = useLang();
  const [data, setData] = useState<WorkerDashboardData | null>(null);
  const [completedJobs, setCompletedJobs] = useState<CompletedJobView[]>([]);
  const [reviews, setReviews] = useState<WorkerReviewView[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [dashRes, jobsRes, reviewsRes] = await Promise.all([
        fetch(`/api/workers/${workerId}/dashboard`, { cache: "no-store" }),
        fetch(`/api/workers/${workerId}/completed-jobs`, { cache: "no-store" }),
        fetch(`/api/workers/${workerId}/reviews`, { cache: "no-store" }),
      ]);

      const dashBody = (await dashRes.json().catch(() => null)) as {
        success?: boolean;
        data?: WorkerDashboardData;
      } | null;
      if (dashBody?.success) setData(dashBody.data ?? null);

      const jobsBody = (await jobsRes.json().catch(() => null)) as {
        success?: boolean;
        data?: { completed_jobs?: CompletedJobView[] };
      } | null;
      if (jobsBody?.success && jobsBody.data?.completed_jobs) {
        setCompletedJobs(jobsBody.data.completed_jobs);
      }

      const reviewsBody = (await reviewsRes.json().catch(() => null)) as {
        success?: boolean;
        data?: { reviews?: WorkerReviewView[]; total_reviews?: number };
      } | null;
      if (reviewsBody?.success && reviewsBody.data) {
        setReviews(reviewsBody.data.reviews ?? []);
        setTotalReviews(reviewsBody.data.total_reviews ?? 0);
      }
    } catch {
      // ignore
    }
  }, [workerId]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  function startEditing() {
    if (!data) return;
    setEditName(data.worker.name);
    setEditCategory(data.worker.category);
    setEditSkills(data.worker.skills.join(", "));
    setEditing(true);
    setSaveError(null);
  }

  function cancelEditing() {
    setEditing(false);
    setSaveError(null);
  }

  async function saveProfile() {
    setSaving(true);
    setSaveError(null);
    try {
      const skills = editSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/workers/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory,
          skills,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Failed to update profile"));
      }
      setEditing(false);
      void refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

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
      <motion.div
        className="card"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className={`mb-1 block text-xs font-medium text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
                {t("name")}
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className={`mb-1 block text-xs font-medium text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
                {t("category")}
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="input w-full"
              >
                {WORKER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`mb-1 block text-xs font-medium text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
                {t("skills")} ({t("pickAtLeastOne")})
              </label>
              <input
                type="text"
                value={editSkills}
                onChange={(e) => setEditSkills(e.target.value)}
                placeholder="plumbing, pipe-fitting, drainage"
                className="input w-full"
              />
            </div>
            {saveError && (
              <p className="text-xs text-warning">{saveError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={saving}
                className="btn-primary flex-1 !rounded-xl !py-2 text-xs disabled:opacity-60"
              >
                <Save className="mr-1 inline h-3.5 w-3.5" />
                {saving ? t("saving") : t("save")}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-xl border border-divider px-3 py-2 text-xs text-muted transition-colors hover:bg-bg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success">
              <span className="text-2xl font-bold text-success-fg">
                {w.name?.charAt(0) ?? "U"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-urdu text-lg font-bold text-text">{w.name}</h2>
                <button
                  type="button"
                  onClick={startEditing}
                  className="rounded-lg p-1 text-muted transition-colors hover:bg-bg hover:text-text"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-sm capitalize text-muted">
                {w.category.replace(/_/g, " ")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {w.skills.slice(0, 5).map((skill) => (
                  <span key={skill} className="badge bg-surface text-muted">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        className="card"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-bg p-3 text-center">
            <p className="text-xl font-bold text-success">{w.completed_jobs}</p>
            <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>{t("completedJobs")}</p>
          </div>
          <div className="rounded-xl bg-bg p-3 text-center">
            <p className="font-mono text-xl font-bold text-warning">{w.average_rating.toFixed(1)}</p>
            <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>{t("rating")}</p>
          </div>
          <div className="rounded-xl bg-bg p-3 text-center">
            <p className="text-xl font-bold text-accent">{totalReviews}</p>
            <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>{t("totalReviews")}</p>
          </div>
        </div>
      </motion.div>

      {/* Verification */}
      <motion.div
        className="card"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
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
            {w.verification_level === "documents_verified" ? (
              <><Check className="h-3.5 w-3.5 inline" /> {t("verified")}</>
            ) : (
              <><Clock className="h-3.5 w-3.5 inline" /> {t("pending")}</>
            )}
          </span>
        </div>
      </motion.div>

      {/* Recent Reviews */}
      {reviews.length > 0 && (
        <motion.div
          className="card"
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <h3
            className={`mb-3 text-sm font-bold text-text ${lang === "ur" ? "font-urdu" : ""}`}
          >
            {t("totalReviews")} ({totalReviews})
          </h3>
          <div className="space-y-2">
            {reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="rounded-xl bg-bg p-3">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < review.rating
                            ? "fill-warning text-warning"
                            : "text-muted/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted">
                    {new Date(review.created_at).toLocaleDateString(
                      lang === "ur" ? "ur-PK" : "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                </div>
                {review.text && (
                  <p className="mt-1 text-xs text-text/80">{review.text}</p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Job History */}
      {completedJobs.length > 0 && (
        <motion.div
          className="card"
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <h3
            className={`mb-3 text-sm font-bold text-text ${lang === "ur" ? "font-urdu" : ""}`}
          >
            {t("jobHistory")}
          </h3>
          <div className="space-y-2">
            {completedJobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-xl bg-bg px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text">
                    {job.subcategory || job.category}
                  </p>
                  <p className="truncate text-[10px] text-muted">
                    {job.address_label || job.description}
                  </p>
                </div>
                <div className="ml-3 shrink-0 text-right">
                  <p className="text-xs font-bold text-success">
                    {job.final_price.toLocaleString()} PKR
                  </p>
                  <p className="text-[10px] text-muted">
                    {new Date(job.completed_at ?? job.created_at).toLocaleDateString(
                      lang === "ur" ? "ur-PK" : "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

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
        <LogoutButton />
      </div>
    </div>
  );
}
