import { MarketingPage, Band, Steps } from "@/components/marketing/MarketingPage";
import { LoopFigure } from "@/components/marketing/figures";
import { PartnerProof } from "@/components/marketing/PartnerProof";

export const metadata = {
  title: "For municipal bodies, coverage you can audit",
  description:
    "Ward-level sterilisation and vaccination coverage, auditable case histories and public evidence pages for municipal ABC programmes under the Animal Birth Control Rules, 2023.",
};

/* The municipal buyer had nowhere to land: /for-ngos speaks to field teams
   and assumes the reader already runs rescues. A commissioner arrives with a
   different question, which is not "what can your product do" but "what will
   I be able to show an auditor". Every figure below is the register's own or
   carries the source it came from, because the one thing that loses this
   reader is a number they cannot trace. */
export default function ForGovernmentsPage() {
  return (
    <MarketingPage
      title="Coverage you can audit."
      accent="Ward by ward."
      lede="The Animal Birth Control Rules, 2023 place the duty to sterilise and vaccinate community dogs on the local body. The hard part is rarely the surgery. It is proving, a year later and to somebody who was not there, which roads were covered, which animals were handled, and what it cost."
      figure={<LoopFigure />}
      next={[
        { label: "Request a pilot", href: "/contact?subject=Request%20a%20municipal%20pilot", note: "One ward, one quarter, with the coverage record handed back to you." },
        { label: "See the evidence pages", href: "/evidence", note: "The public figures, each one naming the department that holds it." },
        { label: "Why this exists", href: "/evidence", note: "What is published, and what is missing." },
      ]}
    >
      <Band tone="paper" title="A record that survives" accent="the people who made it.">
        <Steps
          items={[
            { n: "01", title: "Ward coverage maps", body: "Which roads a drive actually reached, drawn on ward geometry rather than asserted in a summary. Wards with no survey are drawn as unexamined, never as zero." },
            { n: "02", title: "Progress against the WHO target", body: "Sterilisation and vaccination coverage tracked against the 70% threshold the WHO identifies for breaking dog-mediated rabies transmission, with the shortfall stated in animals, not percentages alone." },
            { n: "03", title: "Auditable case histories", body: "Every animal carries one permanent identity: who reported it, when it was caught, what was done, by whom, and what happened after release. Your own file numbers are kept alongside, not replaced." },
            { n: "04", title: "Public evidence pages", body: "A citable page per figure, showing the source and the date. What you can defend in a council meeting is the same thing a resident can read." },
          ]}
        />
      </Band>

      <Band tone="bone" title="How the register" accent="is maintained.">
        <Steps
          items={[
            { n: "01", title: "One animal, one identity", body: "Records are never merged on proximity or resemblance. Two reports become one animal when a field team confirms it, and the sighting trail keeps both observations visible." },
            { n: "02", title: "Provenance on every row", body: "Each record states where it came from: a resident report, a field intake, or a historical workbook import. Imported rows are dated by the event, and badged as historical." },
            { n: "03", title: "Absence is recorded", body: "A ward with no data is reported as not examined. It is never counted as zero coverage, because the two mean opposite things to anybody planning a drive." },
            { n: "04", title: "Nothing is deleted", body: "Corrections are appended, not overwritten. The history of a record is part of the record, which is what makes it an audit trail rather than a dashboard." },
          ]}
        />
      </Band>

      <Band tone="paper" title="Built against" accent="real field records.">
        <p className="mk-body">
          The register was built with The Pawsome People Project in Coimbatore, Tamil
          Nadu. Their rescue, treatment, sterilisation and follow-up records were moved
          into it with their own source identifiers kept.
        </p>
        <PartnerProof heading="Organisations on the record" />
      </Band>
    </MarketingPage>
  );
}
