"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      onClick={logout}
      disabled={busy}
      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-60"
    >
      {busy ? "…" : "Logout"}
    </button>
  );
}