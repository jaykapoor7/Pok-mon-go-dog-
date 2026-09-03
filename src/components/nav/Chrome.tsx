"use client";

import { usePathname } from "next/navigation";
import { FloatingTopBar } from "./FloatingTopBar";
import { BottomNav } from "./BottomNav";
import { BackToApp } from "./BackToApp";

// Routes that render WITHOUT the legacy consumer shell. Two groups live here:
// the marketing site (its own full-bleed chrome) and the console routes, which
// carry AppShell — their own sidebar and top bar.
const BARE_ROUTES = new Set<string>([
  // marketing
  "/", "/what-we-do", "/journey", "/partnerships", "/contact", "/partner-apply",
  "/about", "/privacy", "/terms", "/safety", "/report-content",
  // console (AppShell)
  "/app", "/map", "/studies", "/outcomes",
  // platform pages, pending console adoption
  "/explore", "/insights", "/research", "/take-action",
  "/resources", "/learn", "/get-involved", "/orgs",
]);

// Focused flows: keep the top bar but hide the bottom nav so it doesn't collide
// with the wizard controls / detail actions.
const NO_BOTTOM_NAV = ["/report", "/dog/", "/reset-password"];

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Bare = no consumer shell: the marketing pages and the Partner OS (which
  // renders its own operational rail via src/app/partner/layout.tsx).
  if (BARE_ROUTES.has(pathname) || pathname.startsWith("/partner")) return <>{children}</>;

  const hideBottomNav = NO_BOTTOM_NAV.some((p) => pathname.startsWith(p));

  return (
    <>
      <BackToApp />
      <FloatingTopBar />
      <main className="lg:pl-60">{children}</main>
      {!hideBottomNav && <BottomNav />}
    </>
  );
}
