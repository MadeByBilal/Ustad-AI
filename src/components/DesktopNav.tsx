"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useLang } from "@/lib/i18n/context";
import LanguageToggle from "@/components/LanguageToggle";
import {
  Home,
  Briefcase,
  MapPin,
  Wrench,
  ClipboardCheck,
  User,
  LogOut,
  Settings,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export default function DesktopNav({
  role,
  userName,
}: {
  role: "customer" | "worker";
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const customerNav: NavItem[] = [
    { href: "/dashboard/customer", label: t("home"), icon: Home },
    { href: "/dashboard/customer/jobs", label: t("myJobs"), icon: Briefcase },
    { href: "/dashboard/customer/active", label: t("track"), icon: MapPin },
  ];

  const workerNav: NavItem[] = [
    { href: "/dashboard/worker", label: t("home"), icon: Home },
    { href: "/dashboard/worker/active", label: t("active"), icon: Wrench },
    { href: "/dashboard/worker/work", label: t("work"), icon: ClipboardCheck },
    { href: "/dashboard/worker/jobs", label: t("jobs"), icon: Briefcase },
    { href: "/dashboard/worker/profile", label: t("profile"), icon: User },
  ];

  const items = role === "customer" ? customerNav : workerNav;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <nav className="desktop-nav">
      <div className="desktop-nav-inner">
        <Link href="/dashboard" className="desktop-nav-brand">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-bg">
            ا
          </span>
          <span className="text-base font-semibold text-text">Ustad AI</span>
        </Link>

        <div className="desktop-nav-links">
          {items.map((item) => {
            const isActive =
              item.href === "/dashboard/customer" ||
              item.href === "/dashboard/worker"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`desktop-nav-item ${isActive ? "active" : ""}`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <LanguageToggle />

          <div className="relative" ref={ref}>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 rounded-lg border border-divider px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="hidden lg:inline">{userName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
            </button>

            {open && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-divider bg-surface shadow-xl">
                <div className="border-b border-divider px-4 py-3">
                  <p className="text-sm font-bold text-text">{userName}</p>
                  <p className="text-xs capitalize text-muted">{role}</p>
                </div>
                <div className="py-1">
                  <Link
                    href={`/dashboard/${role}/profile`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-text transition-colors hover:bg-bg"
                  >
                    <Settings className="h-4 w-4 text-muted" />
                    {t("settings")}
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-warning transition-colors hover:bg-bg"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("logout")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
