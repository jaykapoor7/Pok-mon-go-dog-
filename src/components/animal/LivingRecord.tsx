/* ════════════════════════════════════════════════════════════════════
   One animal, as the record knows it.

   A dossier, not a database row. It opens on the animal — its photograph
   when one exists, otherwise the place it is known by, said plainly — with
   its name, where it lives on the record and the state it is in. Then what
   the record knows about its care, as four facts that are hatched where
   nothing is recorded (never "no"). Then its history as a single spine,
   year by year, carrying on dashed into what nobody has recorded yet, each
   gap with the action that would fill it. The recorded area, identity and
   provenance sit alongside, and everything any neighbour can add is last.

   The same record serves the public profile and the organisation's view;
   an organisation's tools arrive as their own island.
   ════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import type { RouteStop } from "@/components/system/Route";
import { PlaceMap } from "./PlaceMap";
import type { Living, LivingEvent } from "@/lib/animal/living";
import { RecordActions } from "./RecordActions";
import { CommunityPanel } from "./CommunityPanel";
import { LivingChronology } from "./LivingChronology";
import "./living.css";
import "./dossier.css";
import { placeLine as joinPlace } from "@/lib/utils";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const since = (iso: string | null) => {
  if (!iso) return null;
  const d = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 86_400_000));
  return d < 1 ? "today" : d === 1 ? "yesterday" : d < 45 ? `${d} days ago` : d < 540 ? `${Math.round(d / 30)} months ago` : `${(d / 365).toFixed(1)} years ago`;
};
const cap = (t: string) => t.replace(/^./, (c) => c.toUpperCase());
const SOURCE: Record<LivingEvent["source"], string> = { field: "field record", resident: "resident", import: "imported register" };

/* The route shows the shape of the record; past this many stops the middle
   folds into one, and the chronology below holds every entry. */
const MAX_STOPS = 9;

function routeOf(r: Living, scope: "public" | "org", reportHref: string): RouteStop[] {
  /* Each stop carries the moment it sorts at: its own date, or, for a closure
     whose day was not recorded, just after the report it closes. */
  const timed: { t: number; s: RouteStop }[] = [];
  /* Within one day: the report first, then what was seen and done, then the close. */
  const dayOf = (iso: string) => Math.floor(Date.parse(iso) / 86_400_000);
  const push = (s: RouteStop, at: string | null = s.at, rank = 2) => timed.push({ t: at ? dayOf(at) * 10 + rank : 0, s });
  let sights: LivingEvent[] = [];
  const flushSights = () => {
    if (!sights.length) return;
    const first = sights[0], last = sights[sights.length - 1];
    push({
      key: `s-${first.id}`, at: first.date, kind: "step",
      label: sights.length === 1 ? cap(first.title) : `Seen ${sights.length} times by residents`,
      detail: sights.length > 1 ? `${day(first.date)} to ${day(last.date)}` : undefined,
    }, first.date, 1);
    sights = [];
  };
  for (const e of r.events) {
    if (e.lane === "sight") { sights.push(e); continue; }
    flushSights();
    if (e.lane === "case") {
      const [what, outcome] = e.title.split(" — ");
      const [status, why] = (outcome ?? "").split(": ");
      const cond = what === "A request for help" ? null : what;
      if (e.tone === "open") {
        push({
          key: e.id, at: e.date, kind: "open", label: "Open request",
          detail: `${cond ?? "Condition not recorded"} · open since ${day(e.date)}`,
          ...(scope === "org" && e.href ? { href: e.href, cta: "Open the case" } : {}),
        }, e.date, 0);
        continue;
      }
      push({ key: `${e.id}-r`, at: e.date, kind: "step", label: "Reported", detail: cond ?? "A request for help" }, e.date, 0);
      const closedAt = e.end && e.end > e.date ? e.end : null;
      push({ key: `${e.id}-c`, at: closedAt, kind: "step", label: cap(status || "Closed"), detail: why ? cap(why) : closedAt ? undefined : "The day it closed was not recorded" }, closedAt ?? e.date, 4);
      continue;
    }
    if (e.lane === "follow") {
      if (e.tone === "due") continue; // a follow-up still to come is drawn with the gaps, below
      push({ key: e.id, at: e.date, kind: e.tone === "miss" ? "open" : "step", label: e.title }, e.date, 3);
      continue;
    }
    push({ key: e.id, at: e.date, kind: "step", label: e.title, detail: e.note ?? undefined });
  }
  flushSights();
  const sorted = timed.map((x, i) => ({ ...x, i })).sort((a, b) => a.t - b.t || a.i - b.i);
  /* The same entry made more than once on one day (three requests for one
     wound) is one stop that says how many. */
  const items: RouteStop[] = [];
  for (let k = 0; k < sorted.length; k++) {
    let n = 1;
    while (k + n < sorted.length && sorted[k + n].t === sorted[k].t && sorted[k + n].s.label === sorted[k].s.label && sorted[k + n].s.detail === sorted[k].s.detail) n++;
    const st = sorted[k].s;
    items.push(n > 1 ? { ...st, detail: <>{st.detail}{st.detail ? " · " : ""}{n} on the record</> } : st);
    k += n - 1;
  }

  if (items.length) items[0] = { ...items[0], kind: items[0].kind === "open" ? "open" : "start" };
  const lastI = items.length - 1;
  if (lastI > 0 && items[lastI].kind === "step" && !r.open.cases && r.known.health === "none" && /^(closed|handed|recovered)/i.test(items[lastI].label)) {
    items[lastI] = { ...items[lastI], kind: "end" };
  }

  let shown = items;
  if (items.length > MAX_STOPS) {
    const head = items.slice(0, 2), tail = items.slice(items.length - (MAX_STOPS - 3));
    const hidden = items.length - head.length - tail.length;
    const mid = items[2 + Math.floor(hidden / 2)];
    shown = [...head, { key: "fold", at: mid.at, kind: "step", label: `${hidden} more entries`, detail: "Every entry is in the chronology below" }, ...tail];
  }

  /* What nobody has recorded yet: the route carries on, dashed. */
  const gaps: RouteStop[] = [];
  if (r.known.health === "needs_help") gaps.push({ key: "help", at: null, kind: "open", label: "Flagged as needing help", detail: "Somebody asked for help for this animal.", href: reportHref, cta: "Add what you see" });
  if (r.open.followupsDue) gaps.push({ key: "due", at: null, kind: "missing", label: `${r.open.followupsDue} follow-up${r.open.followupsDue === 1 ? "" : "s"} due`, ...(scope === "org" ? { href: "#org-care", cta: "Record it" } : {}) });
  if (r.known.boosterDue) gaps.push({ key: "boost", at: null, kind: "missing", label: "Booster vaccination", detail: `The last vaccination was ${since(r.known.vaccAt)}; a booster is due.` });
  if (r.known.ster === "unknown") gaps.push({
    key: "ster", at: null, kind: "missing", label: "Sterilisation",
    detail: scope === "public" ? "Nobody has recorded whether it is sterilised. A notched ear is the sign." : "Nobody has recorded whether it is sterilised.",
    href: scope === "org" ? "#org-care" : reportHref, cta: scope === "org" ? "Record sterilisation" : "Report a dog",
  });
  if (r.known.vacc === "unknown") gaps.push({
    key: "vacc", at: null, kind: "missing", label: "Vaccination", detail: "No anti-rabies vaccination on the record.",
    ...(scope === "org" ? { href: "#org-care", cta: "Record vaccination" } : {}),
  });
  return [...shown, ...gaps];
}

export function LivingRecord({ r, scope, org, trail }: { r: Living; scope: "public" | "org"; org?: ReactNode; trail?: ReactNode }) {
  const reportHref = `/report?dog=${r.id}${r.place ? `&lat=${r.place.center[1]}&lng=${r.place.center[0]}` : ""}`;
  const cityQuery = r.city ? `&city=${encodeURIComponent(r.city)}` : "";
  const mapHref = r.place ? `${scope === "org" ? "/partner/map" : "/map"}?mode=animals&cell=${r.place.cell}${cityQuery}` : `/map?focus=animal:${r.id}${cityQuery}`;
  const status = r.known.health === "needs_help" ? { t: "Needs help", c: "is-hot" }
    : r.known.health === "injured" ? { t: "Recorded injured", c: "is-hot" }
    : r.open.cases ? { t: `${r.open.cases} open request${r.open.cases === 1 ? "" : "s"}`, c: "is-open" }
    : { t: "No open request", c: "is-done" };
  const rows = r.events.map((e) => ({ date: e.date, kind: e.lane, title: e.title, source: SOURCE[e.source] }));
  const chronology = [...r.events].reverse();
  const stops = routeOf(r, scope, reportHref);
  const placeLine = joinPlace(r.locality, r.city);
  const sex = /^(m|male)$/i.test(r.sex ?? "") ? "male" : /^(f|female)$/i.test(r.sex ?? "") ? "female" : null;
  const what = [r.colour ? r.colour.toLowerCase() : null, sex, r.species === "dog" ? "street dog" : r.species].filter(Boolean).join(" ");
  const generated = /·/.test(r.label) || /^(dog|animal) near /i.test(r.label);
  const known = stops.filter((s) => s.kind !== "missing" && !(s.key === "help"));
  const gaps = stops.filter((s) => s.kind === "missing" || s.key === "help");
  /* Group the spine by year so a decade-long record stays readable. */
  const years: { year: string; items: typeof known }[] = [];
  for (const s of known) {
    const y = s.at ? String(new Date(s.at).getUTCFullYear()) : "Date not recorded";
    const last = years[years.length - 1];
    if (last && last.year === y) last.items.push(s); else years.push({ year: y, items: [s] });
  }

  return (
    <article className="dz" aria-labelledby="dz-name">
      {trail}

      <header className={`dz-hero x-night ${r.photo ? "has-photo" : "no-photo"}`}>
        <div className="dz-hero-in">
          <figure className="dz-portrait">
            {r.photo ? <>
              <DogPhoto src={r.photo} alt={r.label} seed={r.id} width={900} className="dz-photo" />
              <figcaption>{r.photos.length > 1 ? `${r.photos.length} photographs on this record` : "Photographed for this record"}{r.photoAttribution && <> · {r.photoSourceUrl ? <a href={r.photoSourceUrl} target="_blank" rel="noreferrer">{r.photoAttribution}</a> : r.photoAttribution}</>}</figcaption>
            </> : (
              <div className="dz-plate" role="img" aria-label={`No photograph is recorded for ${r.label}`}>
                <span className="dz-plate-id">{r.straypawId ?? "Identity pending"}</span>
                <span className="dz-plate-place">{r.locality ?? r.city ?? "Place not recorded"}</span>
                <span className="dz-plate-note">No photograph on record. This animal is known through its record — there is no substitute image.</span>
              </div>
            )}
          </figure>
          <div className="dz-id">
            <p className="dz-where">{placeLine || "Locality not recorded"}</p>
            <h1 id="dz-name" className={`dz-name${r.label.length > 26 ? " is-long" : ""}`}>{r.label}</h1>
            {(what || generated) && <p className="dz-what">{what ? <em>{what.replace(/^./, (c) => c.toUpperCase())}</em> : null}{generated ? <span> · a descriptive name from the source, not a given one</span> : null}</p>}
            <p className={`x-state dz-status ${status.c}`}>{status.t}</p>
            <dl className="dz-dates">
              <div><dt>On the record since</dt><dd>{day(r.firstSeen)}</dd></div>
              <div><dt>Last seen</dt><dd>{r.lastSeen ? since(r.lastSeen) : "Not recorded"}</dd></div>
              <div><dt>Recorded by</dt><dd>{r.keeper}</dd></div>
            </dl>
            <div className="dz-do">
              <a href={reportHref} className="x-btn is-flame">{r.known.health === "needs_help" ? "I can see it now" : "Report a sighting"}</a>
              <RecordActions id={r.id} label={r.label} place={placeLine || null} mapHref={mapHref} rows={rows} straypawId={r.straypawId} />
            </div>
          </div>
        </div>
      </header>

      <div className="x-wrap dz-wrap">
        <section className="dz-known" aria-labelledby="dz-known-h">
          <h2 id="dz-known-h" className="sys-sr">What the record knows</h2>
          <Fact state={r.known.ster} label="Sterilised" note={r.known.ster === "unknown" ? "Not recorded" : r.known.sterAt ? day(r.known.sterAt) : r.known.ster === "no" ? "Recorded as not" : "On the record"} />
          <Fact state={r.known.vacc} label="Vaccinated" note={r.known.vacc === "unknown" ? "Not recorded" : r.known.boosterDue ? `Booster due · last ${since(r.known.vaccAt)}` : r.known.vaccAt ? day(r.known.vaccAt) : r.known.vacc === "no" ? "Recorded as not" : "On the record"} warn={r.known.boosterDue} />
          <Fact state={r.known.earNotch ? "yes" : "unknown"} label="Ear notch" note={r.known.earNotch ? "Seen" : "Not noted"} />
          <Fact state={r.known.health === "none" ? "unknown" : "flag"} label="Health" note={r.known.health === "needs_help" ? "Flagged: needs help" : r.known.health === "injured" ? "Flagged: injured" : "No concern recorded"} />
          <p className="dz-known-note"><i aria-hidden /> Hatched means nothing is recorded. It never means no.</p>
        </section>

        <div className="dz-cols">
          <div className="dz-main">
            <section className="dz-sec" aria-labelledby="dz-hist">
              <header className="dz-sec-head">
                <h2 id="dz-hist" className="x-h2">Its history</h2>
                <p className="x-small">{r.events.length ? `${r.events.length} entr${r.events.length === 1 ? "y" : "ies"} from ${[...new Set(r.events.map((e) => SOURCE[e.source]))].join(", ")}.` : "Nothing has been recorded against this animal yet."}</p>
              </header>
              {years.length > 0 && (
                <ol className="dz-spine">
                  {years.map((y) => (
                    <li key={y.year} className="dz-year">
                      <h3 className={/^\d{4}$/.test(y.year) ? "" : "is-undated"}>{y.year}</h3>
                      <ol>
                        {y.items.map((stop) => (
                          <li key={stop.key} data-state={stop.kind}>
                            <time dateTime={stop.at ?? undefined}>{stop.at ? shortDay(stop.at) : "Date not recorded"}</time>
                            <div><b>{stop.label}</b>{stop.detail && <p>{stop.detail}</p>}{stop.href && <a href={stop.href} className="x-link">{stop.cta ?? "Open record"} →</a>}</div>
                          </li>
                        ))}
                      </ol>
                    </li>
                  ))}
                </ol>
              )}
              {gaps.length > 0 && (
                <div className="dz-gaps">
                  <h3 className="x-h3">Not yet on the record</h3>
                  <ul>
                    {gaps.map((g) => (
                      <li key={g.key} className={g.key === "help" ? "is-hot" : ""}>
                        <div><b>{g.label}</b>{g.detail && <p>{g.detail}</p>}</div>
                        {g.href && <a href={g.href} className="x-btn">{g.cta ?? "Add it"}</a>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {org}

            {chronology.length > 0 && (
              <details className="dz-sec dz-full">
                <summary><span className="x-h3">Every entry, with its source</span><span className="x-small">{chronology.length} entries, newest first</span></summary>
                <LivingChronology entries={chronology} />
              </details>
            )}

            <section className="dz-sec" aria-labelledby="dz-add">
              <header className="dz-sec-head"><h2 id="dz-add" className="x-h2">Seen {generated ? "this dog" : r.label}? <em>Add to its record</em></h2></header>
              <CommunityPanel id={r.id} label={r.label} needsHelp={r.known.health === "needs_help"} comments={r.comments} />
            </section>
          </div>

          <aside className="dz-side" aria-label="Where and whose record">
            {r.place && (
              <figure className="dz-area">
                <PlaceMap key={`${r.id}:${r.place.cell}`} variant="area" center={r.place.center} cells={r.place.cells} locality={r.locality} city={r.city} label={r.label} others={scope === "public" && r.place.here < 3 ? 0 : r.place.here} />
                <figcaption>The recorded area — a cell of about 0.7 km², never an exact location. <a href={mapHref} className="x-link">Open on the Atlas →</a></figcaption>
              </figure>
            )}
            <dl className="dz-prov">
              <div><dt>StrayPaw ID</dt><dd className="x-mono">{r.straypawId ?? "Pending"}</dd></div>
              {r.sourceCode && <div><dt>Source ID</dt><dd className="x-mono">{r.sourceCode}</dd></div>}
              <div><dt>Kept by</dt><dd>{r.keeper}</dd></div>
              <div><dt>Record</dt><dd>{scope === "org" ? "Organisation record" : "Public record"}</dd></div>
            </dl>
            <p className="dz-fine">A documented identity, not a claim of verified uniqueness: imported rows can describe the same animal twice. Recorded animals, never a population.</p>
          </aside>
        </div>
      </div>
    </article>
  );
}

const shortDay = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };

function Fact({ state, label, note, warn = false }: { state: "yes" | "no" | "unknown" | "flag"; label: string; note: string; warn?: boolean }) {
  return (
    <div className={`dz-fact is-${state}${warn ? " is-warn" : ""}`}>
      <i aria-hidden />
      <span><b>{label}</b><small>{note}</small></span>
    </div>
  );
}
