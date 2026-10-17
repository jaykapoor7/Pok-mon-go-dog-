/* ════════════════════════════════════════════════════════════════════
   Education · Resources: know where to turn. Helplines and after-a-bite
   steps as StrayPaw already publishes them, the education partners named
   with their own descriptions, and three printable cards drawn from the
   Academy's takeaways.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ExternalLink, Phone } from "lucide-react";
import { EDUCATION_PARTNERS } from "@/lib/platform/education";
import { COURSES, HELPLINES, POST_BITE_STEPS } from "./content";
import { PrintButton } from "./PrintButton";
import { Directory } from "./Directory";
import "./learn.css";

const CARDS = [["on-the-street", "a-calm-encounter"], ["on-the-street", "after-a-bite"], ["on-the-street", "observe-dont-assume"]].map(([c, l]) => COURSES.find((x) => x.id === c)!.lessons.find((x) => x.id === l)!);

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
      <section className="ws-sec" id="directory">
        <h2 className="h2">Animal-welfare organisations across India <small className="small">a directory, not an endorsement; StrayPaw partners are under <Link className="link" href="/community/organisations">Organisations</Link></small></h2>
        <Directory />
      </section>
      <section className="ws-sec">
        <h2 className="h2">Education partners</h2>
        <ul className="rs-partners">{EDUCATION_PARTNERS.map((p) => <li key={p.id}><p className="k">{p.city}</p><h3 className="serif">{p.fullName}</h3><p>{p.summary}</p><ul>{p.programmes.map((x) => <li key={x}>{x}</li>)}</ul><a className="link" href={p.url} target="_blank" rel="noreferrer">{p.source} <ExternalLink size={12} aria-hidden /></a></li>)}</ul>
        <p className="small">Descriptions are each organisation&rsquo;s own account of its work. Naming them here is not a claim of partnership beyond the material they shared.</p>
      </section>
      <section className="ws-sec">
        <div className="rs-cards-head"><h2 className="h2">Cards to print</h2><div className="no-print"><PrintButton label="Print the cards" /></div></div>
        <div className="rs-cards">{CARDS.map((l) => <article key={l.id} className="rs-card"><p className="k">StrayPaw Academy</p><h3 className="serif">{l.title}</h3><p>{l.takeaway}</p></article>)}</div>
      </section>
    </div>
  );
}
