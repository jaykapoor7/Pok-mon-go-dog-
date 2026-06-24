"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PawPrint, Menu } from "lucide-react";
import { DEMO_MODE } from "@/lib/config";
import { demoDogs } from "@/lib/demo-sightings";
import { MenuDrawer } from "./MenuDrawer";

/**
 * Floating top bar (meowmbai-style): brand on the left, a live dog count and
 * the hamburger menu on the right. Reporting now lives in the bottom nav.
 */
export function FloatingTopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setCount((d.dogs ?? 0) + (DEMO_MODE ? demoDogs.length : 0));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3">
        <div className="glass pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-2 rounded-[20px] px-2.5 py-2 shadow-card">
          <Link href="/" className="flex items-center gap-2.5 pl-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-paw-500 text-white">
              <PawPrint className="h-4 w-4" />
            </span>
            <span className="font-display text-[15px] font-bold tracking-tightest">
              StrayPaw<span className="text-bark-400"> Delhi</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {count !== null && (
              <span className="flex items-center gap-1 px-1 text-sm font-semibold text-bark-600 dark:text-bark-300">
                <span className="text-paw-600">{count.toLocaleString("en-IN")}</span>
                dogs
              </span>
            )}
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-black/[0.07] bg-bark-900/[0.04] text-bark-700 transition-colors hover:bg-bark-900/[0.07] dark:border-white/10 dark:bg-white/[0.06] dark:text-bark-100"
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
