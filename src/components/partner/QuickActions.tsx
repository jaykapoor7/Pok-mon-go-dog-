"use client";

import Link from "next/link";
import {
  CalendarRange,
  Database,
  Inbox,
  FolderOpen,
  KeyRound,
  MapPin,
  Radio,
  Upload,
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
    title: "File what came in",
    note: "Volunteer reports and community sightings waiting to be put into a drive.",
  },
  {
    href: "/partner/drives",
    Icon: CalendarRange,
    title: "Drives and coverage",
    note: "Sterilisation and rabies rate for each census, round or camp you run.",
  },
  {
    href: "/report",
    Icon: Radio,
    title: "Record a sighting",
    note: "A photo and a location. Sterilisation and rabies status if you can see them.",
  },
  {
    href: "/partner/animals",
    Icon: Database,
    title: "Find an animal",
    note: "Search the register, filter by sterilisation, vaccination or zone.",
  },
  {
    href: "/partner/team",
    Icon: KeyRound,
    title: "Add someone to the team",
    note: "Name, email, role. They get a code and an email telling them what to do with it.",
  },
  {
    href: "/partner/field",
    Icon: MapPin,
    title: "Plan today's field work",
    note: "What is outstanding, and where it is.",
  },
  {
    href: "/partner/resources",
    Icon: FolderOpen,
    title: "Look up paperwork",
    note: "Scanned notes and records, attached to the animals they belong to.",
  },
  {
    href: "/partner/import",
    Icon: Upload,
    title: "Import existing records",
    note: "Bring a spreadsheet of animals you already track into the register.",
  },
];

export function QuickActions() {
  return (
    <section className="qa" aria-label="Quick actions">
      <h2>What now</h2>
      <div className="qa-grid">
        {ACTIONS.map(({ href, Icon, title, note }) => (
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
