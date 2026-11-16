"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./workspace.css";

/* Kaju's places, for screens where the sidebar is hidden (tablets and phones). Hidden on wide screens, where the
   sidebar lists the same places. */

const PLACES: [string, string][] = [["/kaju", "Ask Kaju"], ["/kaju/missions", "Missions"], ["/kaju/approvals", "Approvals"], ["/kaju/automations", "Automations"], ["/kaju/insights", "Insights"], ["/kaju/history", "History"], ["/kaju/rules", "Rules"]];

export function KajuPlaces() {
  const path = usePathname();
  const on = (href: string) => path === href || (href !== "/kaju" && path.startsWith(`${href}/`));
  return <nav className="kj-places" aria-label="Kaju">{PLACES.map(([href, label]) => <Link key={href} href={href} className={on(href) ? "is-on" : ""} aria-current={path === href ? "page" : undefined}>{label}</Link>)}</nav>;
}
