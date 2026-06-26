"use client";

import { useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MenuDrawer } from "./MenuDrawer";

/**
 * Flat top bar (intentionally NOT a floating capsule): the logo on the left and
 * a single account button on the right — no live counter, no hamburger pill.
 * Primary navigation lives in the bottom bar (mobile) / left rail (desktop).
 */
export function FloatingTopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

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
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" aria-label="StrayPaw home" className="flex items-center">
            <img src="/logo.png" alt="StrayPaw" className="h-9 w-auto" />
          </Link>

          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Account & menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-paw-500 text-sm font-bold text-white shadow-warm transition-transform active:scale-95"
          >
            {initials ?? <User className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
