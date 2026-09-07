"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/client/lib/i18n/context";
import LogoutButton from "@/client/components/LogoutButton";
import CloudinaryUpload from "@/client/components/CloudinaryUpload";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faPhone,
  faStar,
  faShield,
  faCircleExclamation,
  faClipboardList,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarRegular } from "@fortawesome/free-regular-svg-icons";
import { getApiErrorMessage } from "@/client/lib/api-client";

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  role: string;
  profile_image?: string | null;
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

  const stats = user.stats ?? {
    average_rating: 5.0,
    reviews_count: 0,
    trust_score: 100,
    cancellations: 0,
  };

  const handleImageUpload = useCallback(async (url: string) => {
    try {
      const res = await fetch("/api/auth/profile-image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_image: url }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Failed to update photo"));
      }
      setUser((prev) => prev ? { ...prev, profile_image: url } : prev);
    } catch {
      // ignore — will refresh on next load
    }
  }, []);

  const handleImageRemove = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/profile-image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_image: null }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Failed to remove photo"));
      }
      setUser((prev) => prev ? { ...prev, profile_image: null } : prev);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="space-y-5 px-4 py-6">
      {/* Profile Header */}
      <div className="glass-sheen card flex items-center gap-4">
        <CloudinaryUpload
          currentImage={user.profile_image}
          name={user.name}
          onUploaded={handleImageUpload}
          onRemoved={handleImageRemove}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h2 className={`text-lg font-bold text-text ${lang === "ur" ? "font-urdu" : ""}`}>
            {user.name}
          </h2>
          <p className="text-sm text-muted capitalize">
            {t("customer")}
          </p>
        </div>
      </div>

      {/* Trust Score & Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card flex flex-col items-center p-4 text-center">
          <div className="flex items-center gap-1 text-success">
            <FontAwesomeIcon icon={faShield} className="h-4 w-4" />
            <span className="text-lg font-extrabold text-text">{stats.trust_score}</span>
          </div>
          <span className="mt-1 text-[10px] font-medium text-muted">Trust</span>
        </div>

        <div className="card flex flex-col items-center p-4 text-center">
          <div className="flex items-center gap-1 text-warning">
            <FontAwesomeIcon icon={faStar} className="h-4 w-4" />
            <span className="text-lg font-extrabold text-text">{stats.average_rating.toFixed(1)}</span>
          </div>
          <span className="mt-1 text-[10px] font-medium text-muted">{stats.reviews_count} Reviews</span>
        </div>

        <div className="card flex flex-col items-center p-4 text-center">
          <div className="flex items-center gap-1 text-warning">
            <FontAwesomeIcon icon={faCircleExclamation} className="h-4 w-4" />
            <span className="text-lg font-extrabold text-text">{stats.cancellations}</span>
          </div>
          <span className="mt-1 text-[10px] font-medium text-muted">Cancels</span>
        </div>
      </div>

      {/* Cancellation Penalty Notice */}
      {stats.cancellations > 0 && (
        <div className="card border-warning/25 bg-warning/10 p-4 text-sm text-warning">
          <p className="font-semibold">Cancellation Penalty Notice</p>
          <p className="mt-1 text-xs text-warning/80">
            Cancelling a job while a worker is actively tracking decreases your Trust Score.
          </p>
        </div>
      )}

      {/* Contact Info */}
      <div className="card space-y-3 p-4">
        <div className="flex items-center gap-3 text-sm text-text">
          <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4 text-muted" />
          <span>{user.email}</span>
        </div>
        {user.phone && (
          <div className="flex items-center gap-3 text-sm text-text">
            <FontAwesomeIcon icon={faPhone} className="h-4 w-4 text-muted" />
            <span>{user.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-sm text-text">
          <FontAwesomeIcon icon={faUser} className="h-4 w-4 text-muted" />
          <span className="capitalize">{user.role}</span>
        </div>
      </div>

      {/* Job History */}
      <Link href="/dashboard/customer/jobs" className="block">
        <div className="card flex items-center gap-3 transition-all duration-200 hover:border-accent/30">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15">
            <FontAwesomeIcon icon={faClipboardList} className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text">Job History</p>
            <p className="text-xs text-muted">View all your past and active jobs</p>
          </div>
          <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4 shrink-0 text-muted" />
        </div>
      </Link>

      {/* Logout */}
      <div className="pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}
