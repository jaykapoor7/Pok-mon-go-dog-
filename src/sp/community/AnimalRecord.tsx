/* ════════════════════════════════════════════════════════════════════
   One animal, the public depth (decisions 019, 039; references 05 Happy-
   whale, 06 Photo Ark, 13 Stripe Press).

   A documentary record set like a page of a living publication: the real
   photograph large with its credit (or a plate that says none was
   recorded), the identity strip, what is known and what is not, the
   life on the record as dated chapters by year, the hands that have
   recorded it, and the area it lives in, never the spot.

   The professional depth (casefile, clinical detail, private notes) is a
   different projection of the SAME animal, opened only for members of
   an organisation that holds it, read under their own session.
   ════════════════════════════════════════════════════════════════════ */

import type { Living, LivingEvent } from "@/lib/animal/living";
import { Btn, Note, Page, Panel, Props, Row, Rows, Section, Split, Tag } from "@/ws/kit";
import { Portrait } from "../ui/Portrait";
import { publicLocality } from "../ui/place";
import { RecordActions, CasefileLink } from "./RecordActions";
import "./record.k.css";

const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "date not recorded");
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
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
  /* The one next action the record itself suggests. Nothing here is a promise of rescue. */
  const next = k.health !== "none"
    ? { t: "Flagged as needing help", a: "If you can see this animal, say where and how it is, from a safe distance. Organisations review reports; this is not an emergency line.", href: `/community/report?animal=${r.id}&help=1`, cta: "Report how it is now", urgent: true }
    : !r.photo ? { t: "No photograph on the record", a: "One clear photo, taken from a safe distance, helps the right animal be recognised.", href: `/community/report?animal=${r.id}`, cta: "Add a sighting with a photo", urgent: false }
    : k.ster === "unknown" ? { t: "Sterilisation not recorded", a: "A V-notched ear is a sign, not proof. Note it in a sighting if you see one.", href: `/community/report?animal=${r.id}`, cta: "Add a sighting", urgent: false }
    : quietDays !== null && quietDays > 180 ? { t: "Not seen for over six months", a: "A quiet record is not a missing animal. If you have seen it, a sighting dates the record.", href: `/community/report?animal=${r.id}`, cta: "Add a sighting", urgent: false }
    : { t: "The record is current", a: "Follow it to keep it in My Activity on this device.", href: null, cta: null, urgent: false };
  const tone = (t: "care" | "urgent" | "unknown" | "plain") => (t === "care" ? "green" : t === "urgent" ? "flame" : "plain") as "green" | "flame" | "plain";
  const yearList = [...years.entries()];
  /* One record: a small portrait, the name and its ID; what the record says and its chapters by year; where it lives, who recorded it and what is missing beside. */
  return (
    <Page className="rk">
      <header className="rk-head">
        <div className="rk-pic">
          <Portrait src={r.photo} tag={r.straypawId ?? r.label} sensitive={r.photoSensitive} size="m" alt={`Photograph of ${r.label}`} puppy={r.size === "puppy"} />
        </div>
        <div className="rk-id">
          <p className="rk-code"><span>StrayPaw ID</span> {r.straypawId ?? "pending"}{r.sourceCode ? <> · <span>Source</span> {r.sourceCode}</> : null}</p>
          <h1 className="k-title">{r.label}</h1>
          <p className="k-sum">{describe || "Description not recorded"}{place ? <> · recorded in <b>{place}</b>{r.city ? `, ${r.city}` : ""}</> : r.city ? <> · {r.city}</> : null}{r.photoAttribution ? <> · photo: {r.photoAttribution}</> : null}{r.photos.length > 1 ? <> · {r.photos.length} photographs on the record</> : null}</p>
          <div className="rk-acts"><RecordActions id={r.id} label={r.label} /><CasefileLink id={r.id} ngoId={ngoId} /></div>
        </div>
      </header>

      <Note tone={next.urgent ? "flame" : "plain"} action={next.href ? <Btn small href={next.href}>{next.cta}</Btn> : undefined}><b>{next.t}.</b> {next.a}</Note>

      <Split side={<>
        {r.place && <AreaPlate place={r.place} />}
        <Section title="Who has recorded it">
          <p className="rk-prose">{r.hands.orgs.length ? r.hands.orgs.join(", ") : r.keeper}{r.hands.unnamedOrgs ? ` and ${r.hands.unnamedOrgs} organisation${r.hands.unnamedOrgs === 1 ? "" : "s"} that do not publish a name` : ""}{r.hands.residents ? `; ${r.hands.residents} resident sighting${r.hands.residents === 1 ? "" : "s"}` : ""}.</p>
          <p className="rk-fine">Recording an animal is not a claim that anyone has it in their care.</p>
        </Section>
        {gaps.length > 0 && (
          <Section title="Not yet on the record" action={<Btn small href={`/community/report?animal=${r.id}`}>Add a sighting</Btn>}>
            <Panel><Rows>{gaps.map((g) => <Row key={g.t} title={g.t} meta={<span title={g.a}>{g.a}</span>} />)}</Rows></Panel>
          </Section>
        )}
        {r.comments.length > 0 && (
          <Section title="Notes from residents" count={r.comments.length}>
            <ul className="rk-notes">{r.comments.slice(0, 5).map((c) => <li key={c.id}><p>{c.body}</p><small>{c.author} · {day(c.date)}</small></li>)}</ul>
          </Section>
        )}
      </>}>
        <Section title="What the record says">
          <Panel pad><Props items={[
            ...facts.map((f) => ({ label: f.label, value: f.tone === "care" || f.tone === "urgent" ? <Tag tone={tone(f.tone)}>{f.value}</Tag> : f.tone === "unknown" ? <span className="rk-unknown">{f.value}</span> : f.value })),
            { label: "On the record since", value: day(r.firstSeen) },
            { label: "Last recorded", value: day(r.lastSeen) },
            { label: "Entries", value: <>{r.events.length} <span className="rk-unknown">({sightings} sighting{sightings === 1 ? "" : "s"} · {careN} care · {casesN} request{casesN === 1 ? "" : "s"})</span></> },
          ]} /></Panel>
          <p className="rk-fine">Not recorded is never counted as no. Identity: one StrayPaw ID across every organisation that records it; matches are made by people, reviewable and reversible, and a likeness alone never merges two animals.</p>
        </Section>

        <Section title="Care on the record" count={care.length || null}>
          <Panel>
            {care.length ? <Rows>{care.map((e) => <Row key={e.id} title={e.title} meta={e.by ? e.by : SOURCE[e.source]} end={<time>{day(e.date)}</time>} />)}</Rows>
              : <p className="rk-quiet">No dated care event is recorded. That is unknown, not proof that no care was given.</p>}
          </Panel>
        </Section>

        {r.events.length === 0 && <Section title="Chapters, by year"><Panel><p className="rk-quiet">Nothing dated yet beyond the profile itself.</p></Panel></Section>}
        {yearList.map(([y, list], ci) => (
          <Section key={y} fold={`year-${y}`} open={ci === 0} title={y} count={list.length} note={ci === 0 ? "Each line says where it came from. Gaps in time are gaps in reporting, not a quiet life or a missing animal." : undefined}>
            <Panel><Rows label={`Chapter ${ROMAN[ci] ?? ci + 1}, ${y}`}>
              {list.map((e) => (
                <Row key={e.id} title={e.title}
                  meta={<>{LANE[e.lane]} · {e.by ? `recorded by ${e.by}` : SOURCE[e.source]}{e.via ? ` · ${e.via}` : ""}</>}
                  end={<>{e.lane === "case" && e.tone === "open" ? <Tag tone="flame">Open</Tag> : null}<time>{day(e.date)}{e.end && e.end !== e.date ? ` → ${day(e.end)}` : ""}</time></>} />
              ))}
            </Rows></Panel>
          </Section>
        ))}
      </Split>
    </Page>
  );
}

/* Its area among its neighbours, as round discs: the area, never the spot. */
function AreaPlate({ place }: { place: NonNullable<Living["place"]> }) {
  const [w, s, e, n] = place.box;
  const W = 280, H = Math.min(200, Math.max(120, Math.round(W * ((n - s) / Math.max(1e-6, e - w))))), x = (lng: number) => ((lng - w) / (e - w)) * W, y = (lat: number) => H - ((lat - s) / (n - s)) * H;
  const max = Math.max(1, ...place.cells.map((c) => c.n));
  return (
    <Section title="Where it lives">
      <svg className="rk-area" viewBox={`-10 -10 ${W + 20} ${H + 20}`} role="img" aria-label={`Its recorded area and the ${place.cells.length - 1} areas around it`}>
        {place.cells.map((c) => {
          let cx = 0, cy = 0; const k = c.ring.length / 2;
          for (let i = 0; i < c.ring.length; i += 2) { cx += x(c.ring[i]); cy += y(c.ring[i + 1]); }
          cx /= k; cy /= k;
          const r = 9 + (c.n / max) * 14;
          return <g key={c.key}><circle cx={cx} cy={cy} r={c.self ? r + 4 : r} style={{ fill: c.self ? "var(--n-blue)" : c.n ? "var(--n-fill-2)" : "none", stroke: "var(--n-text-3)" }} strokeOpacity={c.n || c.self ? 0.6 : 0.5} strokeDasharray={c.n || c.self ? undefined : "2 2"} /></g>;
        })}
      </svg>
      <p className="rk-fine">Its area (blue, ≈0.74 km²) and the areas around it, sized by animals recorded. Dashed rings: nothing recorded yet. The area, never the spot.</p>
    </Section>
  );
}
