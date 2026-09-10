"use client";

import Link from "next/link";
import {
  CalendarRange,
  Database,
  Inbox,
  MapPin,
  Radio,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   The five things an organisation actually opens StrayPaw to do.

   The sidebar holds everything; this holds what gets used. It sits on the
   dashboard under the programme totals, so the home page answers "how are
   we doing" and "what now" in that order, and nobody has to read a column
   of twenty links to find the one they came for.
   ════════════════════════════════════════════════════════════════════ */

const ACTIONS = [
  {
    href: "/partner/incoming",
    Icon: Inbox,
    title: "Review incoming reports",
    note: "Community and volunteer observations waiting for a decision.",
  },
  {
    href: "/partner/drives",
    Icon: CalendarRange,
    title: "Check a drive",
    note: "See sterilisation and rabies coverage for each round or camp.",
  },
  {
    href: "/report",
    Icon: Radio,
    title: "Add a sighting",
    note: "A photo and location are enough. Add status only when you know it.",
  },
  {
    href: "/partner/animals",
    Icon: Database,
    title: "Search the register",
    note: "Find an animal by ID, area, sterilisation or vaccination status.",
  },
  {
    href: "/partner/field",
    Icon: MapPin,
    title: "Plan field work",
    note: "See what is outstanding and where the team needs to go next.",
  },
];

export function QuickActions() {
  return (
    <section className="qa" aria-label="Quick actions">
      <h2>Start here</h2>
      <div className="qa-grid">
        {ACTIONS.filter(action => ["/partner/incoming", "/report", "/partner/animals"].includes(action.href)).map(({ href, Icon, title, note }) => (
          <Link key={href} href={href} className="qa-card">
            <Icon size={18} strokeWidth={1.5} />
            <b>{title}</b>
            <span>{note}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
