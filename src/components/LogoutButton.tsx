"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

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
    <motion.button
      onClick={logout}
      disabled={busy}
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="rounded-lg border border-divider bg-surface px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-bg disabled:opacity-60"
    >
      {busy ? "…" : "Logout"}
    </motion.button>
  );
}
