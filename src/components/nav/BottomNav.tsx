"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Map as MapIcon, HandHelping, Plus, HeartHandshake } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

// Route keys stay stable (/report was "spot", /dashboard was "ngo") — only the
// display labels changed, so deep links and any future analytics keep working.
type Item = {
  key: string;
  href: string;
  label: string;
  icon: typeof MapIcon;
  gated?: boolean;
};

const ITEMS: Item[] = [
  { key: "map", href: "/", label: "Map", icon: MapIcon },
  { key: "help", href: "/help", label: "Help", icon: HandHelping },
  { key: "report", href: "/report", label: "Report", icon: Plus, gated: true },
  { key: "partners", href: "/dashboard", label: "Partners", icon: HeartHandshake },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Responsive primary navigation:
 *  • Mobile — a cream bar anchored to the bottom edge. Active item shows an
 *    olive top-marker tick + olive icon/label (no filled pill). "Report" is a
 *    raised circular olive button breaking the top edge.
 *  • Desktop — a left sidebar rail with an olive active marker on the left edge.
 */
export function BottomNav() {
  return (
    <>
      <MobileBar />
      <DesktopRail />
    </>
  );
}

function MobileBar() {
  const isActive = useActive();
  const router = useRouter();
  const { requireAuth } = useAuth();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.07] bg-paper/95 backdrop-blur-xl pb-[max(0.25rem,env(safe-area-inset-bottom))] dark:border-white/10 dark:bg-ink/95 lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          if (item.key === "report") {
            // Raised circular primary action, breaking the top edge.
            return (
              <li key={item.key} className="relative flex flex-1 justify-center">
                <button
                  onClick={() => requireAuth(() => router.push(item.href))}
                  aria-label="Report a sighting"
                  aria-current={active ? "page" : undefined}
                  className="absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-paw-500 text-white shadow-pop ring-4 ring-paper transition-transform active:scale-95 dark:ring-ink"
                >
                  <Plus className="h-7 w-7" />
                </button>
                <span className="mt-[2.6rem] text-[11px] font-semibold text-paw-600">
                  {item.label}
                </span>
              </li>
            );
          }

          return (
            <li key={item.key} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[11px] font-semibold transition-colors",
                  active ? "text-paw-600" : "text-bark-500 dark:text-bark-400"
                )}
              >
                {/* olive top-marker tick */}
                <span
                  className={cn(
                    "absolute top-0 h-0.5 w-7 rounded-full transition-colors",
                    active ? "bg-paw-500" : "bg-transparent"
                  )}
                />
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function DesktopRail() {
  const isActive = useActive();
  const router = useRouter();
  const { requireAuth } = useAuth();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col items-center border-r border-black/[0.07] bg-paper/95 py-6 backdrop-blur-xl dark:border-white/10 dark:bg-ink/95 lg:flex"
    >
      <Link href="/" aria-label="StrayPaw home" className="mb-8">
        <img src="/logo.png" alt="StrayPaw" className="h-11 w-auto" />
      </Link>

      <ul className="flex flex-1 flex-col items-center gap-1">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const inner = (
            <>
              <span
                className={cn(
                  "absolute left-0 h-7 w-0.5 rounded-full transition-colors",
                  active ? "bg-paw-500" : "bg-transparent"
                )}
              />
              {item.key === "report" ? (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-paw-500 text-white shadow-warm">
                  <Plus className="h-5 w-5" />
                </span>
              ) : (
                <Icon className="h-5 w-5" />
              )}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </>
          );

          const cls = cn(
            "relative flex min-h-[44px] w-16 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors",
            active ? "text-paw-600" : "text-bark-500 hover:text-paw-600 dark:text-bark-400"
          );

          return (
            <li key={item.key} className="w-full">
              {item.gated ? (
                <button
                  onClick={() => requireAuth(() => router.push(item.href))}
                  aria-current={active ? "page" : undefined}
                  aria-label="Report a sighting"
                  className={cn(cls, "mx-auto")}
                >
                  {inner}
                </button>
              ) : (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(cls, "mx-auto")}
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
