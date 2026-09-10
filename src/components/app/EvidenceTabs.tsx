"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const VIEWS = [
  { href: "/evidence", label: "Coverage" },
  { href: "/studies", label: "Published studies" },
  { href: "/interventions", label: "Interventions" },
];

export function EvidenceTabs() {
  const pathname = usePathname();
  return <nav className="evidence-tabs" aria-label="Evidence views">
    {VIEWS.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
  </nav>;
}
