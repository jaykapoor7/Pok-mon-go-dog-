"use client";

import { usePathname } from "next/navigation";
import { FloatingTopBar } from "./FloatingTopBar";
import { BottomNav } from "./BottomNav";

// Routes that render WITHOUT the app shell (top bar + nav rail) — the public
// marketing landing gets its own full-bleed chrome and CTA.
const BARE_ROUTES = new Set<string>(["/", "/what-we-do", "/journey"]);

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (BARE_ROUTES.has(pathname)) return <>{children}</>;

  return (
    <>
      <FloatingTopBar />
      <main className="lg:pl-60">{children}</main>
      <BottomNav />
    </>
  );
}
