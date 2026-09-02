"use client";

import { usePathname } from "next/navigation";
import { FloatingTopBar } from "./FloatingTopBar";
import { BottomNav } from "./BottomNav";
import { BackToApp } from "./BackToApp";

// Routes that render WITHOUT the app shell (top bar + nav rail), the public
// marketing landing gets its own full-bleed chrome and CTA.
const BARE_ROUTES = new Set<string>([
  "/", "/what-we-do", "/journey", "/partnerships", "/contact", "/partner-apply",
  "/explore", "/insights", "/research", "/take-action",
  "/resources", "/learn", "/get-involved", "/orgs",
  "/about", "/privacy", "/terms", "/safety", "/report-content",
  "/map",
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
