import Link from "next/link";
import { getOperationalPartners } from "@/lib/partners";

const STATUS_LABEL: Record<string, string> = {
  operational_partner: "Operational partner",
  pilot_partner: "Pilot partner",
};

/* Social proof built only from what is already true and checkable: the
   organisation's own name, where it works, what it works on, and the status
   of the relationship. Every field comes from the partner record.

   There are deliberately no quotations. A testimonial has to be said by a
   named person before it can be printed, and writing a plausible one for an
   organisation that has not said it would be inventing evidence on the page
   that exists to prove the product does not. The slot for a real quote is
   rendered as an awaiting state so it is ready the day somebody supplies
   one, and reads as deliberate until then. */
export async function PartnerProof({
  heading = "Who is already on the record",
  awaitingQuote = false,
}: {
  heading?: string;
  awaitingQuote?: boolean;
}) {
  const partners = await getOperationalPartners();
  if (!partners.length) return null;

  return (
    <div className="proof">
      <p className="proof-kicker">{heading}</p>
      <ul className="proof-list">
        {partners.map((p) => (
          <li key={p.id}>
            <div className="proof-id">
              <Link href={`/org/${p.slug}`}>
                <b>{p.name}</b>
              </Link>
              {(p.city || p.state) && (
                <span className="proof-where">
                  {[p.city, p.state].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
            {p.mission && <p className="proof-mission">{p.mission}</p>}
            <div className="proof-meta">
              <span className="proof-status">
                {STATUS_LABEL[p.partnerStatus] ?? "Partner"}
              </span>
              {p.areas.slice(0, 4).map((a) => (
                <span key={a} className="proof-area">
                  {a}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {awaitingQuote && (
        <div className="mk-awaiting">
          <b>Awaiting content</b>
          <strong>A partner&apos;s own words</strong>
          <span>
            Two lines from a named person at a partner organisation, with their
            role, about what changed for their team. Supplied by them and
            printed as said. Nothing is drafted on their behalf, so this stays
            empty until somebody has actually said it.
          </span>
        </div>
      )}
    </div>
  );
}
