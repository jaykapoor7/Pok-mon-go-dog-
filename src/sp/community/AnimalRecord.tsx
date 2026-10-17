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

import Link from "next/link";
import type { Living, LivingEvent } from "@/lib/animal/living";
import { Portrait } from "../ui/Portrait";
import { publicLocality } from "../ui/place";
import { RecordActions, BackToMap, CasefileLink } from "./RecordActions";
import "./community.css";

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
  return (
    <article className="ar">
      {/* The record's head, printed on the indigo sheet like the atlas it was opened from. */}
      <header className="ar-sheet sheet">
        <div className="ar-bar page"><BackToMap /><CasefileLink id={r.id} ngoId={ngoId} /></div>
        <div className="ar-hero page">
          <div className="ar-photo">
            <Portrait src={r.photo} tag={r.straypawId ?? r.label} sensitive={r.photoSensitive} credit={r.photoAttribution} size="l" alt={`Photograph of ${r.label}`} puppy={r.size === "puppy"} />
            {r.photos.length > 1 && <p className="k">{r.photos.length} photographs on the record</p>}
          </div>
          <div className="ar-id">
            <p className="ar-strip mono"><span>StrayPaw ID</span>{r.straypawId ?? "pending"}{r.sourceCode ? <><span>Source</span>{r.sourceCode}</> : null}</p>
            <h1 className="ar-name serif">{r.label}</h1>
            <p className="ar-desc">{describe || "Description not recorded"}{place ? <> · recorded in <b className="serif">{place}</b>{r.city ? `, ${r.city}` : ""}</> : r.city ? <> · {r.city}</> : null}</p>
            <dl className="ar-span">
              <div><dt>On the record since</dt><dd className="serif">{day(r.firstSeen)}</dd></div>
              <div><dt>Last recorded</dt><dd className="serif">{day(r.lastSeen)}</dd></div>
              <div><dt>Entries</dt><dd className="serif tnum">{r.events.length}</dd><small>{sightings} sighting{sightings === 1 ? "" : "s"} · {careN} care · {casesN} request{casesN === 1 ? "" : "s"}</small></div>
            </dl>
            <RecordActions id={r.id} label={r.label} />
          </div>
        </div>
        <div className="selvedge" aria-hidden />
      </header>

      {/* What the record says, and what it does not: four facts, each with its own state. */}
      <section className="ar-ledger page" aria-labelledby="ar-ledger-h">
        <h2 id="ar-ledger-h" className="k">What the record says</h2>
        <dl className="ar-facts">
          {facts.map((f) => <div key={f.label} className={`is-${f.tone}`}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
        </dl>
        <p className="small">Hatched means the record does not say. Not recorded is never counted as no. Identity: one StrayPaw ID across every organisation that records it; matches are made by people, reviewable and reversible, and a likeness alone never merges two animals.</p>
      </section>

      <div className="ar-body page">
        <section className="ar-life" aria-labelledby="ar-life-h">
          <p className="k">A life on the record</p>
          <h2 id="ar-life-h" className="h2">Chapters, by year</h2>
          <p className="small">Each line says where it came from. Gaps in time are gaps in reporting, not a quiet life or a missing animal.</p>
          {r.events.length === 0 && <p className="body">Nothing dated yet beyond the profile itself.</p>}
          {[...years.entries()].map(([y, list], ci) => (
            <section key={y} className="ar-year">
              <h3 className="ar-y"><small className="mono">Chapter {ROMAN[ci] ?? ci + 1}</small><span className="serif">{y}</span></h3>
              <ol className="chrono">
                {list.map((e) => (
                  <li key={e.id} className={`is-${e.lane === "case" ? (e.tone === "open" ? "urgent" : "report") : e.lane === "care" ? "care" : e.lane === "follow" ? "followup" : "sight"}`}>
                    <time className="mono">{day(e.date)}{e.end && e.end !== e.date ? ` → ${day(e.end)}` : ""}</time>
                    <span><b>{e.title}</b></span>
                    <small>{LANE[e.lane]} · {e.by ? `recorded by ${e.by}` : SOURCE[e.source]}{e.via ? ` · ${e.via}` : ""}</small>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </section>

        <aside className="ar-side">
          {gaps.length > 0 && (
            <section className="ar-card">
              <h2 className="h3">Not yet on the record</h2>
              <ul className="ar-gaps">{gaps.map((g) => <li key={g.t}><b>{g.t}</b><span>{g.a}</span></li>)}</ul>
              <Link className="btn is-s" href={`/community/report?animal=${r.id}`}>Add a sighting</Link>
            </section>
          )}
          <section className="ar-card">
            <h2 className="h3">Who has recorded it</h2>
            <p className="body">{r.hands.orgs.length ? r.hands.orgs.join(", ") : r.keeper}{r.hands.unnamedOrgs ? ` and ${r.hands.unnamedOrgs} organisation${r.hands.unnamedOrgs === 1 ? "" : "s"} that do not publish a name` : ""}{r.hands.residents ? `; ${r.hands.residents} resident sighting${r.hands.residents === 1 ? "" : "s"}` : ""}.</p>
            <p className="small">Recording an animal is not a claim that anyone has it in their care.</p>
          </section>
          {r.place && <AreaPlate place={r.place} />}
          {r.comments.length > 0 && (
            <section className="ar-card">
              <h2 className="h3">Notes from residents</h2>
              <ul className="ar-notes">{r.comments.slice(0, 5).map((c) => <li key={c.id}><p>{c.body}</p><small>{c.author} · {day(c.date)}</small></li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}

/* Its area among its neighbours, as round discs: the area, never the spot. */
function AreaPlate({ place }: { place: NonNullable<Living["place"]> }) {
  const [w, s, e, n] = place.box;
  const W = 280, H = Math.max(160, Math.round(W * ((n - s) / Math.max(1e-6, e - w)))), x = (lng: number) => ((lng - w) / (e - w)) * W, y = (lat: number) => H - ((lat - s) / (n - s)) * H;
  const max = Math.max(1, ...place.cells.map((c) => c.n));
  return (
    <section className="ar-card">
      <h2 className="h3">Where it lives</h2>
      <svg className="ar-area" viewBox={`-10 -10 ${W + 20} ${H + 20}`} role="img" aria-label={`Its recorded area and the ${place.cells.length - 1} areas around it`}>
        {place.cells.map((c) => {
          let cx = 0, cy = 0; const k = c.ring.length / 2;
          for (let i = 0; i < c.ring.length; i += 2) { cx += x(c.ring[i]); cy += y(c.ring[i + 1]); }
          cx /= k; cy /= k;
          const r = 9 + (c.n / max) * 14;
          return <g key={c.key}>{c.self && <circle cx={cx + 2} cy={cy - 2} r={r + 6} fill="none" stroke="#f05b40" strokeWidth="1.4" opacity=".8" />}<circle cx={cx} cy={cy} r={c.self ? r + 4 : r} fill={c.self ? "#2457ce" : c.n ? "#a9b5d6" : "none"} stroke="#0b1e3d" strokeOpacity={c.n || c.self ? 0.4 : 0.2} strokeDasharray={c.n || c.self ? undefined : "2 2"} /></g>;
        })}
      </svg>
      <p className="small">Its area (blue, ≈0.74 km²) and the areas around it, sized by animals recorded. Dashed rings: nothing recorded yet.</p>
    </section>
  );
}
