"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Map as MapIcon,
  HandHelping,
  Plus,
  HeartHandshake,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { INFO } from "./MenuDrawer";
import { SocialLinks } from "./SocialLinks";
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
  { key: "today", href: "/", label: "Today", icon: Home },
  { key: "map", href: "/map", label: "Map", icon: MapIcon },
  { key: "report", href: "/report", label: "Report", icon: Plus, gated: true },
  { key: "help", href: "/help", label: "Help", icon: HandHelping },
  { key: "partners", href: "/dashboard", label: "Partners", icon: HeartHandshake },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

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

// Wide, labeled desktop sidebar: brand on top, full nav with labels, info
// links + credit at the bottom. Search and account live in the top bar (the
// same concept as the phone), so the rail stays focused on navigation.
function DesktopRail() {
  const isActive = useActive();
  const router = useRouter();
  const { requireAuth } = useAuth();

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-black/[0.07] bg-paper/95 px-4 py-6 backdrop-blur-xl dark:border-white/10 dark:bg-ink/95 lg:flex"
      >
        <Link href="/" aria-label="StrayPaw home" className="mb-7 block px-2">
          <img src="/logo.png" alt="StrayPaw" className="h-14 w-auto" />
          <p className="mt-1.5 text-[11px] font-medium leading-tight text-bark-400">
            Open-sourcing stray-dog care · for the people, by the people
          </p>
        </Link>

        <ul className="flex flex-col gap-1">
          {ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            const inner = (
              <>
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full transition-colors",
                    active ? "bg-paw-500" : "bg-transparent"
                  )}
                />
                {item.key === "report" ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-paw-500 text-white shadow-warm">
                    <Plus className="h-5 w-5" />
                  </span>
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span className="text-[15px]">{item.label}</span>
              </>
            );

            const cls = cn(
              "relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 font-semibold transition-colors",
              active
                ? "bg-paw-100 text-paw-700 dark:bg-bark-800 dark:text-paw-300"
                : "text-bark-600 hover:bg-black/[0.04] dark:text-bark-300 dark:hover:bg-white/[0.05]"
            );

            return (
              <li key={item.key}>
                {item.gated ? (
                  <button
                    onClick={() => requireAuth(() => router.push(item.href))}
                    aria-current={active ? "page" : undefined}
                    className={cls}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={cls}>
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {/* info links — fill the space */}
        <nav aria-label="More" className="mt-5 border-t border-black/[0.06] pt-4 dark:border-white/10">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-bark-400">
            More
          </p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {INFO.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block truncate text-xs text-bark-500 transition-colors hover:text-paw-600 dark:text-bark-400"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* contact pinned to the bottom */}
        <div className="mt-auto pt-4">
          <SocialLinks className="px-1" />
        </div>
      </nav>
    </>
  );
}
