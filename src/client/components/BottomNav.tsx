"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/client/lib/i18n/context";
import {
  Home,
  Briefcase,
  MapPin,
  Wrench,
  ClipboardCheck,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export default function BottomNav({ role }: { role: "customer" | "worker" }) {
  const pathname = usePathname();
  const { t, lang } = useLang();

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
              <item.icon className="h-5 w-5" />
              <span className={`text-[10px] ${lang === "ur" ? "font-urdu" : ""}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
