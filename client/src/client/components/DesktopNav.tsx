"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useLang } from "@/client/lib/i18n/context";
import LanguageToggle from "@/client/components/LanguageToggle";
import LogoutButton from "@/client/components/LogoutButton";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export default function DesktopNav({
  role,
  userName,
}: {
  role: "customer" | "worker";
  userName: string;
}) {
  const pathname = usePathname();
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const customerNav: NavItem[] = [
    { href: "/dashboard/customer", label: t("home"), icon: "fi fi-rr-home" },
    { href: "/dashboard/customer/jobs", label: t("myJobs"), icon: "fi fi-rr-briefcase" },
    { href: "/dashboard/customer/active", label: t("tracking"), icon: "fi fi-tr-map-location-track" },
    { href: "/dashboard/customer/profile", label: t("profile"), icon: "fi fi-rr-user" },
  ];

  const workerNav: NavItem[] = [
    { href: "/dashboard/worker", label: t("home"), icon: "fi fi-rr-home" },
    { href: "/dashboard/worker/active", label: t("tracking"), icon: "fi fi-tr-map-location-track" },
    { href: "/dashboard/worker/stats", label: t("stats"), icon: "fi fi-rr-chart-histogram" },
    { href: "/dashboard/worker/jobs", label: t("jobs"), icon: "fi fi-rr-briefcase" },
    { href: "/dashboard/worker/profile", label: t("profile"), icon: "fi fi-rr-user" },
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
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-xs font-bold text-[rgb(var(--surface))]">
            ا
          </span>
          <span className={`text-base font-bold text-text ${lang === "ur" ? "font-urdu" : ""}`}>Ustad AI</span>
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
                <i className={`${item.icon} text-sm`} />
                <span className={lang === "ur" ? "font-urdu" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />

          <div className="relative" ref={ref}>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1.5 rounded-xl border border-divider bg-[rgb(var(--surface))] px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent/30 hover:bg-bg"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
                <i className="fi fi-rr-user text-xs" />
              </div>
              <span className="hidden lg:inline max-w-[80px] truncate">{userName}</span>
              <i className="fi fi-rr-angle-small-down text-xs text-muted" />
            </button>

            {open && (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-divider bg-surface shadow-xl">
                <div className="border-b border-divider px-3 py-2">
                  <p className="text-xs font-bold text-text">{userName}</p>
                  <p className="text-[10px] capitalize text-muted">{role === "customer" ? t("customer") : t("technician")}</p>
                </div>
                <div className="py-1">
                  <Link
                    href={`/dashboard/${role}/profile`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-text transition-colors hover:bg-bg"
                  >
                    <i className="fi fi-rr-settings text-xs text-muted" />
                    {t("settings")}
                  </Link>
                  <LogoutButton />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
