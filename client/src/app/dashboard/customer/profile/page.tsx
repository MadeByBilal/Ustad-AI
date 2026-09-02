"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLang } from "@/client/lib/i18n/context";
import LogoutButton from "@/client/components/LogoutButton";
import { User, Mail, Phone, Star, ShieldCheck, AlertCircle, ClipboardList } from "lucide-react";
import "@/app/dark-glass-theme.css";

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  role: string;
  stats?: {
    average_rating: number;
    reviews_count: number;
    trust_score: number;
    cancellations: number;
  };
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
      <div className="dark-glass-theme flex items-center justify-center py-12" style={{ background: "#0B0F0C" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-[#26A650]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dark-glass-theme page-content" style={{ background: "#0B0F0C" }}>
        <p className="text-center text-[#93A396]">Failed to load profile</p>
      </div>
    );
  }

  const stats = user.stats ?? {
    average_rating: 5.0,
    reviews_count: 0,
    trust_score: 100,
    cancellations: 0,
  };

  return (
    <div className="dark-glass-theme min-h-screen px-4 py-6 space-y-5" style={{ background: "#0B0F0C" }}>
      {/* Profile Header */}
      <div
        className="glass-sheen rounded-2xl p-5 flex items-center gap-4"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.14)",
        }}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ background: "#26A650" }}>
          <span className="text-xl font-bold" style={{ color: "#08240F" }}>
            {user.name?.charAt(0) ?? "U"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`text-lg font-bold text-[#F1F4F1] ${lang === "ur" ? "font-urdu" : ""}`}>
            {user.name}
          </h2>
          <p className="text-sm text-[#93A396] capitalize">
            {t("customer")}
          </p>
        </div>
      </div>

      {/* Trust Score & Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-2xl p-4 flex flex-col items-center text-center"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div className="flex items-center gap-1" style={{ color: "#26A650" }}>
            <ShieldCheck className="h-4 w-4" />
            <span className="text-lg font-extrabold text-[#F1F4F1]">{stats.trust_score}</span>
          </div>
          <span className="mt-1 text-[10px] font-medium text-[#93A396]">Trust</span>
        </div>

        <div
          className="rounded-2xl p-4 flex flex-col items-center text-center"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div className="flex items-center gap-1" style={{ color: "#D4A24C" }}>
            <Star className="h-4 w-4 fill-current" />
            <span className="text-lg font-extrabold text-[#F1F4F1]">{stats.average_rating.toFixed(1)}</span>
          </div>
          <span className="mt-1 text-[10px] font-medium text-[#93A396]">{stats.reviews_count} Reviews</span>
        </div>

        <div
          className="rounded-2xl p-4 flex flex-col items-center text-center"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div className="flex items-center gap-1" style={{ color: "#E0A461" }}>
            <AlertCircle className="h-4 w-4" />
            <span className="text-lg font-extrabold text-[#F1F4F1]">{stats.cancellations}</span>
          </div>
          <span className="mt-1 text-[10px] font-medium text-[#93A396]">Cancels</span>
        </div>
      </div>

      {/* Cancellation Penalty Notice */}
      {stats.cancellations > 0 && (
        <div
          className="rounded-2xl p-4 text-sm"
          style={{ background: "rgba(224,164,97,0.1)", border: "1px solid rgba(224,164,97,0.25)", color: "#E0A461" }}
        >
          <p className="font-semibold">Cancellation Penalty Notice</p>
          <p className="mt-1 text-xs" style={{ color: "rgba(224,164,97,0.8)" }}>
            Cancelling a job while a worker is actively tracking decreases your Trust Score.
          </p>
        </div>
      )}

      {/* Contact Info */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div className="flex items-center gap-3 text-sm text-[#F1F4F1]">
          <Mail className="h-4 w-4 text-[#93A396]" />
          <span>{user.email}</span>
        </div>
        {user.phone && (
          <div className="flex items-center gap-3 text-sm text-[#F1F4F1]">
            <Phone className="h-4 w-4 text-[#93A396]" />
            <span>{user.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-sm text-[#F1F4F1]">
          <User className="h-4 w-4 text-[#93A396]" />
          <span className="capitalize">{user.role}</span>
        </div>
      </div>

      {/* Job History */}
      <Link href="/dashboard/customer/jobs" className="block">
        <div
          className="rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 hover:bg-white/[0.07] cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(38,166,80,0.15)" }}>
            <ClipboardList className="h-5 w-5" style={{ color: "#26A650" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#F1F4F1]">Job History</p>
            <p className="text-xs text-[#93A396]">View all your past and active jobs</p>
          </div>
          <svg className="h-5 w-5 shrink-0 text-[#93A396]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </Link>

      {/* Logout */}
      <div className="pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}
