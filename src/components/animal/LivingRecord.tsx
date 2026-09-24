/* ════════════════════════════════════════════════════════════════════
   The living record: one animal, as the register knows it.

   Read top to bottom it answers, in order: who is this and where, what is
   known about it (and what is not — hatched, never guessed), what has
   happened to it (the care lanes), what is still unfinished, the full
   chronology with where each entry came from, what the neighbours have
   added, and where it lives among the cells around it.

   The same record serves the public profile and the organisation's view;
   the organisation's tools and notes arrive as their own island, read
   under the member's session.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { HexPlate } from "@/components/system/HexPlate";
import { HatchDef } from "@/components/system/Hatch";
import type { Living, LivingEvent } from "@/lib/animal/living";
import { fewOr } from "@/lib/spatial/engine";
import { CareLanes } from "./CareLanes";
import { RecordActions } from "./RecordActions";
import { CommunityPanel } from "./CommunityPanel";
import "./living.css";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const since = (iso: string | null) => {
  if (!iso) return null;
  const d = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 86_400_000));
  return d < 1 ? "today" : d === 1 ? "yesterday" : d < 45 ? `${d} days ago` : d < 540 ? `${Math.round(d / 30)} months ago` : `${(d / 365).toFixed(1)} years ago`;
};
const SOURCE: Record<LivingEvent["source"], string> = { field: "field record", resident: "resident", import: "imported register" };

export function LivingRecord({ r, scope, org }: { r: Living; scope: "public" | "org"; org?: ReactNode }) {
  const reportHref = `/report?dog=${r.id}${r.place ? `&lat=${r.place.center[1]}&lng=${r.place.center[0]}` : ""}`;
  const mapHref = r.place ? `${scope === "org" ? "/partner/map" : "/map"}?mode=animals&cell=${r.place.cell}` : `/map?focus=animal:${r.id}`;
  const status = r.known.health === "needs_help" ? { t: "Needs help", c: "is-hot" }
    : r.open.cases ? { t: `${r.open.cases} open request${r.open.cases === 1 ? "" : "s"}`, c: "is-open" }
    : { t: "No open request", c: "" };
  const rows = r.events.map((e) => ({ date: e.date, kind: e.lane, title: e.title, source: SOURCE[e.source] }));
  const chronology = [...r.events].reverse();
  const unresolved: { k: string; t: ReactNode; href?: string; cta?: string }[] = [];
  if (r.known.health === "needs_help") unresolved.push({ k: "help", t: <>Somebody flagged this animal as <b>needing help</b>.</>, href: reportHref, cta: "Add what you see" });
  for (const c of r.cases.filter((x) => x.statusClass === "open" || x.statusClass === "in_progress")) {
    unresolved.push({ k: `c${c.id}`, t: <><b>{c.condition === "Not recorded" ? "A request" : c.condition}</b>, open since {day(c.opened)} — {since(c.opened)}.</>, href: scope === "org" ? `/partner/cases/${c.id}` : undefined, cta: scope === "org" ? "Open the case" : undefined });
  }
  if (r.open.followupsMissed) unresolved.push({ k: "miss", t: <><b>{r.open.followupsMissed}</b> follow-up{r.open.followupsMissed === 1 ? " was" : "s were"} missed.</> });
  if (r.open.followupsDue) unresolved.push({ k: "due", t: <><b>{r.open.followupsDue}</b> follow-up{r.open.followupsDue === 1 ? " is" : "s are"} due.</> });
  if (r.known.boosterDue) unresolved.push({ k: "boost", t: <>The last vaccination was <b>{since(r.known.vaccAt)}</b> — a booster is due.</> });
  if (r.known.ster === "unknown") unresolved.push({
    k: "ster", t: <>Nobody has recorded whether it is <b>sterilised</b>. {scope === "public" ? "A notched ear is the sign — note it if you see one." : ""}</>,
    href: scope === "org" ? "#org-care" : reportHref, cta: scope === "org" ? "Record sterilisation" : "Report a sighting",
  });

  const placeLine = [r.locality, r.city].filter(Boolean).join(", ");
  return (
    <article className="lr" aria-labelledby="lr-name">
      {/* ── who, and where ─────────────────────────────────────────── */}
      <header className="lr-mast">
        <div className={`lr-portrait ${r.photo ? "" : "is-place"}`}>
          {r.photo ? (
            <DogPhoto src={r.photo} alt={r.label} seed={r.id} tone={r.known.health === "needs_help" ? "urgent" : "neutral"} className="lr-photo" />
          ) : r.place ? (
            <figure className="lr-noplate">
              <HexPlate width={420} height={420} box={r.place.box} night label={`Where ${r.label} is recorded`}
                cells={r.place.cells.map((c) => ({ key: c.key, ring: c.ring, fill: c.self ? "var(--sp-flame)" : c.n ? ["#1b3f80", "#2a5bb8", "#4f7fe0", "#93b1f0"][Math.min(3, Math.floor(Math.sqrt(c.n / 30) * 4))] : "rgba(239,231,218,0.06)" }))} />
              <figcaption>No photograph yet. This is where it is recorded: its cell, in flame, among the cells around it.</figcaption>
            </figure>
          ) : <DogPhoto src={null} alt={r.label} seed={r.id} className="lr-photo" />}
          {r.photos.length > 1 && <span className="lr-count sys-mono">{r.photos.length} photographs</span>}
        </div>

        <div className="lr-id">
          <p className="lr-kicker">
            <span className="sys-eyebrow">StrayPaw record</span>
            {r.straypawId && <span className="lr-code sys-mono">{r.straypawId}</span>}
          </p>
          <h1 id="lr-name" className={r.label.length > 30 ? "is-long" : ""}>{r.label}</h1>
          <p className="lr-line">
            A {[/^(m|male)$/i.test(r.sex ?? "") ? "male" : /^(f|female)$/i.test(r.sex ?? "") ? "female" : null, r.colour?.toLowerCase()].filter(Boolean).join(", ")}{r.sex || r.colour ? " " : ""}street {r.species === "dog" ? "dog" : r.species}{placeLine ? <> in <b>{placeLine}</b></> : null}.
            {" "}On the register since <b>{day(r.firstSeen)}</b>{r.lastSeen ? <>; last seen <b>{since(r.lastSeen)}</b></> : null}.
          </p>
          <p className="lr-status">
            <span className={`lr-pill ${status.c}`}>{status.t}</span>
            <span className="lr-keeper">{r.keeper} · {r.source === "resident" ? "first reported by a resident" : "a field record"}</span>
          </p>
          <RecordActions id={r.id} label={r.label} place={placeLine || null} mapHref={mapHref} rows={rows} straypawId={r.straypawId} />
        </div>
      </header>

      {/* ── what is known ──────────────────────────────────────────── */}
      <section className="lr-known" aria-label="What is known">
        <Known title="Sterilisation" state={r.known.ster} yes="Sterilised" no="Not sterilised" when={r.known.sterAt ? `recorded ${day(r.known.sterAt)}` : r.known.ster === "yes" ? "on the record" : null} />
        <Known title="Vaccination" state={r.known.vacc} yes="Vaccinated" no="Not vaccinated" when={r.known.vaccAt ? `${day(r.known.vaccAt)}${r.known.boosterDue ? " · booster due" : ""}` : r.known.vacc === "yes" ? "on the record" : null} warn={r.known.boosterDue} />
        <div className={`lr-fact ${r.known.health !== "none" ? "is-hot" : ""}`}>
          <p className="lr-fact-t">Health</p>
          <p className="lr-fact-v">{r.known.health === "needs_help" ? "Needs help" : r.known.health === "injured" ? "Injured" : "No problem recorded"}</p>
          <p className="lr-fact-w">{r.known.health === "none" ? "which is not the same as healthy" : "flagged on the record"}</p>
        </div>
        <div className="lr-fact">
          <p className="lr-fact-t">Last seen</p>
          <p className="lr-fact-v">{since(r.lastSeen) ?? "Not recorded"}</p>
          <p className="lr-fact-w">{r.lastSeen ? day(r.lastSeen) : "no sighting yet"}{r.known.earNotch ? " · ear notched" : ""}</p>
        </div>
      </section>

      {/* ── what has happened ──────────────────────────────────────── */}
      <section className="lr-sec">
        <header className="lr-sec-head">
          <p className="lr-sec-n sys-mono">01</p>
          <h2>What has happened to it</h2>
          <p>{r.events.length ? `${r.cases.length} request${r.cases.length === 1 ? "" : "s"} for help, ${r.events.filter((e) => e.lane === "care").length} care event${r.events.filter((e) => e.lane === "care").length === 1 ? "" : "s"} and ${r.events.filter((e) => e.lane === "sight").length} sighting${r.events.filter((e) => e.lane === "sight").length === 1 ? "" : "s"}, on one clock.` : "Nothing has been recorded against this animal yet."}</p>
        </header>
        {r.events.length > 0 && <CareLanes events={r.events} from={r.firstSeen} label={`The record of ${r.label} over time`} />}
      </section>

      {/* ── what is unfinished ─────────────────────────────────────── */}
      {unresolved.length > 0 && (
        <section className="lr-sec">
          <header className="lr-sec-head">
            <p className="lr-sec-n sys-mono">02</p>
            <h2>What is unfinished</h2>
          </header>
          <ol className="lr-todo">
            {unresolved.map((u) => (
              <li key={u.k}><p>{u.t}</p>{u.href && u.cta && <Link href={u.href} className="lr-todo-cta">{u.cta} <ArrowUpRight size={13} /></Link>}</li>
            ))}
          </ol>
        </section>
      )}

      {org}

      {/* ── the chronology ─────────────────────────────────────────── */}
      <section className="lr-sec">
        <header className="lr-sec-head">
          <p className="lr-sec-n sys-mono">{unresolved.length ? "03" : "02"}</p>
          <h2>The chronology</h2>
          <p>Every entry, newest first, with where it came from.</p>
        </header>
        {chronology.length ? (
          <ol className="lr-chrono">
            {chronology.slice(0, 12).map((e) => <Chrono key={e.id} e={e} />)}
          </ol>
        ) : <p className="lr-quiet">The chronology starts with the first report, case or care event.</p>}
        {chronology.length > 12 && (
          <details className="lr-more">
            <summary>Show all {chronology.length} entries</summary>
            <ol className="lr-chrono">{chronology.slice(12).map((e) => <Chrono key={e.id} e={e} />)}</ol>
          </details>
        )}
      </section>

      {/* ── what neighbours have added ─────────────────────────────── */}
      <section className="lr-sec">
        <header className="lr-sec-head">
          <p className="lr-sec-n sys-mono">{unresolved.length ? "04" : "03"}</p>
          <h2>From the neighbourhood</h2>
          <p>Seen it, fed it, worried about it? Add it to the record.</p>
        </header>
        <CommunityPanel id={r.id} label={r.label} needsHelp={r.known.health === "needs_help"} comments={r.comments} />
      </section>

      {/* ── where it lives ─────────────────────────────────────────── */}
      {r.place && (
        <section className="lr-sec lr-place">
          <header className="lr-sec-head">
            <p className="lr-sec-n sys-mono">{unresolved.length ? "05" : "04"}</p>
            <h2>Where it lives</h2>
            <p>
              Its cell holds <b>{fewOr(r.place.here, scope === "public")}</b> recorded animal{r.place.here === 1 ? "" : "s"}. The darker cells around it hold more; the pale ones are where nobody has recorded one yet — which is not the same as none being there.
            </p>
            <p className="lr-place-links">
              <Link href={mapHref}>Open this cell on the map <ArrowUpRight size={13} /></Link>
              <Link href={`${scope === "org" ? "/partner/reports" : "/insights"}?cell=${r.place.cell}`}>Explain this place <ArrowUpRight size={13} /></Link>
            </p>
          </header>
          <figure className="lr-plate">
            <svg width="0" height="0" aria-hidden className="lr-defs"><defs><HatchDef id="lr-none" /></defs></svg>
            <HexPlate width={420} height={360} box={r.place.box} hatchId="lr-none" scaleBarKm={1} label={`The cells around ${r.label}`}
              cells={r.place.cells.map((c) => ({
                key: c.key, ring: c.ring,
                fill: c.n ? ["var(--sp-seq-1)", "var(--sp-seq-2)", "var(--sp-seq-3)", "var(--sp-seq-4)", "var(--sp-seq-5)"][Math.min(4, Math.floor(Math.sqrt(c.n / 30) * 5))] : "transparent",
                hatch: !c.n, selected: c.self, title: c.self ? `This animal's cell: ${c.n} recorded` : `${c.n} recorded`,
              }))} />
          </figure>
        </section>
      )}

      <footer className="lr-foot">
        <p>
          {r.straypawId && <><span className="sys-mono">{r.straypawId}</span> · </>}
          {r.sourceCode && <>source ID <span className="sys-mono">{r.sourceCode}</span> · </>}
          {r.keeper}
        </p>
        <p>Recorded animals, not population. Positions are shown to their cell, never finer. Notes from an organisation&rsquo;s own register stay with the organisation.</p>
      </footer>
    </article>
  );
}

function Known({ title, state, yes, no, when, warn = false }: { title: string; state: "yes" | "no" | "unknown"; yes: string; no: string; when: string | null; warn?: boolean }) {
  return (
    <div className={`lr-fact is-${state} ${warn ? "is-warn" : ""}`}>
      <p className="lr-fact-t"><i className={`lr-mark is-${state}`} aria-hidden />{title}</p>
      <p className="lr-fact-v">{state === "yes" ? yes : state === "no" ? no : "Not recorded"}</p>
      <p className="lr-fact-w">{state === "unknown" ? "unknown, not “no”" : when ?? ""}</p>
    </div>
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
