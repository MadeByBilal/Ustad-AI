"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/client/lib/i18n/context";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export default function BottomNav({ role }: { role: "customer" | "worker" }) {
  const pathname = usePathname();
  const { t, lang } = useLang();

  const customerNav: NavItem[] = [
    { href: "/dashboard/customer", label: t("home"), icon: "fi fi-rr-home" },
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

  return (
    <nav className="bottom-nav md:hidden">
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive =
            item.href === "/dashboard/customer" || item.href === "/dashboard/worker"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${isActive ? "active" : ""}`}
            >
              <i className={`${item.icon} text-lg`} />
              <span className={`text-[10px] ${lang === "ur" ? "font-urdu" : ""}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
