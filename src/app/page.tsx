import Link from "next/link";
import VoiceCapture from "@/components/VoiceCapture";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#0a4632] text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#0e5f44] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

      <nav className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
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

      <section className="relative flex flex-1 flex-col items-center justify-center px-5 pb-16">
        <VoiceCapture />
      </section>
    </main>
  );
}