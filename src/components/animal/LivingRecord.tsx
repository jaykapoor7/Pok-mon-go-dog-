/* ════════════════════════════════════════════════════════════════════
   The living record: one animal, as the register knows it.

   It opens on the streets the animal is recorded among, with its name set
   on them. Beside that sits its record tag: the ID, the dates, and a row
   of tick boxes for what is known, hatched where nothing is recorded,
   never guessed. Then the record itself, as a route: every report, every
   piece of care, every closure in order, with the time between them on the
   line, and the route carrying on dashed to what nobody has recorded yet.
   The full chronology, with where each entry came from, sits under it.

   The same record serves the public profile and the organisation's view;
   the organisation's tools and notes arrive as their own island, read
   under the member's session.
   ════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { Route, type RouteStop } from "@/components/system/Route";
import { PlaceMap } from "./PlaceMap";
import type { Living, LivingEvent } from "@/lib/animal/living";
import { RecordActions } from "./RecordActions";
import { CommunityPanel } from "./CommunityPanel";
import "./living.css";
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
    href: scope === "org" ? "#org-care" : reportHref, cta: scope === "org" ? "Record sterilisation" : "Report a sighting",
  });
  if (r.known.vacc === "unknown") gaps.push({
    key: "vacc", at: null, kind: "missing", label: "Vaccination", detail: "No anti-rabies vaccination on the record.",
    ...(scope === "org" ? { href: "#org-care", cta: "Record vaccination" } : {}),
  });
  return [...shown, ...gaps];
}

export function LivingRecord({ r, scope, org, trail }: { r: Living; scope: "public" | "org"; org?: ReactNode; trail?: ReactNode }) {
  const reportHref = `/report?dog=${r.id}${r.place ? `&lat=${r.place.center[1]}&lng=${r.place.center[0]}` : ""}`;
  const mapHref = r.place ? `${scope === "org" ? "/partner/map" : "/map"}?mode=animals&cell=${r.place.cell}` : `/map?focus=animal:${r.id}`;
  const status = r.known.health === "needs_help" ? { t: "Needs help", c: "is-hot" }
    : r.open.cases ? { t: `${r.open.cases} open request${r.open.cases === 1 ? "" : "s"}`, c: "is-open" }
    : { t: "No open request", c: "" };
  const rows = r.events.map((e) => ({ date: e.date, kind: e.lane, title: e.title, source: SOURCE[e.source] }));
  const chronology = [...r.events].reverse();
  const stops = routeOf(r, scope, reportHref);
  const placeLine = joinPlace(r.locality, r.city);
  const sex = /^(m|male)$/i.test(r.sex ?? "") ? "Male" : /^(f|female)$/i.test(r.sex ?? "") ? "Female" : null;
  const what = [sex, r.colour ? cap(r.colour.toLowerCase()) : null, r.species === "dog" ? "street dog" : r.species].filter(Boolean).join(" · ");

  return (
    <article className="lr" aria-labelledby="lr-name">
      {trail}

      {/* ── where, with its name set on it ────────────────────────── */}
      <header className={`lr-hero ${r.place ? "" : "is-noplace"}`}>
        {r.place ? (
          <PlaceMap variant="banner" center={r.place.center} cells={r.place.cells} locality={r.locality} city={r.city} label={r.label} others={scope === "public" && r.place.here < 3 ? 0 : r.place.here} />
        ) : null}
        {!r.place && <p className="lr-hero-noplace sys-mono">Its place is not on the record yet</p>}
        <div className="lr-hero-words">
          {placeLine && <p className="lr-hero-k sys-mono">{placeLine}</p>}
          <h1 id="lr-name" className={r.label.length > 30 ? "is-long" : ""}>{r.label}</h1>
          <p className="lr-hero-line">
            On the register since <b>{day(r.firstSeen)}</b>{r.lastSeen ? <>; last seen <b>{since(r.lastSeen)}</b></> : null}.
            {r.place && r.place.here >= 3 ? <> One of <b>{r.place.here}</b> animals recorded in its area, which is drawn, never a spot.</> : <> Its area is drawn, never a spot.</>}
          </p>
        </div>
      </header>

      <div className="lr-body">
        {/* ── the record tag: the one lifted object on the page ──────── */}
        <aside className="lr-tag" aria-label="The record at a glance">
          <div className={`lr-tag-photo ${r.photo ? "" : "is-none"}`}>
            {r.photo
              ? <DogPhoto src={r.photo} alt={r.label} seed={r.id} tone={r.known.health === "needs_help" ? "urgent" : "neutral"} className="lr-photo" />
              : <span>No photograph yet</span>}
            {r.photos.length > 1 && <span className="lr-count sys-mono">{r.photos.length} photographs</span>}
          </div>
          <div className="lr-tag-body">
            <p className="lr-tag-top">
              <span className="lr-tag-id sys-mono">{r.straypawId ?? "ID pending"}</span>
              <span className={`lr-pill ${status.c}`}>{status.t}</span>
            </p>
            {what && <p className="lr-tag-what">{what}</p>}
            <dl className="lr-tag-rows">
              <div><dt>On the register</dt><dd className="sys-mono">{day(r.firstSeen)}</dd></div>
              <div><dt>Last seen</dt><dd className="sys-mono">{r.lastSeen ? day(r.lastSeen) : "not recorded"}</dd></div>
              <div><dt>Kept by</dt><dd>{r.keeper}</dd></div>
            </dl>
            <ul className="lr-checks" aria-label="What is known">
              <Check state={r.known.ster} label="Sterilised" note={r.known.ster === "unknown" ? "not recorded" : r.known.sterAt ? day(r.known.sterAt) : r.known.ster === "no" ? "recorded as not" : "on the record"} />
              <Check state={r.known.vacc} label="Vaccinated" note={r.known.vacc === "unknown" ? "not recorded" : r.known.boosterDue ? "booster due" : r.known.vaccAt ? day(r.known.vaccAt) : r.known.vacc === "no" ? "recorded as not" : "on the record"} warn={r.known.boosterDue} />
              <Check state={r.known.earNotch ? "yes" : "unknown"} label="Ear notched" note={r.known.earNotch ? "seen" : "not noted"} />
              <Check state={r.known.health === "none" ? "unknown" : "flag"} label={r.known.health === "needs_help" ? "Needs help" : r.known.health === "injured" ? "Injured" : "Health"} note={r.known.health === "none" ? "no concern recorded" : "flagged"} />
            </ul>
            <p className="lr-tag-note">Hatched: not recorded, which is not the same as no.</p>
          </div>
        </aside>

        <div className="lr-main">
          <RecordActions id={r.id} label={r.label} place={placeLine || null} mapHref={mapHref} rows={rows} straypawId={r.straypawId} />

          {/* ── the record, as a route ───────────────────────────────── */}
          <section className="lr-sec" aria-labelledby="lr-route-h">
            <header className="lr-sec-head">
              <h2 id="lr-route-h">Its record</h2>
              <p>{stops.some((s) => s.kind === "missing") ? "From the first entry to today. Dashed: what nobody has recorded yet." : "From the first entry to today."}</p>
            </header>
            {stops.length ? <Route stops={stops} label={`The record of ${r.label}, in order`} /> : <p className="lr-quiet">Nothing has been recorded against this animal yet.</p>}
          </section>

          {org}

          {chronology.length > 0 && (
            <details className="lr-more">
              <summary>Every entry, with where it came from ({chronology.length})</summary>
              <ol className="lr-chrono">{chronology.map((e) => <Chrono key={e.id} e={e} />)}</ol>
            </details>
          )}

          {/* ── what neighbours have added ─────────────────────────────── */}
          <section className="lr-sec">
            <header className="lr-sec-head">
              <h2>Seen it? Add to its record</h2>
            </header>
            <CommunityPanel id={r.id} label={r.label} needsHelp={r.known.health === "needs_help"} comments={r.comments} />
          </section>

          <footer className="lr-foot">
            <p>
              {r.straypawId && <><span className="sys-mono">{r.straypawId}</span> · </>}
              {r.sourceCode && <>source ID <span className="sys-mono">{r.sourceCode}</span> · </>}
              {r.keeper}
            </p>
            <p>Recorded animals, not population. Positions are shown to their cell, never finer.</p>
          </footer>
        </div>
      </div>
    </article>
  );
}

/* A tick box on a survey form: ticked, crossed, flagged, or hatched when
   nothing is recorded. */
function Check({ state, label, note, warn = false }: { state: "yes" | "no" | "unknown" | "flag"; label: string; note: string; warn?: boolean }) {
  return (
    <li className={`lr-check is-${state} ${warn ? "is-warn" : ""}`}>
      <i aria-hidden />
      <b>{label}</b>
      <span>{note}</span>
    </li>
  );
}

function Chrono({ e }: { e: LivingEvent }) {
  return (
    <li className={`lr-ch is-${e.lane}`}>
      <span className="lr-ch-date sys-mono">{day(e.date)}</span>
      <i className={`lr-ch-mark is-${e.tone}`} aria-hidden />
      <span className="lr-ch-what">
        <b>{e.title}</b>
        {e.note && <span>{e.note}</span>}
      </span>
      <span className="lr-ch-src">{SOURCE[e.source]}</span>
    </li>
  );
}
