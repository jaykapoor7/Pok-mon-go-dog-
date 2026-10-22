/* Practice-report feedback, original classroom documents, rescue contacts
   and education organisations. Practice never submits a real report. */

import Link from "next/link";
import { ArrowUpRight, ExternalLink, Phone } from "lucide-react";
import { EDUCATION_PARTNERS } from "@/lib/platform/education";
import { HELPLINES, POST_BITE_STEPS } from "./content";
import { ReportPractice } from "./ReportPractice";
import { MobileDetails } from "../ui/MobileDetails";
import { Directory } from "./Directory";
import "./learn.css";
import "./academy.css";

export function Resources() {
  return (
    <div className="ac">
      <header className="ac-cover is-slim">
        <div className="ac-title">
          <p className="k">Education · resources</p>
          <h1 className="display">Know where to turn</h1>
          <p className="lede">Who to call, what to do after a bite, and who teaches this well.</p>
        </div>
      </header>
      <ReportPractice />
      <Link href="/learn#kind-hour" className="rs-kh">
        <span><b>Classroom documents</b><small>Five teaching decks by The Kind Hour Foundation, in the Academy</small></span>
        <ArrowUpRight size={18} aria-hidden />
      </Link>
      <div className="rs-grid">
        <section className="rs-sec" id="helplines" aria-labelledby="rs-h">
          <h2 id="rs-h" className="h2">Rescue helplines</h2>
          <p className="small">Established rescue organisations, not StrayPaw lines. For an injured, trapped or distressed animal.</p>
          <ul className="rs-lines">{HELPLINES.map((h) => <li key={h.name}><a href={`tel:${h.number.replace(/[^0-9+]/g, "")}`}><Phone size={15} aria-hidden /><span><b>{h.name}</b><small>{h.note}</small></span><span className="mono">{h.number}</span></a></li>)}</ul>
          <p className="small">Or <Link className="link" href="/community/report">report the animal on StrayPaw</Link>; you will see whether an organisation takes it.</p>
        </section>
        <section className="rs-sec rs-bite" id="after-a-bite" aria-labelledby="rb-h">
          <h2 id="rb-h" className="h2">After a bite or scratch</h2>
          <ol className="rs-steps">{POST_BITE_STEPS.map((s, i) => <li key={i}><span className="mono">{i + 1}</span>{s}</li>)}</ol>
          <p className="small">Not medical advice: a doctor decides the schedule. <Link className="link" href="/learn/courses/on-the-street/after-a-bite">The lesson</Link></p>
        </section>
      </div>
      <MobileDetails label="Find an animal-welfare organisation" className="resources-fold"><section className="ws-sec" id="directory">
        <h2 className="h2">Animal-welfare organisations across India <small className="small">a directory, not an endorsement; StrayPaw partners are under <Link className="link" href="/community/organisations">Organisations</Link></small></h2>
        <Directory />
      </section></MobileDetails>
      <MobileDetails label="Education organisations" className="resources-fold"><section className="ws-sec">
        <h2 className="h2">Education partners</h2>
        <ul className="rs-partners">{EDUCATION_PARTNERS.map((p) => <li key={p.id}><p className="k">{p.city}</p><h3 className="serif">{p.fullName}</h3><p>{p.summary}</p><ul>{p.programmes.map((x) => <li key={x}>{x}</li>)}</ul><a className="link" href={p.url} target="_blank" rel="noreferrer">{p.source} <ExternalLink size={12} aria-hidden /></a></li>)}</ul>
        <p className="small">Descriptions are each organisation&rsquo;s own account of its work. Naming them here is not a claim of partnership beyond the material they shared.</p>
      </section></MobileDetails>
    </div>
  );
}
