/* Practice-report feedback, original classroom documents, rescue contacts
   and education organisations. Practice never submits a real report. */

import Link from "next/link";
import { ExternalLink, Phone } from "lucide-react";
import { EDUCATION_PARTNERS } from "@/lib/platform/education";
import { Head, Page, Panel, Row, Rows, Section, Split } from "@/ws/kit";
import { HELPLINES, POST_BITE_STEPS } from "./content";
import { ReportPractice } from "./ReportPractice";
import { Directory } from "./Directory";
import "./learn.css";

export function Resources() {
  return (
    <Page>
      <Head title="Resources" sum="Practise a report, find who to call, know what to do after a bite, and see who teaches this well." />
      <Split side={<>
        <div id="helplines" className="lrn-anchor">
          <Section title="Rescue helplines" note="Not StrayPaw lines.">
            <Panel><Rows>{HELPLINES.map((h) => <li key={h.name}><a className="k-row" href={`tel:${h.number.replace(/[^0-9+]/g, "")}`}><span className="k-row-i" aria-hidden><Phone size={14} /></span><span className="k-row-t"><b>{h.name}</b><small>{h.note}</small></span><span className="k-row-e">{h.number}</span></a></li>)}</Rows></Panel>
            <p className="lrn-fine">Established rescue organisations, for an injured, trapped or distressed animal. Or <Link className="lrn-link" href="/community/report">report the animal on StrayPaw</Link>; you will see whether an organisation takes it.</p>
          </Section>
        </div>
        <div id="after-a-bite" className="lrn-anchor">
          <Section title="After a bite or scratch">
            <ol className="lrn-steps">{POST_BITE_STEPS.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}</ol>
            <p className="lrn-fine">Not medical advice: a doctor decides the schedule. <Link className="lrn-link" href="/learn/courses/on-the-street/after-a-bite">The lesson</Link></p>
          </Section>
        </div>
      </>}>
        <ReportPractice />
        <Section title="Classroom documents">
          <Panel><Rows><Row href="/learn#kind-hour" title="Classroom documents" meta="Five teaching decks by The Kind Hour Foundation, in the Academy" /></Rows></Panel>
        </Section>
        <div id="directory" className="lrn-anchor">
          <Section fold="directory" open={false} title="Animal-welfare organisations across India" note="A directory, not an endorsement.">
            <p className="lrn-fine">StrayPaw partners are under <Link className="lrn-link" href="/community/organisations">Organisations</Link>.</p>
            <Directory />
          </Section>
        </div>
        <Section fold="partners" open={false} title="Education partners" count={EDUCATION_PARTNERS.length}>
          <ul className="lrn-partners">{EDUCATION_PARTNERS.map((p) => <li key={p.id}><b>{p.fullName}</b><small>{p.city}</small><p>{p.summary}</p><ul>{p.programmes.map((x) => <li key={x}>{x}</li>)}</ul><a className="lrn-link" href={p.url} target="_blank" rel="noreferrer">{p.source} <ExternalLink size={12} aria-hidden /></a></li>)}</ul>
          <p className="lrn-fine">Descriptions are each organisation&rsquo;s own account of its work. Naming them here is not a claim of partnership beyond the material they shared.</p>
        </Section>
      </Split>
    </Page>
  );
}
