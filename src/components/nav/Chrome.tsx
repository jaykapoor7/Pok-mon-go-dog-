"use client";

import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";

/**
 * Marketing and auth pages render their own full-bleed chrome.
 */
const OWN_CHROME = new Set<string>([
  "/",
  "/about",
  // This is a server redirect to the organisation directory. Rendering the
  // client console around an empty redirect boundary caused a hydration
  // warning on phones before the redirect completed.
  "/adopt",
  "/privacy",
  "/terms",
  "/safety",
  "/report-content",
  "/community-guidelines",
  "/cookies",
  "/contact",
  "/partner-apply",
  "/partnerships",
  "/reset-password",
  // Someone arriving with a code needs the code box, not the console
  // around it and not the role picker in front of it.
  "/join",
  "/access",
  // Moderation is its own console. Wrapping it in the app's console put a
  // sidebar, a search bar and a role picker around a sidebar, which is
  // where most of the confusion on this page came from.
  "/moderate",
  "/admin",
  // Explainer pages behind the header nav, they render SiteHeader themselves.
  "/the-network",
  "/for-funders",
  "/for-ngos",
  "/for-governments",
  "/about",
  "/data-governance",
  "/how-to-help",
  "/research-standards",
  // Everything reachable from the site header is a page, not a screen of
  // the app. Clicking "Evidence" in the header used to drop you inside the
  // console — sidebar, rail, role picker and all — with no way back to the
  // site. These render SiteHeader and the site footer themselves, through
  // SitePage.
  "/evidence",
  "/explore",
  "/education",
  "/get-involved",
]);

/**
 * Pages that already mount AppShell themselves, directly, or through
 * PlatformShell / the partner layout. Wrapping them again would nest the
 * console inside itself.
 */
const SELF_SHELLED = new Set<string>([
  "/app",
  "/map",
  "/studies",
  "/outcomes",
  "/interventions",
  "/following",
  "/insights",
  "/resources",
  "/learn",
  "/stories",
  "/orgs",
]);

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();
  // Marketing and profile routes have their own main landmark.
  // ISR can render the root through an internal pathname. The route tree
  // identifies the landing page consistently during regeneration and in the
  // browser, so its server HTML never acquires the application console.
  const own = segments.length === 0 || OWN_CHROME.has(pathname) || pathname.startsWith("/org/") || pathname.startsWith("/dog/");
  if (own) return <><a href="#main-content" className="skip-link">Skip to content</a><div id="main-content" tabIndex={-1}>{children}</div></>;

  if (pathname.startsWith("/embed/") || pathname.startsWith("/org/")) return <>{children}</>;
  if (OWN_CHROME.has(pathname)) return <>{children}</>;
  if (SELF_SHELLED.has(pathname) || pathname.startsWith("/partner")) {
    return <>{children}</>;
  }

  // Everything else is an app surface: one console, one shell.
  return <AppShell>{children}</AppShell>;
}
