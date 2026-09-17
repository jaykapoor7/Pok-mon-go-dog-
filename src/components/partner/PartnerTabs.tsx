"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      { href: "/partner/medical", label: "Medical" },
      { href: "/partner/records", label: "Explorer" },
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
      { href: "/partner/incoming", label: "Incoming" },
      { href: "/partner/drives", label: "Drives" },
      { href: "/partner/operations", label: "Operations" },
      { href: "/partner/feeding", label: "Feeding zones" },
      { href: "/partner/surveys", label: "Surveys" },
      { href: "/partner/reports", label: "Coverage" },
    ],
  },
  {
    id: "org",
    label: "Organisation",
    root: "/partner/team",
    tabs: [
      { href: "/partner/team", label: "Team" },
      { href: "/partner/volunteers", label: "Volunteers" },
      { href: "/partner/fundraising", label: "Fundraising" },
      { href: "/partner/stories", label: "Stories" },
      { href: "/partner/resources", label: "Evidence files" },
      { href: "/partner/settings", label: "Settings" },
    ],
  },
];

export function groupFor(pathname: string) {
  return CONSOLE_GROUPS.find((g) => g.tabs.some((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))) ?? null;
}

export function PartnerTabs() {
  const pathname = usePathname();
  const group = groupFor(pathname);
  if (!group) return null;
  return <nav className="partner-workspace-tabs" aria-label={`${group.label} views`}>
    {group.tabs.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}>{label}</Link>)}
  </nav>;
}
