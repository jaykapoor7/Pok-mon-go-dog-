"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app/AppShell";

const LINKS = [
  { label: "Explore", href: "/explore" },
  { label: "Resources", href: "/resources" },
  { label: "Learn", href: "/learn" },
  { label: "About", href: "/about" },
];

/** Unified top nav for all platform pages. Matches the landing page header. */
export function PlatformNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 text-lg font-bold text-white">
          StrayPaw
        </Link>
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13.5px] font-medium transition-colors",
                active(l.href) ? "text-white" : "text-white/50 hover:text-white",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/map"
            className="hidden rounded-full border border-white/20 px-4 py-2 text-[13px] font-semibold text-white/70 transition-colors hover:border-white/40 hover:text-white md:inline-flex"
          >
            Open app
          </Link>
          <Link
            href="/map"
            className="rounded-full bg-paw-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 md:hidden"
          >
            App
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-1 grid h-9 w-9 place-items-center rounded-md text-white/60 hover:bg-white/[0.06] md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-white/[0.06] px-4 pb-3 pt-1 md:hidden">
          {[...LINKS, { label: "Open App", href: "/map" }].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-md px-3 py-2.5 text-[15px] font-medium",
                active(l.href) ? "text-white" : "text-white/60",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

/** Page wrapper for platform pages. */
/**
 * Content pages render inside the console now, one shell for community
 * reporters and NGO staff alike, so navigating out of the map never drops you
 * into a different product.
 */
export function PlatformShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AppShell>
      <div className={cn("mx-auto w-full max-w-5xl", className)}>{children}</div>
    </AppShell>
  );
}
