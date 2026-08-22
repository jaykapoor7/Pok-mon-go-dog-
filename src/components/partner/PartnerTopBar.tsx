"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export function PartnerTopBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b border-black/[0.08] bg-paper/90 px-6 backdrop-blur dark:border-white/[0.08] dark:bg-ink/90 lg:flex">
      <form
        onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/partner/cases?q=${encodeURIComponent(q.trim())}`); }}
        className="relative max-w-md flex-1"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search cases…"
          className="w-full rounded-md border border-black/[0.08] bg-transparent py-1.5 pl-9 pr-3 text-sm outline-none placeholder:text-bark-400 focus:border-paw-400 dark:border-white/[0.12]"
        />
      </form>

      <div className="relative ml-auto">
        <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-bark-100 text-[12px] font-semibold text-bark-500 dark:bg-bark-800">
            {(user?.name ?? "?").slice(0, 2).toUpperCase()}
          </span>
          <span className="max-w-[10rem] truncate">{user?.name ?? "Account"}</span>
          <ChevronDown className="h-4 w-4 text-bark-400" />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-black/[0.08] bg-white py-1 shadow-lg dark:border-white/[0.1] dark:bg-bark-900">
              <Link href="/app" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
                <ArrowLeft className="h-4 w-4 text-bark-400" /> Exit to app
              </Link>
              <Link href="/partner/settings" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
                Organization settings
              </Link>
              <button onClick={() => { setMenu(false); signOut(); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-status-injured hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
