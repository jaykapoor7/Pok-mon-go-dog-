"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PawPrint, Menu, Plus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MenuDrawer } from "./MenuDrawer";

/**
 * Floating top bar overlaid on the map-first UI.
 * Left: brand. Right: Report Sighting (login-gated) + hamburger menu.
 */
export function FloatingTopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { requireAuth } = useAuth();
  const router = useRouter();

  function report() {
    requireAuth(() => router.push("/report"));
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3">
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-2 rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-card backdrop-blur-xl dark:border-bark-800 dark:bg-bark-900/80">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-paw-500 text-white shadow-warm">
              <PawPrint className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-extrabold tracking-tight">
              StrayPaw<span className="text-paw-500"> Delhi</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={report} className="btn-primary px-3 py-2 text-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Report Sighting</span>
              <span className="sm:hidden">Report</span>
            </button>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-bark-200 bg-white text-bark-700 hover:bg-bark-50 dark:border-bark-700 dark:bg-bark-800 dark:text-bark-100"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
