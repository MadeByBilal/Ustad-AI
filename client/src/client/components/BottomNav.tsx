"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/client/lib/i18n/context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faMapPin,
  faUser,
  faChartColumn,
  faBriefcase,
  faScrewdriverWrench,
} from "@fortawesome/free-solid-svg-icons";
import { faUser as faUserRegular } from "@fortawesome/free-regular-svg-icons";

interface NavItem {
  href: string;
  label: string;
  icon: typeof faHouse;
}

export default function BottomNav({ role }: { role: "customer" | "worker" }) {
  const pathname = usePathname();
  const { t, lang } = useLang();

  const customerNav: NavItem[] = [
    { href: "/dashboard/customer", label: t("home"), icon: faHouse },
    { href: "/dashboard/customer/active", label: t("tracking"), icon: faMapPin },
    { href: "/dashboard/customer/profile", label: t("profile"), icon: faUserRegular },
  ];

  const workerNav: NavItem[] = [
    { href: "/dashboard/worker", label: t("home"), icon: faHouse },
    { href: "/dashboard/worker/active", label: t("tracking"), icon: faMapPin },
    { href: "/dashboard/worker/stats", label: t("stats"), icon: faChartColumn },
    { href: "/dashboard/worker/jobs", label: t("jobs"), icon: faScrewdriverWrench },
    { href: "/dashboard/worker/profile", label: t("profile"), icon: faUserRegular },
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
              <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
              <span className={`text-[10px] ${lang === "ur" ? "font-urdu" : ""}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
