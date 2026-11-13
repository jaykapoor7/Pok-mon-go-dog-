/* ════════════════════════════════════════════════════════════════════
   Community · If an animal needs help: what to do now. Four steps in
   order, the report action, rescue helplines that are not StrayPaw's,
   the after-a-bite steps, and the animals the public record currently
   flags as needing help, by area. Reporting is honest about what
   happens next: received is not the same as accepted.
   ════════════════════════════════════════════════════════════════════ */

import { Phone } from "lucide-react";
import type { Dog } from "@/lib/types";
import { animalTitle } from "@/lib/animal-name";
import { Btn, Head, Page, Panel, Row, Rows, Section, Split } from "@/ws/kit";
import { publicLocality } from "../../ui/place";
import { HELPLINES, POST_BITE_STEPS } from "../../learn/content";
import "./more.css";

const STEPS = [
  { t: "Keep a safe distance", b: "An animal in pain may bite. Do not pick it up, corner it or give it water by hand." },
  { t: "Note exactly where", b: "A landmark and a road, or let the report use your location. Stay if it is safe; note which way it went if it moves." },
  { t: "Take a photo if you safely can", b: "From where you stand. A photo helps a rescuer recognise the animal and bring the right kit." },
  { t: "Report it, or call a helpline", b: "StrayPaw shows the report to organisations working nearby and tells you when one takes it. For an emergency, call a rescue line as well." },
];

export function Help({ flagged }: { flagged: Dog[] }) {
  return (
    <Page>
      <Head title="If an animal needs help"
        sum="Four steps, in order. After you report, StrayPaw shows a receipt marked “Received”. It is not accepted until an organisation takes it, and the page says so when it happens."
        actions={<><Btn href="#helplines">Rescue helplines</Btn><Btn variant="primary" href="/community/report?help=1">Report an animal needing help</Btn></>} />
      <Split side={<>
        <div id="helplines" className="cmo-anchor">
          <Section title="Rescue helplines" note="Established rescue organisations, not StrayPaw lines.">
            <Panel><Rows>{HELPLINES.map((h) => <li key={h.name}><a className="k-row" href={`tel:${h.number.replace(/[^0-9+]/g, "")}`}><span className="k-row-i" aria-hidden><Phone size={14} /></span><span className="k-row-t"><b>{h.name}</b><small>{h.note}</small></span><span className="k-row-e">{h.number}</span></a></li>)}</Rows></Panel>
          </Section>
        </div>
        <Section title="If you were bitten or scratched">
          <ol className="cmo-steps">{POST_BITE_STEPS.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}</ol>
          <p className="cmo-fine">Not medical advice: a doctor decides the schedule.</p>
        </Section>
      </>}>
        <Section title="What to do now">
          <ol className="cmo-steps is-main">{STEPS.map((s, i) => <li key={s.t}><span>{i + 1}</span><div><b>{s.t}</b><p>{s.b}</p></div></li>)}</ol>
        </Section>
        {flagged.length > 0 && (
          <Section title="Flagged as needing help on the public record" count={flagged.length}>
            <p className="cmo-fine">The latest {flagged.length} animals an organisation or reviewed report marked as needing help. Shown by area only. If you have seen one recently, add a sighting from its record.</p>
            <Panel><Rows>{flagged.slice(0, 8).map((d) => { const t = animalTitle({ name: d.name, straypaw_id: d.straypaw_id ?? null, id: d.id }); return <Row key={d.id} href={`/animal/${d.id}`} title={t} meta={[publicLocality(d.zone), d.city].filter(Boolean).join(", ") || "Area not published"} />; })}</Rows></Panel>
          </Section>
        )}
      </Split>
    </Page>
  );
}
