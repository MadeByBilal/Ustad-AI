"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

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
      <FontAwesomeIcon icon={faRightFromBracket} className="mr-2 h-4 w-4" />
      {busy ? "…" : "Logout"}
    </motion.button>
  );
}
