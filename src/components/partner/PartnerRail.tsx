"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ClipboardList,
  PawPrint,
  Users,
  Map as MapIcon,
  ClipboardCheck,
  Stethoscope,
  HeartHandshake,
  FileBarChart,
  Settings,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react";
import { getMyOrg } from "@/lib/actions";
import type { NGO } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/partner", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/partner/cases", label: "Cases", icon: ClipboardList },
  { href: "/partner/animals", label: "Animals", icon: PawPrint },
  { href: "/partner/field", label: "Field Work", icon: Users },
  { href: "/partner/map", label: "Map", icon: MapIcon },
  { href: "/partner/surveys", label: "Surveys", icon: ClipboardCheck },
  { href: "/partner/medical", label: "Medical", icon: Stethoscope },
  { href: "/partner/fundraising", label: "Fundraising", icon: HeartHandshake },
  { href: "/partner/reports", label: "Reports", icon: FileBarChart },
  { href: "/partner/settings", label: "Organization", icon: Settings },
];

function useActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function PartnerRail() {
  const isActive = useActive();
  const [org, setOrg] = useState<NGO | null>(null);
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    getMyOrg().then(setOrg).catch(() => {});
  }, []);

  const items = (
    <ul className="space-y-0.5">
      {NAV.map((n) => {
        const active = isActive(n.href, n.exact);
        const Icon = n.icon;
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              onClick={() => setOpenMobile(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-black/[0.06] text-bark-900 dark:bg-white/[0.08] dark:text-bark-50"
                  : "text-bark-500 hover:bg-black/[0.03] hover:text-bark-800 dark:text-bark-400 dark:hover:bg-white/[0.04]"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-paw-600" : "text-bark-400")} />
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-1.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-paw-500 to-paw-700 text-white">
        <PawPrint className="h-4 w-4 fill-white/90" strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-bark-900 dark:text-bark-50">
          {org?.name ?? "StrayPaw"}
        </p>
        <p className="text-[11px] text-bark-400">Partner workspace</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-black/[0.08] bg-paper px-3 py-4 dark:border-white/[0.08] dark:bg-ink lg:flex">
        {brand}
        <nav className="mt-6 flex-1">{items}</nav>
        <Link href="/app" className="mt-4 flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-bark-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
          <ChevronLeft className="h-4 w-4" /> Exit to app
        </Link>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-black/[0.08] bg-paper/90 px-3 backdrop-blur dark:border-white/[0.08] dark:bg-ink/90 lg:hidden">
        <button onClick={() => setOpenMobile(true)} className="grid h-9 w-9 place-items-center rounded-md hover:bg-black/[0.04]" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        {brand}
      </div>
      {openMobile && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenMobile(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-paper p-3 shadow-xl dark:bg-ink">
            <div className="flex items-center justify-between">
              {brand}
              <button onClick={() => setOpenMobile(false)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-black/[0.04]" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <nav className="mt-6">{items}</nav>
            <Link href="/app" className="mt-4 flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-bark-400 hover:bg-black/[0.03]">
              <ChevronLeft className="h-4 w-4" /> Exit to app
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
