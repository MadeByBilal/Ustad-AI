"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

function HomeIcon(active: boolean) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function BriefcaseIcon(active: boolean) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function MapIcon(active: boolean) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function WrenchIcon(active: boolean) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17.24 8.41a4.24 4.24 0 00-6-6l-5.1 5.1m6 6l-5.1-5.1" />
    </svg>
  );
}

function ClipboardCheckIcon(active: boolean) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function ChatIcon(active: boolean) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

function UserIcon(active: boolean) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

export default function BottomNav({ role }: { role: "customer" | "worker" }) {
  const pathname = usePathname();

  const customerNav: NavItem[] = [
    { href: "/dashboard/customer", label: "Home", icon: HomeIcon },
    { href: "/dashboard/customer/jobs", label: "My Jobs", icon: BriefcaseIcon },
    { href: "/dashboard/customer/active", label: "Track", icon: MapIcon },
  ];

  const workerNav: NavItem[] = [
    { href: "/dashboard/worker", label: "Home", icon: HomeIcon },
    { href: "/dashboard/worker/active", label: "Active", icon: WrenchIcon },
    { href: "/dashboard/worker/work", label: "Work", icon: ClipboardCheckIcon },
    { href: "/dashboard/worker/jobs", label: "Jobs", icon: BriefcaseIcon },
    { href: "/dashboard/worker/profile", label: "Profile", icon: UserIcon },
  ];

  const items = role === "customer" ? customerNav : workerNav;

  return (
    <nav className="bottom-nav">
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
              {item.icon(isActive)}
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
