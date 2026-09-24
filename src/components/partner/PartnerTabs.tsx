"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
 * Keep the console navigation about jobs, not tables. Secondary routes still
 * exist and can be linked contextually, but they do not deserve permanent
 * tabs just because the backend supports them.
 */
export const CONSOLE_GROUPS: {
  id: string;
  label: string;
  root: string;
  tabs: { href: string; label: string }[];
}[] = [
  {
    id: "records",
    label: "Records",
    root: "/partner/animals",
    tabs: [
      { href: "/partner/animals", label: "Animals" },
      { href: "/partner/cases", label: "Cases" },
      { href: "/partner/review", label: "Case review" },
      { href: "/partner/records", label: "Search records" },
      { href: "/partner/quality", label: "Data quality" },
      { href: "/partner/import", label: "Import" },
    ],
  },
  {
    id: "field",
    label: "Field work",
    root: "/partner/field",
    tabs: [
      { href: "/partner/field", label: "Today" },
      { href: "/partner/drives", label: "Drives" },
      { href: "/partner/projects", label: "Projects" },
      { href: "/partner/operations", label: "Operations" },
    ],
  },
  {
    id: "org",
    label: "Organisation",
    root: "/partner/team",
    tabs: [
      { href: "/partner/team", label: "Team" },
      { href: "/partner/volunteers", label: "Volunteers" },
      { href: "/partner/settings", label: "Settings" },
    ],
  },
];

export function groupFor(pathname: string) {
  /* Hidden secondary routes still belong to a workspace, so the shell can
     navigate back to the right root even when no permanent tab is shown. */
  const secondary: Record<string, string> = {
    "/partner/medical": "records",
    "/partner/incoming": "field",
    "/partner/feeding": "field",
    "/partner/surveys": "field",
    "/partner/fundraising": "org",
    "/partner/stories": "org",
    "/partner/resources": "org",
  };
  const direct = CONSOLE_GROUPS.find((g) => g.tabs.some((t) => pathname === t.href || pathname.startsWith(`${t.href}/`)));
  if (direct) return direct;
  const id = Object.entries(secondary).find(([href]) => pathname === href || pathname.startsWith(`${href}/`))?.[1];
  return id ? CONSOLE_GROUPS.find((g) => g.id === id) ?? null : null;
}

export function PartnerTabs() {
  const pathname = usePathname();
  const group = groupFor(pathname);
  if (!group) return null;
  return <nav className="partner-workspace-tabs" aria-label={`${group.label} views`}>
    {group.tabs.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}>{label}</Link>)}
  </nav>;
}
