import Link from "next/link";
import { Band, NextLinks, PageHead, S4Page, Steps, TwoTone } from "@/sp4/site/kit";
import "@/sp4/home/home4.css";

export const metadata = {
  title: "Data governance, StrayPaw",
  description:
    "What StrayPaw collects, what stays private, how long it is kept, and how to have something removed. Written in plain language against the DPDP Act, 2023.",
};

/* Institutional buyers ask for this before they ask about features, and a
   resident deserves it without having to ask at all. It describes what the
   product actually does today; anything not yet true is not listed here. */
export default function DataGovernancePage() {
  return (
    <S4Page close={false}>
      <PageHead back
        title={<TwoTone a="What we hold," b="and what we don't." />}
        lede="StrayPaw is a public record of animals, not of people. This page says plainly what is collected, what is never published, how long it is kept and how to have something taken down. It is written against the Digital Personal Data Protection Act, 2023."
      />

      <Band title={<TwoTone a="The animal is public." b="The person is not." />}>
        <Steps
          items={[
            { t: "Published", d: "The animal's record: photographs of the animal, an approximate locality, the case history, care given and the outcome. This is the point of the register." },
            { t: "Approximate by design", d: "Locations are shown at locality precision, not as an exact pin, and structured data carries the locality only. A precise, machine-readable location for a living animal is not published." },
            { t: "Never published", d: "Reporter names and email addresses, account identifiers, and an organisation's internal operational detail such as staff pay, rent or raw source workbooks. These are readable only by the service itself, enforced in the database rather than only in the interface." },
            { t: "Not collected at all", d: "No advertising identifiers, no cross-site tracking, no third-party analytics tags. Product counts are first-party, carry no personal data, and honour Do Not Track." },
          ]}
        />
      </Band>

      <Band title={<TwoTone a="A street photograph" b="can contain a person." />}>
        <div className="s4-prose">
          <p>
            A sighting photograph is taken in public and can include people who
            never chose to be on a public map. The report flow offers redaction
            before anything is published, so identifiable people can be obscured
            at the point of upload rather than after the fact, and the reporter
            is told in plain words that the photograph becomes part of a public
            record.
          </p>
        </div>
      </Band>

      <Band title={<TwoTone a="A record is kept." b="A person can leave." />}>
        <Steps
          items={[
            { t: "Animal records persist", d: "The register's value is continuity: an animal's history has to outlast the people who recorded it, and corrections are appended rather than overwritten so the history stays auditable." },
            { t: "Your own report", d: "The device that filed a sighting holds a token that lets it withdraw that sighting." },
            { t: "Removal requests", d: "Anyone can ask for a photograph or a record to be reviewed and taken down, including a person who appears in a photograph they did not consent to. Requests go through the report-content route and are reviewed by the StrayPaw team." },
            { t: "Accounts", d: "An account can be closed on request; the animal records it contributed remain, because they describe animals rather than the person who filed them." },
          ]}
        />
        <div className="s4-prose">
          <p>
            For a takedown, use <Link href="/report-content">report content</Link>.
            For anything else, including procurement and compliance review,{" "}
            <Link href="/contact?subject=Data%20governance%20question">contact us</Link>.
          </p>
        </div>
      </Band>

      <NextLinks
        items={[
          { label: "Read the privacy policy", href: "/privacy", note: "The formal version of this page." },
          { label: "Ask for a removal", href: "/report-content", note: "Flag a photo or record for review." },
          { label: "Talk to us", href: "/contact?subject=Data%20governance%20question", note: "For procurement and compliance questions." },
        ]}
      />
    </S4Page>
  );
}
