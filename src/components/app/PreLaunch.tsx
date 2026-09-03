import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

/**
 * Used by the surfaces that will hold real operational records — studies,
 * interventions, outcomes — none of which exist yet because no study has
 * been commissioned.
 *
 * These pages deliberately show nothing rather than sample records. A funder
 * looking at an outcome register needs to trust that every row in it happened;
 * seeding it with plausible examples destroys exactly the property the page
 * exists to have.
 */
export function PreLaunch({
  Icon,
  what,
  fills,
  cta = { href: "/partner-apply", label: "Fund the first study" },
}: {
  Icon: LucideIcon;
  /** Plain-language name of the record type, e.g. "outcome records". */
  what: string;
  /** One sentence: what causes a row to appear here. */
  fills: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="spa-empty">
      <Icon size={40} strokeWidth={1.25} />
      <h2>No {what} yet</h2>
      <p>{fills}</p>
      <p className="prelaunch-note">
        This register is empty because nothing has happened in it — not because
        the data has not loaded. Every row here will be a real record.
      </p>
      <Link href={cta.href} className="spa-cta">
        {cta.label} <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}
