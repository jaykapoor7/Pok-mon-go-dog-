"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/partner/animals", label: "Animals" },
  { href: "/partner/cases", label: "Cases" },
  { href: "/partner/medical", label: "Care history" },
];

/** The registry has three lenses, not three unrelated destinations. */
export function RecordsTabs() {
  const pathname = usePathname();
  return (
    <nav className="partner-record-tabs" aria-label="Record views">
      {TABS.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
    </nav>
  );
}
