"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, ClipboardList, PawPrint, Users, UsersRound, Map as MapIcon, ClipboardCheck,
  Stethoscope, HeartHandshake, FileBarChart, Settings, ChevronLeft, ChevronDown, Menu, X,
  CircleHelp, MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyOrg } from "@/lib/actions";
import { getSupabase } from "@/lib/supabase";
import type { NGO } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { key: "overview", href: "/partner", label: "Overview", icon: LayoutGrid, exact: true },
  { key: "cases", href: "/partner/cases", label: "Cases", icon: ClipboardList, badge: "cases" },
  { key: "animals", href: "/partner/animals", label: "Animals", icon: PawPrint },
  { key: "field", href: "/partner/field", label: "Field Work", icon: Users, badge: "tasks" },
  { key: "team", href: "/partner/team", label: "Team", icon: UsersRound },
  { key: "map", href: "/partner/map", label: "Map", icon: MapIcon },
  { key: "surveys", href: "/partner/surveys", label: "Surveys", icon: ClipboardCheck },
  { key: "medical", href: "/partner/medical", label: "Medical", icon: Stethoscope },
  { key: "fundraising", href: "/partner/fundraising", label: "Fundraising", icon: HeartHandshake },
  { key: "reports", href: "/partner/reports", label: "Analytics", icon: FileBarChart },
];
const ALWAYS = new Set(["overview", "settings"]);

function useActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
}

export function PartnerRail() {
  const isActive = useActive();
  const { user } = useAuth();
  const [org, setOrg] = useState<NGO | null>(null);
  const [openMobile, setOpenMobile] = useState(false);
  const [counts, setCounts] = useState<{ cases: number; tasks: number }>({ cases: 0, tasks: 0 });

  useEffect(() => {
    getMyOrg().then(setOrg).catch(() => {});
    const supa = getSupabase();
    if (!supa) return;
    (async () => {
      try {
        const c = await supa.from("cases").select("id", { count: "exact", head: true }).not("status", "in", "(resolved,closed)");
        const t = await supa.from("tasks").select("id", { count: "exact", head: true }).eq("status", "open");
        setCounts({ cases: c.count ?? 0, tasks: t.count ?? 0 });
      } catch { /* ignore */ }
    })();
  }, []);

  const enabled = org?.config?.modules;
  const nav = enabled && enabled.length ? NAV.filter((n) => ALWAYS.has(n.key) || enabled.includes(n.key)) : NAV;

  const items = (
    <ul className="space-y-0.5">
      {nav.map((n) => {
        const active = isActive(n.href, n.exact);
        const Icon = n.icon;
        const count = n.badge === "cases" ? counts.cases : n.badge === "tasks" ? counts.tasks : 0;
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              onClick={() => setOpenMobile(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] transition-colors",
                active ? "bg-paw-500 text-white" : "text-bark-500 hover:bg-black/[0.04] hover:text-bark-900 dark:text-bark-400 dark:hover:bg-white/[0.05]"
              )}
            >
              <Icon className="h-[17px] w-[17px] shrink-0" />
              <span className="flex-1">{n.label}</span>
              {n.badge && count > 0 && (
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", active ? "bg-white/20" : "bg-bark-100 text-bark-600 dark:bg-bark-800 dark:text-bark-300")}>{count}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const inner = (
    <>
      {/* brand */}
      <div className="flex h-16 items-center gap-3 border-b border-black/[0.08] px-5 dark:border-white/[0.08]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paw-500 text-white"><PawPrint className="h-5 w-5" /></span>
        <div>
          <div className="text-[14px] font-semibold tracking-tight text-bark-900 dark:text-bark-50">StrayPaw</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-bark-400">Partner network</div>
        </div>
        <button onClick={() => setOpenMobile(false)} className="ml-auto lg:hidden" aria-label="Close"><X className="h-[18px] w-[18px]" /></button>
      </div>

      {/* org switcher */}
      <div className="border-b border-black/[0.08] p-3 dark:border-white/[0.08]">
        <Link href="/partner/settings" onClick={() => setOpenMobile(false)} className="flex w-full items-center justify-between rounded-md border border-black/[0.1] bg-white px-3 py-2.5 text-left dark:border-white/[0.12] dark:bg-bark-900">
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-bark-900 dark:text-bark-50">{org?.name ?? "Your organization"}</span>
            <span className="block truncate text-[11px] text-bark-400">{[org?.city, org?.state].filter(Boolean).join(", ") || org?.area || "NGO partner"}</span>
          </span>
          <ChevronDown className="h-[15px] w-[15px] shrink-0 text-bark-400" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-bark-400">Workspace</div>
        {items}
      </nav>

      {/* bottom: help / settings / user */}
      <div className="border-t border-black/[0.08] p-3 dark:border-white/[0.08]">
        <Link href="/contact" onClick={() => setOpenMobile(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] text-bark-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"><CircleHelp className="h-[17px] w-[17px]" /> Help centre</Link>
        <Link href="/partner/settings" onClick={() => setOpenMobile(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] text-bark-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"><Settings className="h-[17px] w-[17px]" /> Settings</Link>
        <div className="mt-3 flex items-center gap-3 border-t border-black/[0.08] px-3 pt-3 dark:border-white/[0.08]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bark-100 text-[11px] font-semibold text-bark-600 dark:bg-bark-800">{(user?.name ?? "?").slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-bark-900 dark:text-bark-50">{user?.name ?? "Account"}</div>
            <div className="text-[11px] text-bark-400">Partner</div>
          </div>
          <Link href="/app" className="ml-auto text-bark-400 hover:text-bark-700" title="Exit to app"><ChevronLeft className="h-[17px] w-[17px]" /></Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-black/[0.08] bg-paper dark:border-white/[0.08] dark:bg-ink lg:flex">{inner}</aside>

      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-black/[0.08] bg-paper/90 px-3 backdrop-blur dark:border-white/[0.08] dark:bg-ink/90 lg:hidden">
        <button onClick={() => setOpenMobile(true)} className="grid h-9 w-9 place-items-center rounded-md hover:bg-black/[0.04]" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-paw-500 text-white"><PawPrint className="h-4 w-4" /></span>
        <span className="text-[14px] font-semibold">StrayPaw</span>
      </div>
      {openMobile && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenMobile(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-paper shadow-xl dark:bg-ink">{inner}</aside>
        </div>
      )}
    </>
  );
}
