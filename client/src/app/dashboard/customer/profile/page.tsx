"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/client/lib/i18n/context";
import LogoutButton from "@/client/components/LogoutButton";
import { User, Mail, Phone } from "lucide-react";

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export default function CustomerProfilePage() {
  const { t, lang } = useLang();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((body: { success?: boolean; data?: { user?: UserProfile } }) => {
        if (body?.success && body.data?.user) {
          setUser(body.data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-content">
        <p className="text-center text-muted">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Profile Header */}
      <motion.div
        className="card flex items-center gap-4"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
          <span className="text-2xl font-bold text-bg">
            {user.name?.charAt(0) ?? "U"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`text-lg font-bold text-text ${lang === "ur" ? "font-urdu" : ""}`}>
            {user.name}
          </h2>
          <p className="text-sm capitalize text-muted">
            {t("customer")}
          </p>
        </div>
      </motion.div>

      {/* Info */}
      <motion.div
        className="card space-y-3"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3 text-sm text-text">
          <Mail className="h-4 w-4 text-muted" />
          <span>{user.email}</span>
        </div>
        {user.phone && (
          <div className="flex items-center gap-3 text-sm text-text">
            <Phone className="h-4 w-4 text-muted" />
            <span>{user.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-sm text-text">
          <User className="h-4 w-4 text-muted" />
          <span className="capitalize">{user.role}</span>
        </div>
      </motion.div>

      {/* Logout */}
      <div className="pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}
