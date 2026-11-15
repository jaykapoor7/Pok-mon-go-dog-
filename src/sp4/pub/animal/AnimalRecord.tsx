/* ════════════════════════════════════════════════════════════════════
   One animal, the public record (/animal/[id]). Server-rendered from the
   same reads as before (getDogProfile, the operational record and the
   public identity, through buildLiving).

   The real photograph with its credit (or a plate that says none was
   recorded), the identity line, what is known and what is not, care on
   the record, the life on the record as dated entries by year, who has
   recorded it, and its area, never the spot. The professional depth (the
   case file) is a different projection of the same animal, offered only
   to members of the organisation that holds it.
   ════════════════════════════════════════════════════════════════════ */

import type { Living, LivingEvent } from "@/lib/animal/living";
import { Body, Fold, LinkBtn, List, Note, Props, Row, Sec, Split, Tag } from "../kit";
import { Pic } from "../Pic";
import { day, plural, publicLocality } from "../fmt";
import { BackToMap, CasefileLink, RecordActions } from "./RecordActions";
import "./animal.css";

const LANE: Record<LivingEvent["lane"], string> = { case: "Request", care: "Care", follow: "Follow-up", sight: "Sighting" };
const SOURCE: Record<LivingEvent["source"], string> = { field: "recorded by an organisation", resident: "reported by a resident", import: "from an imported register" };

export function AnimalRecord({ r, ngoId }: { r: Living; ngoId: string | null }) {
  const years = new Map<string, LivingEvent[]>();
  for (const e of [...r.events].reverse()) { const y = new Date(e.date).getFullYear().toString(); years.set(y, [...(years.get(y) ?? []), e]); }
  const k = r.known;
  const facts: { label: string; value: string; tone: "care" | "urgent" | "unknown" | "plain" }[] = [
    { label: "Sterilisation", value: k.ster === "yes" ? `Recorded${k.sterAt ? ` · ${day(k.sterAt)}` : ""}` : k.ster === "no" ? "Recorded not sterilised" : "Not recorded", tone: k.ster === "yes" ? "care" : k.ster === "no" ? "plain" : "unknown" },
    { label: "Vaccination", value: k.vacc === "yes" ? `Recorded${k.vaccAt ? ` · ${day(k.vaccAt)}` : ""}${k.boosterDue ? " · booster may be due" : ""}` : k.vacc === "no" ? "Recorded not vaccinated" : "Not recorded", tone: k.vacc === "yes" ? "care" : k.vacc === "no" ? "plain" : "unknown" },
    { label: "Health", value: k.health === "needs_help" ? "Flagged as needing help" : k.health === "injured" ? "Recorded injured" : "Nothing flagged on the record", tone: k.health === "none" ? "plain" : "urgent" },
    { label: "Ear notch", value: k.earNotch ? "Seen (a sign, not proof of surgery)" : "Not recorded", tone: k.earNotch ? "plain" : "unknown" },
  ];
  const gaps = [
    k.ster === "unknown" && { t: "Is it sterilised?", a: "If you see a V-notched ear, say so in a sighting." },
    !r.photo && { t: "No photograph", a: "A clear photo, taken from a safe distance, helps the right animal be recognised." },
    r.events.filter((e) => e.lane === "sight").length === 0 && { t: "No resident sighting yet", a: "Seen it recently? A sighting dates the record." },
  ].filter(Boolean) as { t: string; a: string }[];
  const describe = [r.species === "dog" ? "Street dog" : r.species, r.sex, r.size, r.colour].filter(Boolean).join(" · ");
  const sightings = r.events.filter((e) => e.lane === "sight").length, careN = r.events.filter((e) => e.lane === "care").length, casesN = r.events.filter((e) => e.lane === "case").length;
  const place = publicLocality(r.locality);
  const care = r.events.filter((e) => e.lane === "care").slice(-4).reverse();
  const quietDays = r.lastSeen ? (Date.now() - Date.parse(r.lastSeen)) / 86_400_000 : null;
  /* The one next step the record itself suggests. Nothing here is a promise of rescue. */
  const next = k.health !== "none"
    ? { t: "Flagged as needing help", a: "If you can see this animal, say where and how it is, from a safe distance. Organisations review reports; this is not an emergency line.", href: `/community/report?animal=${r.id}&help=1`, cta: "Report how it is now", urgent: true }
    : !r.photo ? { t: "No photograph on the record", a: "One clear photo, taken from a safe distance, helps the right animal be recognised.", href: `/community/report?animal=${r.id}`, cta: "Add a sighting with a photo", urgent: false }
    : k.ster === "unknown" ? { t: "Sterilisation not recorded", a: "A V-notched ear is a sign, not proof. Note it in a sighting if you see one.", href: `/community/report?animal=${r.id}`, cta: "Add a sighting", urgent: false }
    : quietDays !== null && quietDays > 180 ? { t: "Not seen for over six months", a: "A quiet record is not a missing animal. If you have seen it, a sighting dates the record.", href: `/community/report?animal=${r.id}`, cta: "Add a sighting", urgent: false }
    : { t: "The record is current", a: "Follow it to keep it in My activity on this device.", href: null, cta: null, urgent: false };
  const yearList = [...years.entries()];

  return (
    <>
      <header className="s4-wrap an-head">
        <div className="an-back"><BackToMap /></div>
        <div className="an-pic"><Pic src={r.photo} tag={r.straypawId ?? r.label} sensitive={r.photoSensitive} alt={`Photograph of ${r.label}`} /></div>
        <div className="an-id">
          <p className="an-code"><span>StrayPaw ID</span> {r.straypawId ?? "pending"}{r.sourceCode ? <> · <span>Source</span> {r.sourceCode}</> : null}</p>
          <h1 className="pb-h1">{r.label}</h1>
          <p className="pb-sum">{describe || "Description not recorded"}{place ? <> · recorded in <b>{place}</b>{r.city ? `, ${r.city}` : ""}</> : r.city ? <> · {r.city}</> : null}{r.photoAttribution ? <> · photo: {r.photoAttribution}</> : null}{r.photos.length > 1 ? <> · {r.photos.length} photographs on the record</> : null}</p>
          <RecordActions id={r.id} label={r.label} />
          <CasefileLink id={r.id} ngoId={ngoId} />
        </div>
      </header>
      <Body>
        <Note tone={next.urgent ? "flame" : "plain"} action={next.href ? <LinkBtn small variant={next.urgent ? "flame" : "line"} href={next.href}>{next.cta}</LinkBtn> : undefined}><b>{next.t}.</b> {next.a}</Note>
        <Split side={<>
          {r.place && <AreaPlate place={r.place} />}
          <Sec title="Who has recorded it" note="Recording an animal is not a claim that anyone has it in their care.">
            <p className="pb-prose">{r.hands.orgs.length ? r.hands.orgs.join(", ") : r.keeper}{r.hands.unnamedOrgs ? ` and ${r.hands.unnamedOrgs} ${plural(r.hands.unnamedOrgs, "organisation")} that do not publish a name` : ""}{r.hands.residents ? `; ${r.hands.residents} resident ${plural(r.hands.residents, "sighting")}` : ""}.</p>
          </Sec>
          {gaps.length > 0 && (
            <Sec title="Not yet on the record" action={<LinkBtn small href={`/community/report?animal=${r.id}`}>Add a sighting</LinkBtn>}>
              <List label="Not yet on the record">{gaps.map((g) => <Row key={g.t} title={g.t} meta={g.a} />)}</List>
            </Sec>
          )}
          {r.comments.length > 0 && (
            <Sec title="Notes from residents" count={Math.min(5, r.comments.length)}>
              <List label="Notes from residents">{r.comments.slice(0, 5).map((c) => <Row key={c.id} title={<span className="an-note">{c.body}</span>} meta={`${c.author} · ${day(c.date)}`} />)}</List>
            </Sec>
          )}
        </>}>
          <Sec title="What the record says" note="Not recorded is never counted as no. One StrayPaw ID across every organisation that records it; matches are made by people, reviewable and reversible, and a likeness alone never merges two animals.">
            <Props items={[
              ...facts.map((f) => ({ label: f.label, value: f.tone === "care" ? <Tag tone="green">{f.value}</Tag> : f.tone === "urgent" ? <Tag tone="flame">{f.value}</Tag> : f.tone === "unknown" ? <span className="pb-unknown">{f.value}</span> : f.value })),
              { label: "On the record since", value: day(r.firstSeen) },
              { label: "Last recorded", value: day(r.lastSeen) },
              { label: "Entries", value: <>{r.events.length} <span className="pb-unknown">({sightings} {plural(sightings, "sighting")} · {careN} care · {casesN} {plural(casesN, "request")})</span></> },
            ]} />
          </Sec>
          <Sec title="Care on the record" count={care.length || null}>
            {care.length ? <List label="Care on the record">{care.map((e) => <Row key={e.id} title={e.title} meta={e.by ? e.by : SOURCE[e.source]} end={<time dateTime={e.date}>{day(e.date)}</time>} />)}</List>
              : <p className="pb-fine">No dated care event is recorded. That is unknown, not proof that no care was given.</p>}
          </Sec>
          <Sec title="Its life on the record" note="Each line says where it came from. Gaps in time are gaps in reporting, not a quiet life or a missing animal.">
            {r.events.length === 0 ? <p className="pb-fine">Nothing dated yet beyond the profile itself.</p> : (
              <div className="an-years">
                {yearList.map(([y, list], ci) => (
                  <Fold key={y} title={y} count={list.length} open={ci === 0}>
                    <List label={`Entries in ${y}`}>
                      {list.map((e) => <Row key={e.id} title={e.title} meta={<>{LANE[e.lane]} · {e.by ? `recorded by ${e.by}` : SOURCE[e.source]}{e.via ? ` · ${e.via}` : ""}</>}
                        end={<>{e.lane === "case" && e.tone === "open" ? <Tag tone="flame">Open</Tag> : null}<time dateTime={e.date}>{day(e.date)}{e.end && e.end !== e.date ? ` to ${day(e.end)}` : ""}</time></>} />)}
                    </List>
                  </Fold>
                ))}
              </div>
            )}
          </Sec>
        </Split>
      </Body>
    </>
  );
}

/* Its area among its neighbours, as round discs: the area, never the spot. */
function AreaPlate({ place }: { place: NonNullable<Living["place"]> }) {
  const [w, s, e, n] = place.box;
  const W = 280, H = Math.min(200, Math.max(120, Math.round(W * ((n - s) / Math.max(1e-6, e - w))))), x = (lng: number) => ((lng - w) / (e - w)) * W, y = (lat: number) => H - ((lat - s) / (n - s)) * H;
  const max = Math.max(1, ...place.cells.map((c) => c.n));
  return (
    <Sec title="Where it lives" note="Its area (blue, about 0.74 km²) and the areas around it, sized by animals recorded. Dashed rings: nothing recorded yet. The area, never the spot.">
      <svg className="an-area" viewBox={`-10 -10 ${W + 20} ${H + 20}`} role="img" aria-label={`Its recorded area and the ${Math.max(0, place.cells.length - 1)} areas around it`}>
        {place.cells.map((c) => {
          let cx = 0, cy = 0; const k = c.ring.length / 2;
          for (let i = 0; i < c.ring.length; i += 2) { cx += x(c.ring[i]); cy += y(c.ring[i + 1]); }
          cx /= k; cy /= k;
          const r = 9 + (c.n / max) * 14;
          return <circle key={c.key} cx={cx} cy={cy} r={c.self ? r + 4 : r} fill={c.self ? "#2457ce" : c.n ? "#d7deeb" : "none"} stroke="#5b6475" strokeOpacity={c.n || c.self ? 0.6 : 0.5} strokeDasharray={c.n || c.self ? undefined : "2 2"} />;
        })}
      </svg>
    </Sec>
  );
}
