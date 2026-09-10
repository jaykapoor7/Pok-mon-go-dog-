"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/partner/field", label: "Today" },
  { href: "/partner/incoming", label: "Incoming" },
  { href: "/partner/drives", label: "Programme drives" },
  { href: "/partner/reports", label: "Coverage" },
];

/** Field work has related operational lenses, not four unrelated pages. */
export function FieldTabs() {
  const pathname = usePathname();
  return (
    <nav className="partner-workspace-tabs" aria-label="Field work views">
      {TABS.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
    </nav>
  );
}
