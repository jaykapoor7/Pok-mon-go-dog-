"use client";

/* ════════════════════════════════════════════════════════════════════
   Solutions: one record, four ways in. Each audience has its painted
   place (the same places as the homepage), the problem in their words,
   the workflow StrayPaw gives them, a live glimpse of the software and
   the way to start. The tab is kept in the URL (#residents, #ngos,
   #municipal, #partners) so a link lands on the right view; switching
   wipes the new view in like a brushstroke from the tab you chose.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Camera, Check, MapPin } from "lucide-react";
import { PlaceArt, type Queue, type CityBrief, type Loc } from "@/components/ecosystem/Commons";

const f = (n: number) => n.toLocaleString("en-IN");

const VIEWS = [
  {
    id: "residents", scene: "res", tab: "Residents and volunteers", title: <>See it. Report it. <em>Know what happened.</em></>,
    problem: "You see an animal in need and post it in a group. Someone may go; you rarely find out, and the next person who sees the same animal starts again.",
    flow: [["Report in a minute", "On WhatsApp or the web: a photo, the place and what you saw."], ["It reaches a queue", "Organisations working nearby see it in their workspace."], ["You hear back", "You see when an organisation accepts it."], ["The animal keeps a history", "Find animals near you on the map and follow what has been done."]],
    get: ["Your name is never shown publicly", "Places are shown to about 0.7 km²", "Sensitive photos are blurred by default", "Free first-aid and reporting courses in the Academy"],
    cta: [{ t: "Report an animal", h: "/community/report", p: true }, { t: "Explore the map", h: "/explore" }, { t: "Learn first aid", h: "/learn" }],
  },
  {
    id: "ngos", scene: "ngo", tab: "Animal welfare organisations", title: <>Every rescue, <em>owned and remembered.</em></>,
    problem: "Requests arrive across a dozen chats. Nobody owns them, follow-ups slip, and an animal's history lives in one volunteer's phone.",
    flow: [["One inbox", "Reports from WhatsApp and the web land in one queue, by urgency and age."], ["Owned cases", "Accept, assign, treat and close with an outcome; someone always holds it."], ["Follow-ups that do not slip", "Rechecks and next steps are written to the case and come back on time."], ["History that travels", "Care lands on the animal's StrayPaw ID, for the next team too."]],
    get: ["Bring your existing register; it stays yours and credited", "Team roles and invite codes", "Search, filters and exports", "Free for verified organisations"],
    cta: [{ t: "Apply to join", h: "/partner-apply", p: true }, { t: "StrayPaw for NGOs", h: "/for-ngos" }, { t: "Sign in with your code", h: "/join" }],
  },
  {
    id: "municipal", scene: "city", tab: "Municipal teams", title: <>See where help is needed, <em>area by area.</em></>,
    problem: "Sterilisation drives and response teams are planned without knowing where requests come from, what care is recorded, or what is simply not known.",
    flow: [["Requests by locality", "Where residents ask for help, from the live record."], ["Recorded, not recorded, unknown", "Care is shown in three states; unknown is never counted as no."], ["Coverage and gaps", "Which areas have records and which have none."], ["Briefs to share", "A city brief with its sources and limits stated beside every figure."]],
    get: ["Live city briefs", "Concentration by locality", "Limits of the evidence named", "Analysis areas of about 0.7 km² (ward boundaries are next)"],
    cta: [{ t: "StrayPaw for cities", h: "/for-governments", p: true }, { t: "Talk to us", h: "/contact?subject=Municipal%20enquiry" }],
  },
  {
    id: "partners", scene: "fund", tab: "Partners and funders", title: <>Fund work <em>you can check.</em></>,
    problem: "Rescue and care work is hard to verify from outside. Reports are written after the fact, and figures rarely say where they came from.",
    flow: [["Work is recorded as it happens", "Cases, care and outcomes land on the record the day they are done."], ["History kept apart", "Imported registers are labelled apart from live work."], ["Every figure sourced", "Each number names its source and its scope."], ["Evidence to share", "Reports for partners, exported as PDF."]],
    get: ["Evidence reports", "The method, published", "Field partners named, listings never called partnerships", "One shared record across organisations"],
    cta: [{ t: "StrayPaw for funders", h: "/for-funders", p: true }, { t: "Work with us", h: "/partner-apply" }, { t: "How sources are checked", h: "/evidence" }],
  },
] as const;

export function Audiences({ queue, brief, locs }: { queue: Queue; brief: CityBrief; locs: Loc[] }) {
  const [i, setI] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]), root = useRef<HTMLDivElement>(null);

  /* the URL names the view */
  useEffect(() => {
    const read = () => { const h = window.location.hash.slice(1); const j = VIEWS.findIndex((v) => v.id === h); if (j >= 0) setI(j); };
    read(); window.addEventListener("hashchange", read); return () => window.removeEventListener("hashchange", read);
  }, []);
  const choose = (j: number, focus = false) => {
    const t = tabs.current[j], p = root.current;
    if (t && p) { const r = t.getBoundingClientRect(), pr = p.getBoundingClientRect(); p.style.setProperty("--ox", `${r.left + r.width / 2 - pr.left}px`); p.style.setProperty("--oy", `${r.top + r.height / 2 - pr.top}px`); }
    setI(j); history.replaceState(null, "", `#${VIEWS[j].id}`); if (focus) t?.focus();
  };
  const onKey = (e: React.KeyboardEvent, j: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); choose((j + 1) % VIEWS.length, true); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); choose((j + VIEWS.length - 1) % VIEWS.length, true); }
  };
  const v = VIEWS[i];

  return (
    <div className="au" ref={root}>
      <div className="au-tabs" role="tablist" aria-label="Who StrayPaw is for">
        {VIEWS.map((x, j) => (
          <button key={x.id} ref={(el) => { tabs.current[j] = el; }} id={`tab-${x.id}`} type="button" role="tab" aria-selected={i === j} aria-controls="au-panel" tabIndex={i === j ? 0 : -1}
            className={i === j ? "is-on" : ""} onClick={() => choose(j)} onKeyDown={(e) => onKey(e, j)}>
            <i aria-hidden>{String(j + 1).padStart(2, "0")}</i>{x.tab}
          </button>
        ))}
      </div>

      <div className="au-panel" id="au-panel" role="tabpanel" aria-labelledby={`tab-${v.id}`} key={v.id}>
        <div className="au-art"><PlaceArt k={v.scene} className="au-place" /></div>
        <div className="au-main">
          <h2>{v.title}</h2>
          <p className="au-problem"><b>The problem</b>{v.problem}</p>
          <ol className="au-flow">{v.flow.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ol>
          <ul className="au-get">{v.get.map((g) => <li key={g}><Check size={14} aria-hidden />{g}</li>)}</ul>
          <div className="au-acts">{v.cta.map((c) => <Link key={c.h} href={c.h} className={`co3-btn ${"p" in c && c.p ? "is-flame" : "is-line"}`}>{c.t}{"p" in c && c.p && <ArrowUpRight size={16} aria-hidden />}</Link>)}</div>
        </div>
        <aside className="au-live" aria-label="A glimpse of the software">
          {v.id === "residents" && (
            <article className="ec-scr">
              <header><b>Report an animal</b><small>Community · the real flow</small></header>
              <ol className="ec-form">
                <li><Camera size={16} aria-hidden /><span><b>Photo</b><small>1 added · blurred if it may show an injury</small></span><Check size={15} aria-hidden /></li>
                <li><MapPin size={16} aria-hidden /><span><b>Where</b><small>Placed to about 0.7 km²</small></span><Check size={15} aria-hidden /></li>
                <li><i aria-hidden /><span><b>What you saw</b><small>Injured · bleeding back leg</small></span><Check size={15} aria-hidden /></li>
              </ol>
              <p className="ec-receipt"><b>Received</b><span>Not yet accepted by an organisation. You will see when it is.</span></p>
            </article>
          )}
          {v.id === "ngos" && (
            <article className="ec-scr">
              <header><b>Today&rsquo;s work</b><small>NGO workspace · live record</small></header>
              <ol className="ec-q">{queue.slice(0, 5).map((q, j) => <li key={j} className={q.critical ? "is-crit" : ""}><b>{q.condition}</b><span>{q.locality}</span><em>{q.days === 0 ? "today" : `${q.days}d`}</em></li>)}</ol>
              <p className="ec-note">Real open requests on the public record. No organisation is named.</p>
            </article>
          )}
          {v.id === "municipal" && (
            <article className="ec-scr">
              <header><b>{brief?.city ?? "City"} brief</b><small>Municipal view · live record</small></header>
              {brief && <dl className="ec-figs"><div><dt>Animals on the record</dt><dd>{f(brief.animals)}</dd></div><div><dt>Mapped areas</dt><dd>{f(brief.cells)}</dd></div><div><dt>Recorded sterilised</dt><dd>{f(brief.sterilised)}</dd></div><div><dt>Not recorded</dt><dd>{f(brief.ster_unknown)}</dd></div></dl>}
              <ol className="ec-bars">{locs.slice(0, 4).map((l) => <li key={l.name}><span>{l.name}</span><b>{f(l.open)}</b><i style={{ width: `${(l.open / Math.max(1, locs[0]?.open ?? 1)) * 100}%` }} /></li>)}</ol>
            </article>
          )}
          {v.id === "partners" && (
            <article className="ec-scr">
              <header><b>Evidence of work</b><small>Report · {brief?.city ?? "city"} · public record</small></header>
              {brief && <dl className="ec-figs"><div><dt>Requests for help</dt><dd>{f(brief.cases)}</dd></div><div><dt>Animals on the record</dt><dd>{f(brief.animals)}</dd></div></dl>}
              <ul className="ec-checks"><li><Check size={14} aria-hidden />Every figure names its source</li><li><Check size={14} aria-hidden />Imported history labelled apart from live work</li><li><Check size={14} aria-hidden />Exports for partners, as PDF</li></ul>
            </article>
          )}
        </aside>
      </div>
    </div>
  );
}
