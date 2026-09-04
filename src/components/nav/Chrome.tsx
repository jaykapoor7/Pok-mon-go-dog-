"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";

/**
 * Marketing and auth pages render their own full-bleed chrome.
 */
const OWN_CHROME = new Set<string>([
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/safety",
  "/report-content",
  "/community-guidelines",
  "/cookies",
  "/contact",
  "/partner-apply",
  "/what-we-do",
  "/journey",
  "/partnerships",
  "/reset-password",
  // Explainer pages behind the header nav — they render SiteHeader themselves.
  "/why-straypaw",
  "/the-network",
  "/for-funders",
  "/for-ngos",
  "/the-data",
]);

/**
 * Pages that already mount AppShell themselves — directly, or through
 * PlatformShell / the partner layout. Wrapping them again would nest the
 * console inside itself.
 */
const SELF_SHELLED = new Set<string>([
  "/app",
  "/map",
  "/studies",
  "/outcomes",
  "/gaps",
  "/needs",
  "/interventions",
  "/what-would-it-take",
  "/following",
  "/explore",
  "/insights",
  "/research",
  "/take-action",
  "/resources",
  "/learn",
  "/get-involved",
]);

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (OWN_CHROME.has(pathname)) return <>{children}</>;
  if (SELF_SHELLED.has(pathname) || pathname.startsWith("/partner")) {
    return <>{children}</>;
  }

  // Everything else is an app surface: one console, one shell.
  return <AppShell>{children}</AppShell>;
}
