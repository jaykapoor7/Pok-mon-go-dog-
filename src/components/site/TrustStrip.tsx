import Link from "next/link";
import { ORGS } from "@/lib/platform/orgs";
import { getOperationalPartners } from "@/lib/partners";

/* The strip directly under the hero.

   Every figure is derived, never typed: the organisation and state counts
   are computed from the directory itself, so they cannot drift out of date
   the way a hardcoded "40 organisations" would, and the animal count is the
   register's own. The named partner sits beside them deliberately -- a
   reader trusts one organisation they can look up more than three numbers
   they cannot. */
export async function TrustStrip({ total }: { total: number }) {
  const partners = await getOperationalPartners();
  const states = new Set(ORGS.map((o) => o.stateCode)).size;
  const lead = partners[0];

  /* A count of zero means the register is unreachable or genuinely empty,
     and "0 animals on the record" in a strip whose job is to earn trust
     does the opposite. Drop the figure rather than print it; the directory
     counts stand on their own and are true either way. */
  const figures = [
    ...(total > 0
      ? [{ value: total.toLocaleString("en-IN"), label: "animals on the record" }]
      : []),
    { value: ORGS.length.toLocaleString("en-IN"), label: "organisations listed" },
    { value: String(states), label: "states and territories" },
  ];

  return (
    <section className="trust-strip" aria-label="StrayPaw in numbers">
      <dl className="trust-figures">
        {figures.map((f) => (
          <div key={f.label}>
            <dt>{f.value}</dt>
            <dd>{f.label}</dd>
          </div>
        ))}
      </dl>

      {lead && (
        <p className="trust-partner">
          <span>Built with</span>
          <Link href="/partners">
            <b>{lead.name}</b>
            {lead.city ? `, ${lead.city}` : ""}
          </Link>
        </p>
      )}

      <p className="trust-source">
        Counts are read from the register and the{" "}
        <Link href="/orgs">public directory</Link>, each entry naming its own
        source. What the register cannot yet answer is listed on{" "}
        <Link href="/gaps">what is known</Link>.
      </p>
    </section>
  );
}
