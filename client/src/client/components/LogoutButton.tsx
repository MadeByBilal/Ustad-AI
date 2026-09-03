"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";

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
      className="btn-danger w-full"
    >
      <LogOut className="mr-2 h-4 w-4" />
      {busy ? "…" : "Logout"}
    </motion.button>
  );
}
