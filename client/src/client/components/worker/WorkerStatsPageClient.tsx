"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/client/lib/i18n/context";
import type { CompletedJobView, WorkerReviewView } from "@contracts/worker";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Star, Clock, Users } from "lucide-react";

interface StatsProps {
  workerId: string;
  initialCompletedJobs: number;
  initialAverageRating: number;
  initialRepeatCustomers: number;
}

type TimeFilter = "all" | "30d" | "90d";

export default function WorkerStatsPageClient({
  workerId,
  initialCompletedJobs,
  initialAverageRating,
  initialRepeatCustomers,
}: StatsProps) {
  const { t, lang } = useLang();
  const [completedJobs, setCompletedJobs] = useState<CompletedJobView[]>([]);
  const [reviews, setReviews] = useState<WorkerReviewView[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [jobsRes, reviewsRes] = await Promise.all([
        fetch(`/api/workers/${workerId}/completed-jobs`, { cache: "no-store" }),
        fetch(`/api/workers/${workerId}/reviews`, { cache: "no-store" }),
      ]);

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
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredJobs = useMemo(() => {
    if (timeFilter === "all") return completedJobs;
    const now = Date.now();
    const days = timeFilter === "30d" ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return completedJobs.filter(
      (j) => new Date(j.completed_at ?? j.created_at).getTime() >= cutoff,
    );
  }, [completedJobs, timeFilter]);

  const totalEarnings = useMemo(
    () => filteredJobs.reduce((sum, j) => sum + j.final_price, 0),
    [filteredJobs],
  );

  const chartData = useMemo(() => {
    const monthMap = new Map<string, number>();
    for (const job of filteredJobs) {
      const date = new Date(job.completed_at ?? job.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + job.final_price);
    }
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, earnings]) => {
        const [y, m] = month.split("-");
        const label = new Date(Number(y), Number(m) - 1).toLocaleString(
          lang === "ur" ? "ur-PK" : "en-US",
          { month: "short" },
        );
        return { month: label, earnings };
      });
  }, [filteredJobs, lang]);

  const avgPerJob = filteredJobs.length > 0 ? totalEarnings / filteredJobs.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Filter */}
      <div className="flex gap-2">
        {(["all", "30d", "90d"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setTimeFilter(filter)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
              timeFilter === filter
                ? "bg-success text-success-fg"
                : "bg-surface text-muted hover:text-text"
            }`}
          >
            {filter === "all" ? t("allTime") : filter === "30d" ? t("last30Days") : t("last90Days")}
          </button>
        ))}
      </div>

      {/* Key Stats Grid */}
      <motion.div
        className="card"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-bg p-3 text-center">
            <TrendingUp className="mx-auto mb-1 h-4 w-4 text-success" />
            <p className="text-xl font-bold text-success">
              {totalEarnings.toLocaleString()}
            </p>
            <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("totalEarnings")}
            </p>
          </div>
          <div className="rounded-xl bg-bg p-3 text-center">
            <Clock className="mx-auto mb-1 h-4 w-4 text-accent" />
            <p className="text-xl font-bold text-text">{filteredJobs.length}</p>
            <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("jobsCompleted")}
            </p>
          </div>
          <div className="rounded-xl bg-bg p-3 text-center">
            <Star className="mx-auto mb-1 h-4 w-4 text-warning" />
            <p className="font-mono text-xl font-bold text-warning">
              {initialAverageRating.toFixed(1)}
            </p>
            <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("averageRating")}
            </p>
          </div>
          <div className="rounded-xl bg-bg p-3 text-center">
            <Users className="mx-auto mb-1 h-4 w-4 text-accent" />
            <p className="text-xl font-bold text-text">{totalReviews}</p>
            <p className={`text-xs text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("totalReviews")}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Earnings Chart */}
      <motion.div
        className="card"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <h3
          className={`mb-4 text-sm font-bold text-text ${lang === "ur" ? "font-urdu" : ""}`}
        >
          {t("earningsOverTime")}
        </h3>
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <TrendingUp className="mb-2 h-8 w-8 text-muted/40" />
            <p className={`text-sm text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("noEarningsYet")}
            </p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#93A396", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#93A396", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,20,15,0.95)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#F1F4F1",
                  }}
                  formatter={(value) => [`${Number(value ?? 0).toLocaleString()} PKR`, t("totalEarnings")]}
                />
                <Bar
                  dataKey="earnings"
                  fill="#26A650"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* Per-job average */}
      <motion.div
        className="card"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-bold text-text ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("perJob")}
            </p>
            <p className="text-xs text-muted">
              {filteredJobs.length > 0
                ? `${filteredJobs.length} ${t("jobsCompleted").toLowerCase()}`
                : `—`}
            </p>
          </div>
          <p className="text-xl font-bold text-success">
            {avgPerJob > 0 ? `${Math.round(avgPerJob).toLocaleString()} PKR` : "—"}
          </p>
        </div>
      </motion.div>

      {/* Recent Reviews */}
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
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Star className="mb-2 h-6 w-6 text-muted/40" />
            <p className={`text-sm text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("noReviewsYet")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.slice(0, 5).map((review) => (
              <div
                key={review.id}
                className="rounded-xl bg-bg p-3"
              >
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
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
                  <p className="mt-1.5 text-xs text-text/80">{review.text}</p>
                )}
                {review.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {review.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Job History */}
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
        {filteredJobs.length === 0 ? (
          <p className={`py-4 text-center text-sm text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("noJobs")}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredJobs.slice(0, 10).map((job) => (
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
        )}
      </motion.div>
    </div>
  );
}
