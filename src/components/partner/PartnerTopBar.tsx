"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, ChevronDown, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyOrg } from "@/lib/actions";
import type { NGO } from "@/lib/types";

const LABELS: Record<string, string> = {
  "/partner": "Overview", "/partner/cases": "Cases", "/partner/animals": "Animals",
  "/partner/field": "Field Work", "/partner/team": "Team", "/partner/map": "Map",
  "/partner/surveys": "Surveys", "/partner/medical": "Medical", "/partner/fundraising": "Fundraising",
  "/partner/reports": "Analytics", "/partner/settings": "Organization",
};

function pageLabel(pathname: string): string {
  if (LABELS[pathname]) return LABELS[pathname];
  const base = "/" + pathname.split("/").slice(1, 3).join("/");
  return LABELS[base] ?? "Workspace";
}

export function PartnerTopBar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [org, setOrg] = useState<NGO | null>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => { getMyOrg().then(setOrg).catch(() => {}); }, []);

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-black/[0.08] bg-paper px-6 dark:border-white/[0.08] dark:bg-ink lg:flex">
      <div className="text-[13px] text-bark-400">
        <span className="text-bark-400">{org?.name ?? "StrayPaw"}</span>
        <span className="mx-1.5 text-bark-300">/</span>
        <span className="font-medium text-bark-900 dark:text-bark-50">{pageLabel(pathname)}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-md border border-black/[0.1] px-3 py-1.5 text-[13px] text-bark-500 dark:border-white/[0.12] sm:inline-flex">
          <CalendarDays className="h-4 w-4" /> This month
        </span>
        <button className="relative grid h-9 w-9 place-items-center rounded-md border border-black/[0.1] dark:border-white/[0.12]" aria-label="Notifications">
          <Bell className="h-[17px] w-[17px]" />
        </button>
        <div className="relative ml-1">
          <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-bark-100 text-[12px] font-semibold text-bark-600 dark:bg-bark-800">{(user?.name ?? "?").slice(0, 2).toUpperCase()}</span>
            <ChevronDown className="h-4 w-4 text-bark-400" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-black/[0.08] bg-white py-1 shadow-lg dark:border-white/[0.1] dark:bg-bark-900">
                <Link href="/map" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"><ArrowLeft className="h-4 w-4 text-bark-400" /> Exit to map</Link>
                <Link href="/partner/settings" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">Organization settings</Link>
                <button onClick={() => { setMenu(false); signOut(); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-status-injured hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"><LogOut className="h-4 w-4" /> Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
