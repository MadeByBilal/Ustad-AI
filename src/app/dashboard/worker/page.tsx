import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/auth";
import { Job, Worker } from "@/models";
import WorkerAvailability from "@/components/WorkerAvailability";
import AcceptJobButton from "@/components/AcceptJobButton";
import { JOB_STATUS_STYLES } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function WorkerDashboardPage() {
  const { user } = await requireRole(["worker"]).catch(() => {
    redirect("/login");
    throw new Error("unreachable");
  });

  await connectDB();

  const worker = await Worker.findOne({ user_id: user._id }).lean();
  if (!worker) {
    redirect("/login");
  }

  const [activeJob, broadcastJobs] = await Promise.all([
    worker!.active_job_id
      ? Job.findOne({ _id: worker!.active_job_id }).lean()
      : null,
    Job.find({
      status: "BROADCASTING",
      "matching.acceptance_deadline": { $gte: new Date() },
    })
      .sort({ created_at: -1 })
      .limit(10)
      .lean(),
  ]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-urdu text-2xl font-bold">سلام، {worker!.name}!</h1>
          <p className="mt-1 text-sm text-stone-500">
            {worker!.category.replace(/_/g, " ")} ·{" "}
            {worker!.skills.slice(0, 3).join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge !bg-stone-100 !text-stone-700">
            ⭐ {worker!.average_rating.toFixed(1)}
          </span>
          <span className="badge !bg-stone-100 !text-stone-700">
            {worker!.completed_jobs} jobs
          </span>
          <span
            className={`badge ${
              worker!.verification_level === "documents_verified"
                ? "!bg-emerald-100 !text-emerald-800"
                : "!bg-amber-100 !text-amber-800"
            }`}
          >
            ✓ {worker!.verification_level.replace("_", " ")}
          </span>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="card">
            <h3 className="text-sm font-bold text-stone-800">Ustad Score</h3>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-[#0e5f44]">
              {worker!.ustad_score}
              <span className="text-base font-semibold text-stone-400">/100</span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-[#0e5f44]"
                style={{ width: `${worker!.ustad_score}%` }}
              />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-stone-50 p-2">
                <dt className="text-stone-400">Response</dt>
                <dd className="font-semibold text-stone-800">
                  {worker!.response_rate}%
                </dd>
              </div>
              <div className="rounded-lg bg-stone-50 p-2">
                <dt className="text-stone-400">Cancellation</dt>
                <dd className="font-semibold text-stone-800">
                  {worker!.cancellation_rate}%
                </dd>
              </div>
              <div className="rounded-lg bg-stone-50 p-2">
                <dt className="text-stone-400">Repeat customers</dt>
                <dd className="font-semibold text-stone-800">
                  {worker!.repeat_customers}
                </dd>
              </div>
              <div className="rounded-lg bg-stone-50 p-2">
                <dt className="text-stone-400">Confirmed</dt>
                <dd className="font-semibold text-stone-800">
                  {worker!.confirmed_jobs}
                </dd>
              </div>
            </dl>
          </div>
          <WorkerAvailability
            initial={{
              is_available: worker!.is_available,
              is_online: worker!.is_online,
              emergency_available: worker!.emergency_available,
            }}
          />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="card">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Active job
            </h2>
            {activeJob ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-urdu text-lg font-bold leading-relaxed text-emerald-900">
                    {activeJob.input?.original_text}
                  </p>
                  <span
                    className={`badge shrink-0 ${
                      JOB_STATUS_STYLES[activeJob.status] ?? "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {activeJob.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-emerald-700">
                  {activeJob.understanding?.description} ·{" "}
                  {activeJob.pricing?.currency}{" "}
                  {activeJob.pricing?.final_price ??
                    `${activeJob.pricing?.estimate_min}–${activeJob.pricing?.estimate_max}`}
                </p>
                {activeJob.understanding?.urgency === "emergency" && (
                  <span className="badge mt-2 !bg-red-600 !text-white">
                    Emergency
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-stone-200 p-4 text-sm text-stone-400">
                No active job. Accept a job below to start working.
              </p>
            )}
          </div>

          <div className="card">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Jobs broadcasting near you
            </h2>
            {broadcastJobs.length === 0 ? (
              <p className="mt-3 text-sm text-stone-400">
                Nothing broadcasting right now — check back soon.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {broadcastJobs.map((job) => (
                  <div
                    key={String(job._id)}
                    className="rounded-xl border border-stone-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-urdu text-lg font-bold leading-relaxed text-stone-800">
                        {job.input?.original_text}
                      </p>
                      <span className="badge shrink-0 !bg-amber-100 !text-amber-800">
                        {job.understanding?.category}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-stone-500">
                      {job.understanding?.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                      <span>
                        Offer:{" "}
                        <span className="font-semibold text-stone-800">
                          PKR {job.pricing?.customer_offer}
                        </span>{" "}
                        · {job.location?.address_label}
                      </span>
                      <span>
                        {job.understanding?.urgency === "emergency" && (
                          <span className="mr-2 badge !bg-red-100 !text-red-700">
                            Emergency
                          </span>
                        )}
                        Accept by{" "}
                        {job.matching?.acceptance_deadline
                          ? new Date(job.matching.acceptance_deadline).toLocaleTimeString(
                              "en-GB",
                              { hour: "2-digit", minute: "2-digit" }
                            )
                          : "—"}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-end border-t border-stone-100 pt-3">
                      <AcceptJobButton jobId={String(job._id)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}