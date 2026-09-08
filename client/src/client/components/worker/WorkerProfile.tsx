"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { WorkerDashboardData, CompletedJobView, WorkerReviewView } from "@contracts/worker";
import { useLang } from "@/client/lib/i18n/context";
import LogoutButton from "@/client/components/LogoutButton";
import CloudinaryUpload from "@/client/components/CloudinaryUpload";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faClock,
  faPenToSquare,
  faSave,
  faXmark,
  faStar,
  faBriefcase,
} from "@fortawesome/free-solid-svg-icons";
import { getApiErrorMessage } from "@/client/lib/api-client";
import { WORKER_CATEGORIES } from "@contracts/worker";

const POLL_MS = 15000;

export default function WorkerProfile({ workerId }: { workerId: string }) {
  const { t, lang } = useLang();
  const [data, setData] = useState<WorkerDashboardData | null>(null);
  const [completedJobs, setCompletedJobs] = useState<CompletedJobView[]>([]);
  const [reviews, setReviews] = useState<WorkerReviewView[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);

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

  const handleImageUpload = useCallback(async (url: string) => {
    try {
      const res = await fetch("/api/workers/me/profile-image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_image: url }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Failed to update photo"));
      }
      void refresh();
    } catch {
      // ignore — avatar will refresh on next poll
    }
  }, [refresh]);

  const handleImageRemove = useCallback(async () => {
    try {
      const res = await fetch("/api/workers/me/profile-image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_image: null }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Failed to remove photo"));
      }
      void refresh();
    } catch {
      // ignore
    }
  }, [refresh]);

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

  if (!data || !data.worker) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  const w = data.worker;

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <motion.div
        className="glass-sheen card"
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
                <FontAwesomeIcon icon={faSave} className="mr-1 h-3.5 w-3.5" />
                {saving ? t("saving") : t("save")}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-xl border border-divider px-3 py-2 text-xs text-muted transition-colors hover:bg-bg"
              >
                <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <CloudinaryUpload
              currentImage={w.profile_image}
              name={w.name}
              onUploaded={handleImageUpload}
              onRemoved={handleImageRemove}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className={`font-urdu text-lg font-bold text-text ${lang === "ur" ? "font-urdu" : ""}`}>{w.name}</h2>
                <button
                  type="button"
                  onClick={startEditing}
                  className="rounded-lg p-1 text-muted transition-colors hover:bg-bg hover:text-text"
                >
                  <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5" />
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
            <div className="flex items-center justify-center gap-1">
              <FontAwesomeIcon icon={faStar} className="h-4 w-4 text-warning" />
              <p className="font-mono text-xl font-bold text-warning">{w.average_rating.toFixed(1)}</p>
            </div>
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
                ? "bg-success text-white"
                : "bg-warning/10 text-warning"
            }`}
          >
            {w.verification_level === "documents_verified" ? (
              <><FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" /> {t("verified")}</>
            ) : (
              <><FontAwesomeIcon icon={faClock} className="h-3.5 w-3.5" /> {t("pending")}</>
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
              <div key={review.id} className="glass-icon-circle rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <FontAwesomeIcon
                        key={i}
                        icon={faStar}
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
                className="glass-icon-circle flex items-center justify-between rounded-xl px-3 py-2.5"
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

      {/* Logout */}
      <div className="pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}
