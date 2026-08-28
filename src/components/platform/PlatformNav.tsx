"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Insights", href: "/insights" },
  { label: "Research", href: "/research" },
  { label: "Take Action", href: "/take-action" },
];

/** Editorial top nav for the data platform. Minimal, calm, data-product feel. */
export function PlatformNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.07] bg-paper/85 backdrop-blur-md dark:border-white/10 dark:bg-ink/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="StrayPaw home" className="shrink-0"><Logo size="sm" /></Link>
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={cn("rounded-md px-3 py-1.5 text-[13.5px] font-medium transition-colors", active(l.href) ? "bg-bark-900/[0.06] text-bark-900 dark:bg-white/10 dark:text-white" : "text-bark-500 hover:text-bark-900 dark:text-bark-300 dark:hover:text-white")}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/report" className="hidden rounded-md bg-paw-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 sm:inline-flex">Report</Link>
          <Link href="/app" className="hidden text-[13px] font-medium text-bark-500 hover:text-paw-600 lg:inline-flex">Community app</Link>
          <button onClick={() => setOpen((v) => !v)} className="grid h-9 w-9 place-items-center rounded-md text-bark-600 hover:bg-black/[0.04] md:hidden" aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-black/[0.06] px-4 pb-3 pt-1 md:hidden dark:border-white/10">
          {[...LINKS, { label: "Report", href: "/report" }, { label: "Community app", href: "/app" }].map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={cn("block rounded-md px-3 py-2.5 text-[15px] font-medium", active(l.href) ? "bg-bark-900/[0.06] text-bark-900 dark:bg-white/10 dark:text-white" : "text-bark-600 dark:text-bark-300")}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

/** Page wrapper for platform pages. */
export function PlatformShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh bg-paper text-bark-900 dark:bg-ink dark:text-bark-50">
      <PlatformNav />
      <main className={cn("mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6", className)}>{children}</main>
    </div>
  );
}
