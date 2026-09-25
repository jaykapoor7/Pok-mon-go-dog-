import Link from "next/link";
import { MarketingPage, Band } from "@/components/marketing/MarketingPage";
import { getOperationalPartners } from "@/lib/partners";

export const metadata = {
  title: "About StrayPaw, the people and the entity",
  description:
    "Who runs StrayPaw, who advises it, and what kind of organisation it is. The register's own numbers are on the transparency page.",
};

export const dynamic = "force-dynamic";

/* /about answers "who are you", which is a different question from
   /mission's "why does this exist". It used to redirect there, which left
   the first question unanswered -- and it is the first thing a tender
   officer checks.

   The sections nobody but the founder can write are marked as awaiting
   content rather than filled with plausible stand-ins. An invented advisor
   or a guessed entity type on the page a procurement officer reads is worse
   than an honest gap. */
export default async function AboutPage() {
  const partners = await getOperationalPartners();

  return (
    <MarketingPage
      title="Who keeps"
      accent="the record."
      lede="StrayPaw is a shared record of India's street animals. It is built with the field teams who do the work, and it is accountable to the residents who report what they see. This page says who runs it and what kind of organisation it is."
      next={[
        { label: "The register, counted", href: "/insights", note: "Every figure counted from the live record." },
        { label: "Why this exists", href: "/mission", note: "The argument, not the org chart." },
        { label: "Work with us", href: "/contact?subject=About%20StrayPaw", note: "Partnerships, press and procurement." },
      ]}
    >
      <Band tone="paper" title="What StrayPaw" accent="legally is.">
        <p className="mk-body">
          Procurement officers check this before they read anything else, and
          donors check it before they give. It is stated here in one place
          rather than left to be inferred.
        </p>
        <div className="mk-awaiting">
          <b>Awaiting confirmation</b>
          <strong>Registered entity type and registration number</strong>
          <span>
            Section 8 company, registered society or trust, with the
            registration number and the registered state. Supplied by the
            founder once registration is confirmed; until then this page does
            not guess. Tax-exemption status (12A, 80G, CSR-1) belongs here too
            as each is granted.
          </span>
        </div>
      </Band>

      <Band tone="bone" title="Names and faces," accent="not a mission statement.">
        <p className="mk-body">
          A register asks people to trust it with what they see on their street.
          That is easier when the people keeping it are named.
        </p>
        <div className="mk-awaiting-grid">
          <div className="mk-awaiting">
            <b>Awaiting content</b>
            <strong>Team</strong>
            <span>
              One photograph, a name and a one-line role for each person
              working on StrayPaw. Roles as they are, not as they might look.
            </span>
          </div>
          <div className="mk-awaiting">
            <b>Awaiting content</b>
            <strong>Founder&apos;s account</strong>
            <span>
              Around 120 words in the founder&apos;s own voice: what was seen,
              and why a register rather than a rescue. Written by the founder,
              not drafted on their behalf.
            </span>
          </div>
          <div className="mk-awaiting">
            <b>Awaiting content</b>
            <strong>Advisors</strong>
            <span>
              A practising veterinarian and someone with animal-welfare policy
              or municipal governance experience, each named with their
              affiliation. Two names carry more weight here than ten.
            </span>
          </div>
          <div className="mk-awaiting">
            <b>Open role</b>
            <strong>Field Coordinator, Delhi</strong>
            <span>
              Details and an application route to be confirmed before this is
              advertised. Listed so the page is ready, not to imply hiring that
              has not opened.
            </span>
          </div>
        </div>
      </Band>

      <Band tone="paper" title="The teams" accent="doing the work.">
        {partners.length ? (
          <>
            <p className="mk-body">
              StrayPaw does not replace an organisation&apos;s field knowledge. It
              turns the work they choose to document into a record they control.
            </p>
            <ul className="mk-list">
              {partners.map((p) => (
                <li key={p.id}>
                  <b>{p.name}</b>
                  {p.city ? ` — ${p.city}${p.state ? `, ${p.state}` : ""}` : ""}
                  {p.mission ? `. ${p.mission}` : ""}
                </li>
              ))}
            </ul>
            <p className="mk-body">
              <Link href="/partners">All operational partners</Link> ·{" "}
              <Link href="/for-ngos">Bring your team&apos;s records in</Link>
            </p>
          </>
        ) : (
          <p className="mk-body">
            Partner organisations appear here as each one comes on to the
            register. <Link href="/for-ngos">Partnering is free for verified
            animal-welfare organisations</Link>.
          </p>
        )}
      </Band>

      <Band tone="bone" title="The short version" accent="of the long policy.">
        <p className="mk-body">
          The animal is public; the person is not. Reporter names and email
          addresses are never published, locations are shown at locality
          precision rather than as an exact pin, and no third-party tracking
          runs on this site. The full posture, including retention and how to
          have something removed, is on{" "}
          <Link href="/data-governance">data governance</Link>.
        </p>
      </Band>
    </MarketingPage>
  );
}
