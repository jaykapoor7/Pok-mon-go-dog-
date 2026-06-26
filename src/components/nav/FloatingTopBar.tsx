"use client";

import { useState } from "react";
import Link from "next/link";
import { User, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MenuDrawer } from "./MenuDrawer";

/**
 * Flat top bar (not a floating capsule): the logo on the left and a clearly
 * tappable account chip on the right (avatar + name + chevron) that opens the
 * account / menu drawer. No live counter, no hamburger pill.
 */
export function FloatingTopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  const firstName = user?.name?.split(" ")[0];
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : null;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.06] bg-paper/85 backdrop-blur-md dark:border-white/10 dark:bg-ink/85 lg:pl-20">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" aria-label="StrayPaw home" className="flex items-center">
            <img src="/logo.png" alt="StrayPaw" className="h-12 w-auto" />
          </Link>

          <button
            onClick={() => setMenuOpen(true)}
            aria-label={user ? "Account & menu" : "Sign in & menu"}
            className="flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 py-1 pl-1 pr-2.5 shadow-card transition-colors hover:bg-white active:scale-[0.98] dark:border-white/10 dark:bg-bark-900/70"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paw-500 text-sm font-bold text-white">
              {initials ?? <User className="h-5 w-5" />}
            </span>
            <span className="max-w-[7rem] truncate text-sm font-semibold text-bark-800 dark:text-bark-100">
              {firstName ?? "Sign in"}
            </span>
            <ChevronDown className="h-4 w-4 text-bark-400" />
          </button>
        </div>
      </header>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
