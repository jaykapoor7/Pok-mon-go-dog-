/* If an animal needs help (/community/help): four steps in order, the
   report action, rescue helplines that are not StrayPaw's, the after-a-bite
   steps, and the animals the public record currently flags as needing
   help, by area. Received is not the same as accepted, and it says so. */

import { Phone } from "lucide-react";
import type { Dog } from "@/lib/types";
import { animalTitle } from "@/lib/animal-name";
import { HELPLINES, POST_BITE_STEPS } from "@/sp/learn/content";
import { Body, Head, List, LinkBtn, Row, Sec, Split } from "../kit";
import { publicLocality } from "../fmt";

const STEPS = [
  { t: "Keep a safe distance", b: "An animal in pain may bite. Do not pick it up, corner it or give it water by hand." },
  { t: "Note exactly where", b: "A landmark and a road, or let the report use your location. Stay if it is safe; note which way it went if it moves." },
  { t: "Take a photo if you safely can", b: "From where you stand. A photo helps a rescuer recognise the animal and bring the right kit." },
  { t: "Report it, or call a helpline", b: "StrayPaw shows the report to organisations working nearby and tells you when one takes it. For an emergency, call a rescue line as well." },
];

export function Helplines() {
  return <List label="Rescue helplines">{HELPLINES.map((h) => <Row key={h.name} href={`tel:${h.number.replace(/[^0-9+]/g, "")}`} icon={<Phone size={16} />} title={h.name} meta={h.note} end={<span className="pb-tel">{h.number}</span>} />)}</List>;
}

export function BiteSteps() {
  return <ol className="pb-steps">{POST_BITE_STEPS.map((s, i) => <li key={i}><span aria-hidden>{i + 1}</span><p>{s}</p></li>)}</ol>;
}

export function Help({ flagged }: { flagged: Dog[] }) {
  return (
    <>
      <Head title="If an animal needs help"
        sum="Four steps, in order. After you report, StrayPaw shows a receipt marked “Received”. It is not accepted until an organisation takes it, and the page says so when it happens."
        actions={<><LinkBtn variant="flame" href="/community/report?help=1">Report an animal needing help</LinkBtn><LinkBtn href="#helplines">Rescue helplines</LinkBtn></>} />
      <Body>
        <Split side={<>
          <Sec id="helplines" title="Rescue helplines" note="Established rescue organisations, not StrayPaw lines. Tap a number to call."><Helplines /></Sec>
          <Sec title="If you were bitten or scratched" note="Not medical advice: a doctor decides the schedule."><BiteSteps /></Sec>
        </>}>
          <Sec title="What to do now">
            <ol className="pb-steps is-main">{STEPS.map((s, i) => <li key={s.t}><span aria-hidden>{i + 1}</span><div><b>{s.t}</b><p>{s.b}</p></div></li>)}</ol>
          </Sec>
          {flagged.length > 0 && (
            <Sec title="Flagged as needing help on the public record" count={Math.min(8, flagged.length)} note="The latest animals an organisation or a reviewed report marked as needing help, by area only. If you have seen one recently, add a sighting from its record.">
              <List label="Animals flagged as needing help">{flagged.slice(0, 8).map((d) => { const t = animalTitle({ name: d.name, straypaw_id: d.straypaw_id ?? null, id: d.id, city: d.city ?? null, zone: d.zone }); return <Row key={d.id} href={`/animal/${d.id}`} title={t} meta={[publicLocality(d.zone), d.city].filter(Boolean).join(", ") || "Area not published"} />; })}</List>
            </Sec>
          )}
        </Split>
      </Body>
    </>
  );
}
