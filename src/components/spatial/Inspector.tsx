"use client";

/* ════════════════════════════════════════════════════════════════════
   The inspector: where the numbers live.

   The map surface carries shapes and colour and almost no text. Select a
   city, a locality, a cell or an unmapped edge and this panel reads it
   out: what is recorded, what is not, how well the place is known, what
   is open, and — for a thinly known place next to a busy one — why it is
   worth a visit. Every figure here is "recorded"; every share shows its
   unknown.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { ShareBand } from "@/components/system/ShareBand";
import { MiniBars } from "@/components/system/Spark";
import { getSupabase } from "@/lib/supabase";
import { COVERAGE_TEXT, COVERAGE_ORDER, cellStats, fewOr, FEW, fmt, isSparse, monthLabel, NO_FILTERS, type CellStat, type Index } from "@/lib/spatial/engine";
import { animalKnowledge, casesIn, conditionOutcome, monthly, statusTotals } from "@/lib/spatial/measures";
import type { NextCell, SpatialDataset } from "@/lib/spatial/types";
import { DEFAULT_TRIAGE, STATUS_META, type Condition, type StatusClass } from "@/lib/register/taxonomy";
import type { Scope } from "./data";

export type Sel =
  | { t: "india" }
  | { t: "city"; city: number }
  | { t: "locality"; city: number; locality: number }
  | { t: "cell"; cell: number }
  | { t: "empty"; key: string; city: number; center: [number, number] };

type CellAnimal = {
  id: string; name: string | null; code: string | null; straypaw_id: string | null; cover_photo: string | null;
  status: string | null; needs_help: boolean | null; sterilisation_status: string | null; vaccination_status: string | null;
  last_seen: string | null; zone: string | null; source?: string | null;
};

function useCellAnimals(key: string | null, scope: Scope) {
  const [rows, setRows] = useState<CellAnimal[] | null>(null);
  useEffect(() => {
    let live = true;
    setRows(null);
    if (!key) return;
    (async () => {
      if (scope === "org") {
        const supa = getSupabase();
        const { data } = (await supa?.from("dogs")
          .select("id,name,code,straypaw_id,cover_photo,status,needs_help,sterilisation_status,vaccination_status,last_seen,zone")
          .eq("h3_r8", key).order("needs_help", { ascending: false }).order("last_seen", { ascending: false }).limit(240)) ?? { data: [] };
        if (live) setRows((data ?? []) as CellAnimal[]);
      } else {
        const r = await fetch(`/api/spatial/cell?h=${key}`);
        const j = r.ok ? await r.json() : { animals: [] };
        if (live) setRows(j.animals ?? []);
      }
    })().catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, [key, scope]);
  return rows;
}

type CellCase = {
  id: string; case_code: string | null; title: string | null; condition_class: string | null; status_class: string | null;
  occurred_at: string | null; severity: string | null; assignee_name: string | null; animal_name: string | null;
  next_due: string | null; followups_missed: number | null;
};

/* A member's own cases in the cell, each a way into the case. The public
   map never lists cases: only what they add up to. */
function useCellCases(key: string | null, scope: Scope) {
  const [rows, setRows] = useState<CellCase[] | null>(null);
  useEffect(() => {
    let live = true;
    setRows(null);
    if (!key || scope !== "org") return;
    (async () => {
      const { data } = (await getSupabase()?.from("org_case_facts")
        .select("id,case_code,title,condition_class,status_class,occurred_at,severity,assignee_name,animal_name,next_due,followups_missed")
        .eq("h3_r8", key).order("occurred_at", { ascending: false }).limit(80)) ?? { data: [] };
      if (live) setRows((data ?? []) as CellCase[]);
    })().catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, [key, scope]);
  return rows;
}

const since = (iso: string | null) => {
  if (!iso) return "";
  const d = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  return d < 1 ? "today" : d < 31 ? `${d}d ago` : d < 365 ? `${Math.round(d / 30)}mo ago` : `${(d / 365).toFixed(1)}y ago`;
};

export function Inspector({ ds, ix, sel, t, scope, next, onSelect, onClose, onPickNext, compact, onExpand }: {
  ds: SpatialDataset; ix: Index; sel: Sel; t: number; scope: Scope; next: NextCell[];
  onSelect: (s: Sel) => void; onClose: () => void; onPickNext: (n: NextCell) => void;
  compact: boolean; onExpand: () => void;
}) {
  const cells = useMemo(() => {
    if (sel.t === "india") return null;
    const set = new Set<number>();
    for (let c = 0; c < ds.cells.length; c++) {
      if (sel.t === "city" && ds.cellCity[c] === sel.city) set.add(c);
      else if (sel.t === "locality" && ds.cellCity[c] === sel.city && ds.cellLocality[c] === sel.locality) set.add(c);
      else if (sel.t === "cell" && c === sel.cell) set.add(c);
    }
    return set;
  }, [ds, sel]);

  const stats = useMemo(() => {
    if (sel.t === "empty") return [] as CellStat[];
    const all = cellStats(ds, ix, t, NO_FILTERS, sel.t === "india" ? -1 : sel.t === "cell" ? ds.cellCity[sel.cell] : sel.city);
    return cells ? all.filter((s) => cells.has(s.cell)) : all;
  }, [ds, ix, t, sel, cells]);

  const scopeQ = useMemo(() => ({ cells, from: 0, to: t }), [cells, t]);
  const caseIdx = useMemo(() => (sel.t === "empty" ? [] : casesIn(ds, scopeQ)), [ds, scopeQ, sel.t]);
  const status = useMemo(() => statusTotals(ds, caseIdx), [ds, caseIdx]);
  const conds = useMemo(() => conditionOutcome(ds, caseIdx).filter((r) => r.condition !== "Not recorded").slice(0, 4), [ds, caseIdx]);
  const series = useMemo(() => monthly(ds, caseIdx, 0, t), [ds, caseIdx, t]);
  const know = useMemo(() => animalKnowledge(ds, ix, cells, t), [ds, ix, cells, t]);
  const openNow = stats.reduce((a, s) => a + s.open, 0);
  const critical = stats.reduce((a, s) => a + s.critical, 0);
  const cov = useMemo(() => {
    const m = Object.fromEntries(COVERAGE_ORDER.map((k) => [k, 0])) as Record<string, number>;
    for (const s of stats) m[s.coverage]++;
    return m;
  }, [stats]);
  const cityIdx = sel.t === "city" || sel.t === "locality" ? sel.city : sel.t === "cell" ? ds.cellCity[sel.cell] : sel.t === "empty" ? sel.city : -1;
  const frontierInCity = cityIdx >= 0 ? ds.frontier.filter((f) => f.city === cityIdx).length : ds.frontier.length;
  const nextHere = useMemo(() => {
    if (sel.t === "india") return next.slice(0, 5);
    if (sel.t === "cell") return next.filter((n) => n.cell === ds.cells[sel.cell]);
    if (sel.t === "empty") return next.filter((n) => n.cell === sel.key);
    return next.filter((n) => n.city === cityIdx && (sel.t !== "locality" || n.locality === ds.localities[sel.locality])).slice(0, 5);
  }, [sel, next, ds, cityIdx]);

  const cellKey = sel.t === "cell" ? ds.cells[sel.cell] : null;
  const animals = useCellAnimals(cellKey, scope);
  const cellCases = useCellCases(cellKey, scope);
  const orderedCases = useMemo(() => {
    if (!cellCases) return null;
    const open = (c: CellCase) => STATUS_META[(c.status_class ?? "unknown") as StatusClass]?.open ?? false;
    return [...cellCases].sort((a, b) => Number(open(b)) - Number(open(a)));
  }, [cellCases]);
  const profile = (id: string) => (scope === "org" ? `/partner/animals/${id}` : `/dog/${id}`);
  const analyticsHref = (() => {
    const base = scope === "org" ? "/partner/reports" : "/insights";
    if (sel.t === "city") return `${base}?city=${encodeURIComponent(ds.cities[sel.city].name)}`;
    if (sel.t === "locality") return `${base}?city=${encodeURIComponent(ds.cities[sel.city].name)}&q=${encodeURIComponent(ds.localities[sel.locality])}`;
    if (sel.t === "cell") return `${base}?cell=${ds.cells[sel.cell]}`;
    return base;
  })();

  /* ── titles ─────────────────────────────────────────────────────── */
  const title = sel.t === "india" ? "India"
    : sel.t === "city" ? ds.cities[sel.city].name
    : sel.t === "locality" ? ds.localities[sel.locality]
    : sel.t === "cell" ? (ds.cellLocality[sel.cell] >= 0 ? ds.localities[ds.cellLocality[sel.cell]] : "One cell")
    : "Not mapped yet";
  const kicker = sel.t === "india" ? "The register, by city"
    : sel.t === "city" ? `${ds.cities[sel.city].state || "City"} · as of ${monthLabel(monthOf(t))}`
    : sel.t === "locality" ? `Locality in ${ds.cities[sel.city].name}`
    : sel.t === "cell" ? "One cell · 0.74 km²"
    : "An unmapped cell at the edge of the record";

  const covOfCell = sel.t === "cell" ? stats[0]?.coverage : null;
  /* A small place on the public map shows one or two records as "few". */
  const guard = scope === "public" && (sel.t === "cell" || sel.t === "locality");
  const n = (x: number) => fewOr(x, guard);
  const anyFew = guard && [know.total, openNow, caseIdx.length].some(isSparse);
  const tooFewToShare = guard && know.total < FEW;

  return (
    <aside className={`sm-insp ${compact ? "is-compact" : ""}`} aria-label={`${title}: what the register holds`}>
      <header className="sm-insp-head">
        <div>
          <p className="sys-eyebrow">{kicker}</p>
          <h2>{title}</h2>
          {sel.t === "cell" && <p className="sm-insp-code sys-mono">{ds.cells[sel.cell]}</p>}
        </div>
        {sel.t !== "india" && <button type="button" className="sm-insp-x" onClick={onClose} aria-label="Step back out"><X size={17} /></button>}
      </header>

      {compact && sel.t !== "empty" && (
        <button type="button" className="sm-insp-peek" onClick={onExpand}>
          <span><b className="sys-mono">{n(know.total)}</b> animals</span>
          <span><b className="sys-mono">{n(openNow)}</b> open</span>
          <span><b className="sys-mono">{n(caseIdx.length)}</b> cases</span>
          <em>Details</em>
        </button>
      )}

      <div className="sm-insp-body">
        {sel.t === "india" && (
          <ol className="sm-insp-cities">
            {ds.cities.map((c, i) => (
              <li key={c.name}>
                <button type="button" onClick={() => onSelect({ t: "city", city: i })}>
                  <b>{c.name}</b><small>{c.state}</small>
                  <span className="sys-mono">{fmt(c.animals)}</span>
                </button>
              </li>
            ))}
          </ol>
        )}

        {sel.t === "empty" && (
          <div className="sm-insp-empty">
            <p>
              Nothing is recorded in this cell yet. That does not mean there are no dogs here — it means nobody has
              reported one. {nextHere[0] ? "The cells around it are busy:" : ""}
            </p>
            {nextHere[0] && <ul className="sm-insp-reasons">{nextHere[0].reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
            <Link href={`/report?lat=${sel.center[1]}&lng=${sel.center[0]}`} className="sys-btn is-flame">Report an animal here <ArrowUpRight size={15} /></Link>
          </div>
        )}

        {sel.t !== "india" && sel.t !== "empty" && (
          <>
            <div className="sm-insp-figs">
              <div><b className={isSparse(know.total) && guard ? "is-few" : ""}>{n(know.total)}</b><span>animals recorded</span></div>
              <div><b className={`${openNow ? "is-hot" : ""} ${isSparse(openNow) && guard ? "is-few" : ""}`}>{n(openNow)}</b><span>cases open{critical ? ` · ${n(critical)} critical` : ""}</span></div>
              <div><b className={isSparse(caseIdx.length) && guard ? "is-few" : ""}>{n(caseIdx.length)}</b><span>cases, all time</span></div>
            </div>
            {anyFew && <p className="sm-insp-quiet">“Few” is one or two records. On the public map a small place never shows an exact count that low.</p>}

            {sel.t === "cell" && covOfCell && (
              <p className={`sm-insp-cov is-${covOfCell}`}>
                <b>{COVERAGE_TEXT[covOfCell].label}.</b> {COVERAGE_TEXT[covOfCell].rule}.
              </p>
            )}

            {(sel.t === "city" || sel.t === "locality") && (
              <section className="sm-insp-sec">
                <h3>How well it is mapped</h3>
                <ShareBand
                  height={10}
                  parts={[
                    { key: "strong", n: cov.strong, color: "var(--sm-cov-strong)", label: "Well mapped" },
                    { key: "partial", n: cov.partial, color: "var(--sm-cov-partial)", label: "Partly" },
                    { key: "weak", n: cov.weak, color: "var(--sm-cov-weak)", label: "Weakly" },
                    { key: "insufficient", n: cov.insufficient, color: "var(--sm-cov-insufficient)", label: "1–2 records" },
                    ...(sel.t === "city" ? [{ key: "unmapped", n: frontierInCity, hatch: true, label: "Unmapped edge" }] : []),
                  ]}
                />
              </section>
            )}

            {tooFewToShare ? (
              <section className="sm-insp-sec">
                <h3>What is known about these animals</h3>
                <p className="sm-insp-quiet">Too few animals are recorded here for a share to mean anything.</p>
              </section>
            ) : <section className="sm-insp-sec">
              <h3>What is known about these animals</h3>
              <ShareBand height={8} legend={false} total={know.total} parts={[
                { key: "y", n: know.ster.yes, color: "var(--sp-blue)", label: "Sterilised" },
                { key: "n", n: know.ster.no, color: "var(--sp-muted)", label: "Not sterilised" },
                { key: "u", n: know.ster.unknown, hatch: true, label: "Sterilisation not recorded" },
              ]} />
              <p className="sm-insp-line"><span>ABC recorded</span><b className="sys-mono">{n(know.ster.yes + know.ster.no)}</b><em>of {n(know.total)}</em></p>
              <ShareBand height={8} legend={false} total={know.total} parts={[
                { key: "y", n: know.vacc.yes, color: "var(--sp-arv)", label: "Vaccinated" },
                { key: "n", n: know.vacc.no, color: "var(--sp-muted)", label: "Not vaccinated" },
                { key: "u", n: know.vacc.unknown, hatch: true, label: "Vaccination not recorded" },
              ]} />
              <p className="sm-insp-line"><span>ARV recorded</span><b className="sys-mono">{n(know.vacc.yes + know.vacc.no)}</b><em>{know.due ? `${n(know.due)} due a booster` : `of ${n(know.total)}`}</em></p>
            </section>}

            {caseIdx.length > 0 && (
              <section className="sm-insp-sec">
                <h3>Requests for help, by month</h3>
                <MiniBars values={series.total} w={300} h={34} label={`Requests per month from ${monthLabel(series.m0)}`} />
                <p className="sm-insp-line">
                  <span>Closed without field action</span>
                  <b className="sys-mono">{n(status.no_action + status.not_attended)}</b>
                  <em>{caseIdx.length >= 10 ? `${Math.round(((status.no_action + status.not_attended) / caseIdx.length) * 100)}%` : ""}</em>
                </p>
                {conds.length > 0 && (
                  <ul className="sm-insp-conds">
                    {conds.map((c) => (
                      <li key={c.condition}><span>{c.condition}</span><b className="sys-mono">{n(c.total)}</b></li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {sel.t === "cell" && scope === "org" && (
              <section className="sm-insp-sec">
                <h3>Your cases here</h3>
                {orderedCases === null ? <p className="sm-insp-quiet">Reading the cases…</p>
                  : orderedCases.length === 0 ? <p className="sm-insp-quiet">No cases of yours in this cell.</p>
                  : (
                    <ul className="sm-insp-animals sm-insp-cases">
                      {orderedCases.slice(0, 40).map((c) => {
                        const st = (c.status_class ?? "unknown") as StatusClass;
                        const crit = DEFAULT_TRIAGE[(c.condition_class ?? "Not recorded") as Condition] === "Critical";
                        return (
                          <li key={c.id}>
                            <Link href={`/partner/cases/${c.id}`}>
                              <i className={`sm-insp-casemark ${STATUS_META[st]?.open ? (crit ? "is-crit" : "is-open") : ""}`} aria-hidden />
                              <span className="sm-insp-who">
                                <b>{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title || "Case"}</b>
                                <small className="sys-mono">{[c.case_code, c.animal_name].filter(Boolean).join(" · ")}</small>
                              </span>
                              <span className="sm-insp-when">
                                <em className={STATUS_META[st]?.open && crit ? "is-hot" : ""}>{STATUS_META[st]?.short ?? "—"}</em>
                                <small>{c.followups_missed ? `${c.followups_missed} missed · ` : ""}{since(c.occurred_at)}</small>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
              </section>
            )}

            {sel.t === "cell" && (
              <section className="sm-insp-sec">
                <h3>Animals recorded here</h3>
                {animals === null ? <p className="sm-insp-quiet">Reading the cell…</p>
                  : animals.length === 0 ? <p className="sm-insp-quiet">No public animal records in this cell.</p>
                  : (
                    <ul className="sm-insp-animals">
                      {animals.slice(0, 40).map((a) => (
                        <li key={a.id}>
                          <Link href={profile(a.id)}>
                            <span className="sm-insp-ph">
                              {a.cover_photo ? <Image src={a.cover_photo} alt="" width={80} height={80} /> : <i aria-hidden />}
                            </span>
                            <span className="sm-insp-who">
                              <b>{a.name?.trim() || `Dog near ${a.zone || "this cell"}`}</b>
                              <small className="sys-mono">{a.straypaw_id ?? a.code ?? ""}</small>
                            </span>
                            <span className="sm-insp-when">
                              {a.needs_help ? <em className="is-hot">Needs help</em> : a.sterilisation_status === "sterilised" ? <em>ABC</em> : null}
                              <small>{since(a.last_seen)}</small>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                {animals && animals.length > 40 && <p className="sm-insp-quiet">and {fmt(animals.length - 40)} more in this cell</p>}
              </section>
            )}
          </>
        )}

        {nextHere.length > 0 && sel.t !== "empty" && (
          <section className="sm-insp-sec">
            <h3>{sel.t === "cell" ? "Why this cell is worth a visit" : "Map next"}</h3>
            {sel.t === "cell" ? (
              <ul className="sm-insp-reasons">{nextHere[0].reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            ) : (
              <ol className="sm-insp-next">
                {nextHere.map((n, i) => (
                  <li key={n.cell}>
                    <button type="button" onClick={() => onPickNext(n)}>
                      <i className="sys-mono">{i + 1}</i>
                      <span><b>{n.locality || "Unnamed cell"}</b><small>{n.reasons[1]} · {n.reasons[2]}</small></span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {sel.t !== "india" && sel.t !== "empty" && (
          <div className="sm-insp-acts">
            <Link href={analyticsHref} className="sys-btn is-quiet is-sm">Explain this area <ArrowUpRight size={14} /></Link>
            {sel.t === "cell" && (() => { const c = sel.cell; return <Link href={`/report?lat=${ds.centers[c * 2 + 1]}&lng=${ds.centers[c * 2]}`} className="sys-btn is-sm">Report here</Link>; })()}
          </div>
        )}
        <p className="sm-insp-foot">Recorded animals, not population. Positions are shown to their cell, never finer.</p>
      </div>
    </aside>
  );
}

function monthOf(day: number) { const d = new Date(Date.UTC(2024, 0, 1) + day * 86_400_000); return (d.getUTCFullYear() - 2024) * 12 + d.getUTCMonth(); }
