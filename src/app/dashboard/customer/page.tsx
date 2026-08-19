import { redirect } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/auth";
import { Job } from "@/models";
import { JOB_STATUS_STYLES } from "@/lib/display";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  {
    key: "voice",
    label: "Voice note",
    hint: "Speak in Urdu, we write it down",
    href: "/dashboard/customer/new-work?method=voice",
  },
  {
    key: "photo",
    label: "Take a photo",
    hint: "Show the problem, we figure it out",
    href: "/dashboard/customer/new-work?method=photo",
  },
  {
    key: "text",
    label: "I'll type",
    hint: "Describe it in your own words",
    href: "/dashboard/customer/new-work?method=text",
  },
] as const;

export default async function CustomerDashboardPage() {
  const { user } = await requireRole(["customer"]).catch(() => {
    redirect("/login");
    throw new Error("unreachable");
  });

  await connectDB();

  const jobs = await Job.find({ customer_id: user._id })
    .sort({ created_at: -1 })
    .limit(8)
    .lean();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="text-center">
        <h1 className="font-urdu text-3xl font-bold text-stone-900">
          سلام، {user.name ?? "دوست"}! 👋
        </h1>
        <p className="font-urdu mt-1 text-lg text-stone-600">کیا خراب ہوا؟ بتائیں</p>
        <p className="mt-0.5 text-sm text-stone-400">What needs fixing? We&apos;ll take care of it.</p>
      </section>

      <section className="card space-y-3 !bg-[#0e5f44] !text-white !shadow-xl">
        <p className="font-urdu text-xl font-bold">نیا کام پوسٹ کریں</p>
        <p className="text-sm text-emerald-100">
          Post a new job — tell us in one line, our AI understands and prices it.
        </p>
        <Link
          href="/dashboard/customer/new-work"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#0e5f44] transition hover:bg-emerald-50"
        >
          + Post a New Job
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.key}
            href={action.href}
            className="card flex flex-col items-center gap-1 text-center transition hover:border-[#0e5f44] hover:shadow-md"
          >
            <span className="text-2xl" aria-hidden>
              {action.key === "voice" ? "🎙️" : action.key === "photo" ? "📷" : "⌨️"}
            </span>
            <span className="text-sm font-bold text-stone-800">{action.label}</span>
            <span className="text-xs text-stone-400">{action.hint}</span>
          </Link>
        ))}
      </section>

      <section className="card flex items-center justify-between gap-3 border-red-200 !bg-red-50">
        <div>
          <p className="font-bold text-red-800">Urgent? Find the nearest available ustad right now.</p>
          <p className="text-xs text-red-600">
            فوری مدد چاہیے؟ قریب ترین اُستاد فوراً پہنچے گا — no offer needed.
          </p>
        </div>
        <Link
          href="/dashboard/customer/new-work?urgency=emergency"
          className="shrink-0 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
        >
          Get help now
        </Link>
      </section>

      <p className="text-center text-xs font-semibold uppercase tracking-widest text-stone-400">
        Verified ustads · Fair prices · Fast response
      </p>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">
          Your jobs
        </h2>
        {jobs.length === 0 ? (
          <div className="card border-dashed text-center text-sm text-stone-400">
            No jobs yet — post your first job above.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link
                key={String(job._id)}
                href="/dashboard/customer/new-work"
                className="card block transition hover:border-[#0e5f44]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-900">
                      {job.understanding?.category || "Uncategorized"}{" "}
                      <span className="font-normal text-stone-400">
                        · {job.input?.type}
                      </span>
                    </p>
                    <p className="truncate text-sm text-stone-500">
                      {job.input?.original_text || job.input?.transcript}
                    </p>
                  </div>
                  <span
                    className={`badge shrink-0 ${
                      JOB_STATUS_STYLES[job.status] ?? "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                  <span>
                    ₨{" "}
                    {job.pricing?.final_price ??
                      `${job.pricing?.estimate_min ?? 0}–${job.pricing?.estimate_max ?? 0}`}
                  </span>
                  <span>{job.location?.address_label || "No address"}</span>
                  <span>{new Date(job.created_at).toLocaleDateString("en-GB")}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}