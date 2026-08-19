import Link from "next/link";

const CATEGORIES = [
  {
    id: "plumber",
    name: "Plumber",
    urdu: "پلمبر",
    desc: "Pipe fitting, faucet repair, leakage",
    icon: "🔧",
  },
  {
    id: "electrician",
    name: "Electrician",
    urdu: "الیکٹریشن",
    desc: "Wiring, fault finding, inverters",
    icon: "⚡",
  },
  {
    id: "ac_technician",
    name: "AC Technician",
    urdu: "اے سی ٹیکنیشن",
    desc: "Repair, gas refill, deep cleaning",
    icon: "❄️",
  },
  {
    id: "carpenter",
    name: "Carpenter",
    urdu: "بڑھئی",
    desc: "Furniture, cabinets, doors",
    icon: "🪚",
  },
];

const STEPS = [
  {
    title: "مشکل بتائیں",
    sub: "Describe the problem",
    text: "Voice, text, photo — in Urdu, Roman Urdu or English.",
  },
  {
    title: "ہم سمجھتے ہیں",
    sub: "AI understands",
    text: "The problem becomes a structured job with the right skills.",
  },
  {
    title: "قریبی اُستاد",
    sub: "Nearby verified workers",
    text: "Verified workers around you respond with fair prices.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0a4632] text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#0e5f44] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <nav className="mb-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-lg font-bold text-[#0a4632]">
                ا
              </span>
              <span className="text-lg font-bold tracking-tight">
                Ustad <span className="text-amber-400">AI</span>
              </span>
            </div>
            <Link
              href="/login"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/10"
            >
              Sign in
            </Link>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Verified local technicians · Karachi, Lahore, Islamabad
              </p>
              <h1 className="font-urdu text-4xl font-bold leading-[1.6] sm:text-5xl sm:leading-[1.6]">
                اپنے قریبی اُستاد کو
                <span className="text-amber-400"> آسانی سے</span> تلاش کریں
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-emerald-100/90">
                Describe a problem in your own words — voice, text or photo.
                Ustad AI understands it, and verified plumbers, electricians,
                AC technicians and carpenters nearby respond within minutes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className="btn-primary !bg-amber-400 !text-[#0a4632] hover:!bg-amber-300">
                  Find a Ustad — it&apos;s free
                </Link>
                <Link href="/login" className="btn-secondary !border-white/25 !bg-transparent !text-white hover:!bg-white/10">
                  I&apos;m a technician
                </Link>
              </div>
            </div>

            {/* Demo search card */}
            <div className="card !bg-white/95 p-6 shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Try it — describe your problem
              </p>
              <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="font-urdu text-lg leading-relaxed text-stone-800">
                  پانی کی ٹینکی سے پانی نہیں آ رہا، بند ہو گیا ہے
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Roman Urdu voice → structured job → nearby plumbers
                </p>
              </div>
              <div className="mt-3 grid gap-2">
                {[
                  ["Category", "Plumber"],
                  ["Urgency", "Normal"],
                  ["Est. price", "PKR 1,200 – 2,500"],
                  ["Workers nearby", "6 verified within 5 km"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                  >
                    <span className="text-stone-500">{k}</span>
                    <span className="font-semibold text-stone-800">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Muhammad Imran
                  </p>
                  <p className="text-xs text-emerald-700">
                    Plumber · ⭐ 4.5 · 55 jobs · verified
                  </p>
                </div>
                <span className="badge !bg-emerald-600 !text-white">Nearby</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-urdu text-3xl font-bold">کون سا کام کرانا ہے؟</h2>
        <p className="mt-1 text-sm text-stone-500">
          What do you need done? Every category has verified ustads.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href="/login"
              className="group card transition-transform hover:-translate-y-0.5"
            >
              <span className="text-3xl">{c.icon}</span>
              <h3 className="mt-3 font-urdu text-lg font-bold">{c.urdu}</h3>
              <p className="text-sm font-semibold text-stone-800">{c.name}</p>
              <p className="mt-1 text-xs text-stone-500">{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#eae4d6]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-urdu text-3xl font-bold">یہ کیسے کام کرتا ہے؟</h2>
          <p className="mt-1 text-sm text-stone-600">How Ustad AI works</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.sub} className="card">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0e5f44] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="font-urdu mt-3 text-xl font-bold">{s.title}</h3>
                <p className="text-sm font-semibold text-stone-600">{s.sub}</p>
                <p className="mt-1 text-sm text-stone-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-xs text-stone-500 sm:flex-row">
          <p>Ustad AI — Urdu-first technician marketplace for Pakistan.</p>
          <p>Foundation build · Karachi · Lahore · Islamabad</p>
        </div>
      </footer>
    </main>
  );
}