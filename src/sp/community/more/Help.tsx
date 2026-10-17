/* ════════════════════════════════════════════════════════════════════
   Community · If an animal needs help: what to do now. Four steps in
   order, the report action, rescue helplines that are not StrayPaw's,
   the after-a-bite steps, and the animals the public record currently
   flags as needing help, by area. Reporting is honest about what
   happens next: received is not the same as accepted.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { Phone } from "lucide-react";
import type { Dog } from "@/lib/types";
import { animalTitle } from "@/lib/animal-name";
import { Portrait } from "../../ui/Portrait";
import { publicLocality } from "../../ui/place";
import { HELPLINES, POST_BITE_STEPS } from "../../learn/content";
import "./more.css";
import "../../learn/learn.css";

const STEPS = [
  { t: "Keep a safe distance", b: "An animal in pain may bite. Do not pick it up, corner it or give it water by hand." },
  { t: "Note exactly where", b: "A landmark and a road, or let the report use your location. Stay if it is safe; note which way it went if it moves." },
  { t: "Take a photo if you safely can", b: "From where you stand. A photo helps a rescuer recognise the animal and bring the right kit." },
  { t: "Report it, or call a helpline", b: "StrayPaw shows the report to organisations working nearby and tells you when one takes it. For an emergency, call a rescue line as well." },
];

export function Help({ flagged }: { flagged: Dog[] }) {
  return (
    <div className="mo">
      <header className="mo-head hp-head">
        <p className="k is-flame">Community · help now</p>
        <h1 className="display">If an animal needs help</h1>
        <ol className="hp-steps">{STEPS.map((s, i) => <li key={s.t}><span className="hp-n serif">{i + 1}</span><div><b>{s.t}</b><p>{s.b}</p></div></li>)}</ol>
        <div className="row"><Link className="btn is-flame" href="/community/report?help=1">Report an animal needing help</Link><a className="btn" href="#helplines">Rescue helplines</a></div>
        <p className="small">After you report, StrayPaw shows a receipt marked “Received”. It is not accepted until an organisation takes it, and the page says so when it happens.</p>
      </header>
      <div className="rs-grid hp-grid">
        <section className="rs-sec" id="helplines" aria-labelledby="hp-h">
          <h2 id="hp-h" className="h2">Rescue helplines</h2>
          <p className="small">Established rescue organisations, not StrayPaw lines.</p>
          <ul className="rs-lines">{HELPLINES.map((h) => <li key={h.name}><a href={`tel:${h.number.replace(/[^0-9+]/g, "")}`}><Phone size={15} aria-hidden /><span><b>{h.name}</b><small>{h.note}</small></span><span className="mono">{h.number}</span></a></li>)}</ul>
        </section>
        <section className="rs-sec" aria-labelledby="hb-h">
          <h2 id="hb-h" className="h2">If you were bitten or scratched</h2>
          <ol className="rs-steps">{POST_BITE_STEPS.map((s, i) => <li key={i}><span className="mono">{i + 1}</span>{s}</li>)}</ol>
          <p className="small">Not medical advice: a doctor decides the schedule.</p>
        </section>
      </div>
      {flagged.length > 0 && (
        <section className="og-animals">
          <h2 className="h3">Flagged as needing help on the public record</h2>
          <p className="small">The latest {flagged.length} animals an organisation or reviewed report marked as needing help. Shown by area only. If you have seen one recently, add a sighting from its record.</p>
          <ul>{flagged.map((d) => { const t = animalTitle({ name: d.name, straypaw_id: d.straypaw_id ?? null, id: d.id }); return <li key={d.id}><Link href={`/animal/${d.id}`}><Portrait src={d.cover_photo || null} tag={t} sensitive size="m" /><b>{t}</b><small>{[publicLocality(d.zone), d.city].filter(Boolean).join(", ") || "Area not published"}</small></Link></li>; })}</ul>
        </section>
      )}
    </div>
  );
}
