"use client";

/* ════════════════════════════════════════════════════════════════════
   The operations room: an organisation's day, in the order a field team
   asks for it.

   1. Where things stand, in one sentence, and the one action that starts
      work.
   2. The queue beside where the queue is. The queue holds LIVE work only:
      overdue follow-ups, then critical conditions, then the rest, oldest
      first. Cases open for months with nothing recorded are not live
      work; they would bury the queue, so they are counted separately and
      sent to review, where a person decides what happened. The plate
      beside the queue draws open work by cell; stale-only cells are
      hatched. Choose a cell to narrow the queue to it.
   3. What needs a decision: stale cases and reasonless closures, one
      line, one way in (case review already holds both tabs).
   4. What changed: the last few closed cases.

   Everything else this room used to repeat — sterilisation/vaccination
   share, where coverage is thin, missed-follow-up totals, the season's
   busy months, impossible dates — already has its own page (Analysis,
   Map, Data quality) and is one click away from the sidebar. Showing it
   twice was not a second feature, it was the same fact told again.

   Every figure is read live from the organisation's own records.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Plus, Search, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { TasksSection } from "@/components/partner/TasksSection";
import { HexPlate, type PlateCell } from "@/components/system/HexPlate";
import { HatchDef } from "@/components/system/Hatch";
import { OpsStreetMap, type OpenSpot } from "@/components/partner/OpsStreetMap";
import { useSpatialDataset } from "@/components/spatial/data";
import { getMyOrg } from "@/lib/actions";
import { dueFollowups, isStale, openCases, queueOrder, recentChanges, type Change, type DueFollowup, type OpenCase } from "@/lib/ops";
import { casesIn } from "@/lib/spatial/measures";
import { C, C_STRIDE } from "@/lib/spatial/types";
import { DEFAULT_TRIAGE, STATUS_META, type Condition, type StatusClass } from "@/lib/register/taxonomy";
import type { NGO } from "@/lib/types";
import "./ops.css";

const DAY = 86_400_000;
const num = (n: number) => n.toLocaleString("en-IN");
const ageDays = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY)) : 0);
const ago = (iso: string | null) => { const d = ageDays(iso); return d < 1 ? "today" : d === 1 ? "yesterday" : d < 31 ? `${d} days` : d < 365 ? `${Math.round(d / 30)} months` : `${(d / 365).toFixed(1)} years`; };
/* Imported animals are named "Dog · <locality> · <month>", so the place is
   printed once, not twice. */
const who = (c?: OpenCase) => {
  if (!c) return "";
  const name = (c.animal_name ?? "").trim(), place = (c.zone ?? "").trim();
  return [name, place && !name.toLowerCase().includes(place.toLowerCase()) ? place : "", c.case_code].filter(Boolean).join(" · ");
};
const critical = (c: { condition_class: string | null }) => DEFAULT_TRIAGE[(c.condition_class ?? "Not recorded") as Condition] === "Critical";
const CLOSURE_SHORT: Record<string, string> = {
  could_not_locate: "could not be found", died: "died", recovered: "recovered", caller_unreachable: "caller unreachable",
  other_ngo: "handed on", duplicate: "duplicate", not_attended: "not attended", other: "other", unspecified: "no reason recorded",
};

export function OpsRoom() {
  const { user, ready } = useAuth();
  const { member, ready: accessReady } = usePartnerAccess();
  const isMember = Boolean(user && member);
  const { ds, ix } = useSpatialDataset("org", user?.id ?? null, isMember);
  const [open, setOpen] = useState<OpenCase[] | null>(null);
  const [due, setDue] = useState<DueFollowup[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [org, setOrg] = useState<NGO | null>(null);
  const [today, setToday] = useState("");
  const [cell, setCell] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [queueRows, setQueueRows] = useState(8);
  const [cityPick, setCityPick] = useState<number | null>(null);
  /* Streets or cells: the same open work, drawn two ways. The choice is remembered. */
  const [geoView, setGeoView] = useState<"map" | "cells">("map");
  useEffect(() => { try { const v = localStorage.getItem("sp.ops.geo"); if (v === "map" || v === "cells") setGeoView(v); } catch { /* storage blocked */ } }, []);
  const pickView = (v: "map" | "cells") => { setGeoView(v); try { localStorage.setItem("sp.ops.geo", v); } catch { /* storage blocked */ } };

  useEffect(() => { setToday(new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })); }, []);
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 640px)");
    const apply = () => setQueueRows(phone.matches ? 5 : 8);
    apply(); phone.addEventListener("change", apply);
    return () => phone.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    if (!ready || !accessReady) return;
    /* Signed out, or not yet a member, is a real state: the empty workspace. */
    if (!isMember) { setOpen([]); setDue([]); setChanges([]); setOrg(null); return; }
    let live = true;
    Promise.all([openCases(), dueFollowups(), recentChanges(), getMyOrg().catch(() => null)])
      .then(([o, d, ch, g]) => { if (!live) return; setOpen(o); setDue(d); setChanges(ch); setOrg(g); })
      .catch(() => { if (live) { setOpen([]); setDue([]); setChanges([]); } });
    return () => { live = false; };
  }, [ready, accessReady, isMember]);

  /* ── the day's numbers ─────────────────────────────────────────────── */
  const s = useMemo(() => {
    const all = open ?? [];
    const now = Date.now();
    const stale = all.filter((c) => isStale(c, now));
    const liveWork = all.filter((c) => !isStale(c, now));
    const overdue = due.filter((f) => Date.parse(f.due_at) < now);
    const week = due.filter((f) => Date.parse(f.due_at) >= now);
    const crit = liveWork.filter(critical);
    return { all, stale, liveWork, overdue, week, crit };
  }, [open, due]);

  /* Sterilisation/vaccination share, coverage gaps, missed-follow-up
     totals and the season's busy months live on Analysis, Map and Data
     quality now, not here — reasonless closures are the one number this
     room still needs, to fold into the single "needs a decision" line. */
  const reg = useMemo(() => {
    if (!ds || !ix || !isMember) return null;
    const idx = casesIn(ds, { cells: null, from: 0, to: ds.today });
    const NO = ds.dict.status.indexOf("no_action"), NA = ds.dict.status.indexOf("not_attended"), UNSPEC = ds.dict.closure.indexOf("unspecified");
    let reasonless = 0;
    for (const i of idx) {
      const o = i * C_STRIDE, st = ds.cases[o + C.status], r = ds.cases[o + C.closure];
      if ((st === NO || st === NA) && (r < 0 || r === UNSPEC)) reasonless++;
    }
    return { reasonless, animals: ix.nAnimals };
  }, [ds, ix, isMember]);

  /* ── the queue: live work, what goes wrong first at the top ────────── */
  const queue = useMemo(() => {
    const items: { key: string; kind: "followup" | "case"; c?: OpenCase; f?: DueFollowup; crit: boolean; cell: string | null; age: number }[] = [];
    const byCase = new Map(s.all.map((c) => [c.id, c]));
    for (const f of s.overdue) {
      const c = f.case_id ? byCase.get(f.case_id) : undefined;
      items.push({ key: `f-${f.id}`, kind: "followup", f, c, crit: c ? critical(c) : false, cell: c?.h3_r8 ?? null, age: ageDays(f.due_at) });
    }
    for (const c of s.liveWork) items.push({ key: `c-${c.id}`, kind: "case", c, crit: critical(c), cell: c.h3_r8, age: ageDays(c.occurred_at) });
    return items.sort(queueOrder);
  }, [s]);
  const shown = cell ? queue.filter((q) => q.cell === cell) : queue;

  /* ── the plate: where the open work is ─────────────────────────────── */
  /* An organisation can work in more than one city: the plate opens on the
     city holding most of its open work, and every city with work can be
     chosen. */
  const cityWork = useMemo(() => {
    if (!ds || !isMember) return [] as { city: number; n: number }[];
    const cellIdx = new Map(ds.cells.map((k, i) => [k, i]));
    const n = new Array(ds.cities.length).fill(0);
    for (const c of [...s.liveWork, ...s.stale]) { const i = c.h3_r8 ? cellIdx.get(c.h3_r8) : undefined; if (i !== undefined) n[ds.cellCity[i]]++; }
    return n.map((v, city) => ({ city, n: v })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  }, [ds, isMember, s]);
  const plate = useMemo(() => {
    if (!ds || !isMember || !ds.cities.length) return null;
    const city = cityPick ?? cityWork[0]?.city ?? 0;
    const liveBy = new Map<string, number>(), staleBy = new Map<string, number>();
    for (const c of s.liveWork) if (c.h3_r8) liveBy.set(c.h3_r8, (liveBy.get(c.h3_r8) ?? 0) + 1);
    for (const c of s.stale) if (c.h3_r8) staleBy.set(c.h3_r8, (staleBy.get(c.h3_r8) ?? 0) + 1);
    const max = Math.max(1, ...liveBy.values());
    const ramp = ["var(--sp-att-1)", "var(--sp-att-2)", "var(--sp-att-3)", "var(--sp-att-4)"];
    const cells: PlateCell[] = [], spots: OpenSpot[] = [];
    for (let i = 0; i < ds.cells.length; i++) {
      if (ds.cellCity[i] !== city) continue;
      const key = ds.cells[i], v = liveBy.get(key) ?? 0, st = staleBy.get(key) ?? 0;
      if (v || st) spots.push({ key, lng: ds.centers[i * 2], lat: ds.centers[i * 2 + 1], live: v, stale: st });
      cells.push({
        key, ring: ds.rings[i],
        fill: v ? ramp[Math.min(3, Math.floor(Math.sqrt(v / max) * 4))] : "var(--sp-seq-0)",
        hatch: !v && st > 0,
        selected: key === cell || key === hot,
        title: `${ds.cellLocality[i] >= 0 ? ds.localities[ds.cellLocality[i]] : "Cell"}: ${v} live${st ? `, ${st} stale` : ""}`,
      });
    }
    return { cells, spots, box: ds.cities[city].box, name: ds.cities[city].name, city };
  }, [ds, isMember, s, cell, hot, cityPick, cityWork]);

  const loading = open === null || !ready || !accessReady;
  if (loading) return <main className="pr ops"><p className="ops-state">Reading the organisation&rsquo;s record…</p></main>;

  const blank = isMember && s.all.length === 0 && (reg?.animals ?? 0) === 0;
  const signedOut = !isMember;

  return (
    <main className="pr ops">
      <header className="ops-head">
        <div>
          <p className="ops-org">{org?.name ?? "Your organisation"}{today ? <> <span>·</span> {today}</> : null}</p>
          <h1>What needs attention</h1>
          {isMember && !blank && (
            <p className="ops-status">
              <b>{num(s.liveWork.length)}</b> cases are live{s.crit.length ? <>, <b className="is-hot">{num(s.crit.length)}</b> of them critical</> : null}.
              {s.overdue.length ? <> <b className="is-hot">{num(s.overdue.length)}</b> follow-up{s.overdue.length === 1 ? " is" : "s are"} overdue.</> : null}
              {s.stale.length ? <> <b>{num(s.stale.length)}</b> older cases have had nothing recorded in months and need a decision.</> : null}
            </p>
          )}
        </div>
        <div className="ops-head-actions">
          <Link href="/partner/cases/new" className="sys-btn is-flame"><Plus size={16} />New rescue case</Link>
          <Link href="/partner/records" className="sys-btn is-quiet"><Search size={14} />Find a record</Link>
        </div>
      </header>

      {(blank || signedOut) && (
        <section className="ops-setup">
          <div>
            <h2>{signedOut ? "Sign in to open your organisation’s record." : "Start with the records you already keep."}</h2>
            <p>{signedOut
              ? "The Field Workspace is open for anyone to look around; the records themselves load only for members of the organisation that keeps them."
              : "Import an existing workbook, open your first rescue case, or add an animal directly. StrayPaw keeps your own source IDs and builds a permanent animal identity underneath them."}</p>
          </div>
          <div className="ops-setup-actions">
            <Link href="/partner/import" className="sys-btn">Import workbook</Link>
            <Link href="/partner/cases/new" className="sys-btn is-quiet">New rescue case</Link>
          </div>
        </section>
      )}

      {/* The work, and where it is. */}
      <section className="pr-work ops-work" aria-label="Today’s operations">
        <div className="pr-queue ops-queue">
          <p className="ops-eyebrow"><span>The queue{cell ? " · one cell" : ""}</span><Link href="/partner/records">All records <ArrowUpRight size={12} /></Link></p>
          {cell && <button type="button" className="ops-chip" onClick={() => setCell(null)}>Showing one cell <X size={13} /></button>}
          {shown.length === 0
            ? <p className="ops-empty">{signedOut ? "Your organisation’s live work appears here." : blank ? "Nothing is queued yet. The first case you open appears here." : cell ? "Nothing live in this cell." : "No live case and nothing overdue. This is the state you want."}</p>
            : <ol className="ops-list">
                {shown.slice(0, queueRows).map((q) => {
                  const c = q.c, f = q.f;
                  const href = c ? `/partner/cases/${c.id}` : f?.dog_id ? `/partner/animals/${f.dog_id}` : "/partner/records?view=overdue";
                  return (
                    <li key={q.key} onPointerEnter={() => setHot(q.cell)} onPointerLeave={() => setHot(null)}>
                      <Link href={href} onFocus={() => setHot(q.cell)} onBlur={() => setHot(null)}>
                        <i className={`ops-mark ${q.kind === "followup" ? "is-due" : q.crit ? "is-crit" : ""}`} aria-hidden />
                        <span className="ops-what">
                          <b>{q.kind === "followup" ? "Follow-up overdue" : c?.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c?.title || "Open case"}</b>
                          <small>{who(c) || "Linked record"}</small>
                        </span>
                        <span className="ops-age">
                          <i style={{ width: `${Math.min(100, (q.age / 90) * 100)}%` }} className={q.age > 30 ? "is-long" : ""} aria-hidden />
                          <small>{q.kind === "followup" ? `due ${ago(f!.due_at)} ago` : `${STATUS_META[(c?.status_class ?? "open") as StatusClass]?.short ?? "Open"} · ${ago(c?.occurred_at ?? null)}`}</small>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>}
          {shown.length > queueRows && <Link href="/partner/records?view=rescue" className="ops-more">{num(shown.length - queueRows)} more live <ArrowUpRight size={13} /></Link>}
        </div>

        <div className="pr-geo ops-geo">
          <p className="ops-eyebrow">
            <span>Where it is{plate && cityWork.length <= 1 ? ` · ${plate.name}` : ""}</span>
            {plate && ds && cityWork.length > 1 && (
              <label className="ops-city"><span className="sys-sr">City</span>
                <select value={plate.city} onChange={(e) => { setCityPick(Number(e.target.value)); setCell(null); }}>
                  {cityWork.map((c) => <option key={c.city} value={c.city}>{ds.cities[c.city].name} · {num(c.n)} open</option>)}
                </select>
              </label>
            )}
            {plate && (
              <span className="ops-view" role="group" aria-label="Draw the open work as">
                <button type="button" aria-pressed={geoView === "map"} onClick={() => pickView("map")}>Map</button>
                <button type="button" aria-pressed={geoView === "cells"} onClick={() => pickView("cells")}>Cells</button>
              </span>
            )}
          </p>
          <div className="pr-map ops-map">
            {plate ? (
              <>
                {geoView === "map" ? (
                  <>
                    <OpsStreetMap spots={plate.spots} box={plate.box} selected={cell ?? hot}
                      label={`Open work on the streets of ${plate.name}`} onSpot={(k) => setCell((x) => (x === k ? null : k))} />
                    <p className="ops-map-key"><i className="is-dot" /> open cases, summed where cells are close <i className="is-ring" /> only stale <span>· tap to zoom in or narrow the queue · <a href="/partner/map?mode=cases">field map</a></span></p>
                  </>
                ) : (
                  <>
                    <svg width="0" height="0" aria-hidden className="ops-defs"><defs><HatchDef id="ops-stale" /></defs></svg>
                    <HexPlate width={440} height={360} box={plate.box} cells={plate.cells} hatchId="ops-stale" scaleBarKm={2}
                      label={`Open work by cell in ${plate.name}`} onCell={(k) => setCell((x) => (x === k ? null : k))} />
                    <p className="ops-map-key"><i className="is-live" /> live open work <i className="is-stale" /> only stale cases <span>· choose a cell to narrow the queue · <a href="/partner/map?mode=cases">field map</a></span></p>
                  </>
                )}
              </>
            ) : <p className="ops-map-empty">{signedOut ? "Sign in with your organisation's code to see where your open work is." : "Open work appears here by cell once a case carries a location."}</p>}
          </div>
        </div>

        <div className="pr-tasks ops-tasks"><TasksSection compact /></div>
      </section>

      {isMember && !blank && reg && (s.stale.length > 0 || reg.reasonless > 0) && (
        <section className="ops-decide" aria-label="Needs a decision">
          <p className="ops-eyebrow"><span>Needs a decision</span></p>
          <ol>
            <li>
              <b className={s.stale.length ? "is-hot" : ""}>{num(s.stale.length || reg.reasonless)}</b>
              <p>
                {s.stale.length > 0
                  ? <>cases open for months with nothing recorded{reg.reasonless > 0 ? <>, and <strong className="ops-decide-n">{num(reg.reasonless)}</strong> closed without a reason written down</> : ""}.</>
                  : <>requests closed without a reason written down.</>}
              </p>
              <Link href="/partner/review" className="sys-btn is-sm">Review</Link>
            </li>
          </ol>
        </section>
      )}

      {isMember && !blank && (
        <section className="ops-flow ops-flow-single" aria-label="Recent changes">
          <div>
            <p className="ops-eyebrow"><span>What changed</span><Link href="/partner/records">Record <ArrowUpRight size={12} /></Link></p>
            {changes.length ? (
              <ol className="ops-changes">
                {changes.slice(0, 4).map((c) => (
                  <li key={c.id}><Link href={`/partner/cases/${c.id}`}>
                    <span><b>{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title || "Case"}</b>
                      <small>{STATUS_META[(c.status_class ?? "unknown") as StatusClass]?.label}{c.closure_reason ? ` · ${CLOSURE_SHORT[c.closure_reason] ?? c.closure_reason}` : ""}{c.zone ? ` · ${c.zone}` : ""}</small></span>
                    <em>{ago(c.last_activity_at)}</em>
                  </Link></li>
                ))}
              </ol>
            ) : <p className="ops-empty">Closed cases and recorded outcomes show here.</p>}
          </div>
        </section>
      )}

    </main>
  );
}
