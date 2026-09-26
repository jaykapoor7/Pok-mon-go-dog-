"use client";

/* ════════════════════════════════════════════════════════════════════
   Insights: a brief on one place.

   Always one place, a city or a locality in it, never the whole platform.
   The page opens on its streets, drawn as cells shaded by how much is asked
   of them, with its name and three figures. Then the questions someone who
   works there would ask, each answered in one line computed from the record,
   with the evidence beside it and the thing to do next:

     what needs attention now · how fast teams get there · what happens to a
     request · what people call about · when it is busiest · where in the
     city · how much ABC and ARV is recorded · what is missing

   A question the place's record cannot answer yet is not drawn empty; it is
   named once, at the end. On the public record a locality never prints a
   count of one or two; it reads "few". The organisation's own view is the
   same brief over its own register, with its exports after it.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Map as MapIcon } from "lucide-react";
import { HexPlate } from "@/components/system/HexPlate";
import { ShareBand } from "@/components/system/ShareBand";
import { MiniBars } from "@/components/system/Spark";
import { PlaceSearch, type PlaceOption } from "@/components/app/PlaceSearch";
import { useSpatialDataset, type Scope } from "@/components/spatial/data";
import { fewOr, openOn } from "@/lib/spatial/engine";
import { animalKnowledge, casesIn, closureReasons, conditionOutcome, firstAction, FIRST_ACTION_BINS, localityTable, monthly, openAging, AGE_BINS } from "@/lib/spatial/measures";
import { completeness, FATE_META, FATES, fates, season } from "@/lib/spatial/report";
import { C, C_STRIDE, type SpatialDataset } from "@/lib/spatial/types";
import { CONDITIONS, DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";
import "./brief.css";

type Place = { city: number; locality: number };
type Period = "all" | "12m" | "90d";
const PERIODS: { id: Period; label: string; days: number | null }[] = [
  { id: "all", label: "All time", days: null },
  { id: "12m", label: "Last 12 months", days: 365 },
  { id: "90d", label: "Last 90 days", days: 90 },
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const REASON: Record<string, string> = {
  could_not_locate: "the animal could not be found", caller_unreachable: "the caller could not be reached", duplicate: "it was a duplicate",
  other_ngo: "another organisation took it", died: "the animal died first", recovered: "it recovered on its own", not_attended: "nobody attended",
};
const days = (d: number) => (d === 0 ? "the same day" : d === 1 ? "1 day" : d < 60 ? `${d} days` : `${Math.round(d / 30)} months`);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const listOf = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** The city with the most field work: where the record is deepest. */
function busiest(ds: SpatialDataset) {
  let city = 0;
  ds.cities.forEach((c, i) => { const b = ds.cities[city]; if (c.cases > b.cases || (c.cases === b.cases && c.animals > b.animals)) city = i; });
  return city;
}

type Answer = { id: string; q: string; a: ReactNode; detail?: ReactNode; evidence?: ReactNode; action?: { href: string; label: string } } | { id: string; q: string; missing: string };

export function PlaceBrief({ scope, tail = null, notice = null, userKey = null }: { scope: Scope; tail?: ReactNode; notice?: ReactNode; userKey?: string | null }) {
  const params = useSearchParams();
  const { ds, ix, loading, error } = useSpatialDataset(scope, userKey);
  const [place, setPlace] = useState<Place | null>(null);
  const [period, setPeriod] = useState<Period>("all");

  /* ── the place: from the link, else the city with the deepest record ── */
  useEffect(() => {
    if (!ds || place) return;
    let city = busiest(ds), locality = -1;
    const cell = params.get("cell"), name = params.get("city"), q = params.get("q");
    const ci = cell ? ds.cells.indexOf(cell) : -1;
    if (ci >= 0) { city = ds.cellCity[ci]; locality = ds.cellLocality[ci]; }
    else {
      const k = name ? ds.cities.findIndex((c) => c.name.toLowerCase() === name.toLowerCase()) : -1;
      if (k >= 0) city = k;
      if (q) { const li = ds.localities.findIndex((l) => l.toLowerCase() === q.toLowerCase()); if (li >= 0) locality = li; }
    }
    const p = params.get("p");
    if (p === "12m" || p === "90d") setPeriod(p);
    setPlace({ city, locality });
  }, [ds, place, params]);

  useEffect(() => {
    if (!ds || !place) return;
    const u = new URL(window.location.href);
    ["city", "q", "cell", "from", "to", "cond", "src", "p"].forEach((k) => u.searchParams.delete(k));
    u.searchParams.set("city", ds.cities[place.city].name);
    if (place.locality >= 0) u.searchParams.set("q", ds.localities[place.locality]);
    if (period !== "all") u.searchParams.set("p", period);
    window.history.replaceState(window.history.state, "", u.toString());
  }, [ds, place, period]);

  /* ── what is in scope ──────────────────────────────────────────────── */
  const scopeSets = useMemo(() => {
    if (!ds || !place) return null;
    const city = new Set<number>(), here = new Set<number>();
    for (let c = 0; c < ds.cells.length; c++) {
      if (ds.cellCity[c] !== place.city) continue;
      city.add(c);
      if (place.locality < 0 || ds.cellLocality[c] === place.locality) here.add(c);
    }
    return { city, here };
  }, [ds, place]);

  const today = ds?.today ?? 0;
  const from = PERIODS.find((p) => p.id === period)!.days;
  const fromDay = from ? today - from : 0;
  const idx = useMemo(() => (ds && scopeSets ? casesIn(ds, { cells: scopeSets.here, from: fromDay, to: today }) : []), [ds, scopeSets, fromDay, today]);
  const allIdx = useMemo(() => (ds && scopeSets ? casesIn(ds, { cells: scopeSets.here, from: 0, to: today }) : []), [ds, scopeSets, today]);
  const cityIdx = useMemo(() => (ds && scopeSets ? casesIn(ds, { cells: scopeSets.city, from: fromDay, to: today }) : []), [ds, scopeSets, fromDay, today]);

  const isLocality = !!place && place.locality >= 0;
  const guard = scope === "public" && isLocality;
  const n = (x: number) => fewOr(x, guard);
  // Mid-sentence, a sparse count reads "a few": "9 open, a few critical".
  const an = (x: number) => { const t = n(x); return t === "few" ? "a few" : t; };
  const cityName = ds && place ? ds.cities[place.city].name : "";
  const placeName = ds && place ? (isLocality ? ds.localities[place.locality] : cityName) : "";
  const mapBase = scope === "org" ? "/partner/map" : "/map";
  const mapHref = (mode: string, extra: Record<string, string> = {}) => {
    const q = new URLSearchParams({ mode, ...extra });
    if (ds && place) { q.set("city", cityName); if (isLocality) q.set("q", placeName); }
    return `${mapBase}?${q.toString()}`;
  };

  /* Everything that can be typed in the place search. */
  const options = useMemo<PlaceOption[]>(() => {
    if (!ds) return [];
    const seen = new Set<string>();
    const locs: PlaceOption[] = [];
    for (let c = 0; c < ds.cells.length; c++) {
      const l = ds.cellLocality[c]; if (l < 0) continue;
      const k = `${ds.cellCity[c]}:${l}`; if (seen.has(k)) continue; seen.add(k);
      locs.push({ key: `l${ds.cellCity[c]}:${l}`, name: ds.localities[l], city: ds.cities[ds.cellCity[c]]?.name ?? "" });
    }
    return [...ds.cities.map((c, i) => ({ key: `c${i}`, name: c.name, city: c.state ?? "" })), ...locs];
  }, [ds]);
  const pickPlace = (o: PlaceOption) => {
    if (o.key.startsWith("c")) setPlace({ city: Number(o.key.slice(1)), locality: -1 });
    else { const [c, l] = o.key.slice(1).split(":").map(Number); setPlace({ city: c, locality: l }); }
  };

  /* ── the plate: the city's cells, shaded by what is asked of them ──── */
  const plate = useMemo(() => {
    if (!ds || !place || !scopeSets) return null;
    const per = new Map<number, number>();
    for (const i of cityIdx) { const c = ds.cases[i * C_STRIDE + C.cell]; per.set(c, (per.get(c) ?? 0) + 1); }
    const max = Math.max(1, ...per.values());
    const ramp = ["var(--sp-nseq-1)", "var(--sp-nseq-2)", "var(--sp-nseq-3)", "var(--sp-nseq-4)", "var(--sp-nseq-5)"];
    return [...scopeSets.city].map((i) => {
      const v = per.get(i) ?? 0;
      return {
        key: ds.cells[i], ring: ds.rings[i],
        fill: v ? ramp[Math.min(4, Math.floor(Math.sqrt(v / max) * 5))] : "rgba(239,231,218,0.06)",
        selected: isLocality && ds.cellLocality[i] === place.locality,
        // With a locality chosen, the rest of the city steps back so it reads as the place.
        opacity: isLocality && ds.cellLocality[i] !== place.locality ? 0.35 : 1,
        title: `${ds.cellLocality[i] >= 0 ? ds.localities[ds.cellLocality[i]] : "Cell"}: ${fewOr(v, scope === "public")} requests`,
      };
    });
  }, [ds, place, scopeSets, cityIdx, isLocality, scope]);

  /* ── the answers ───────────────────────────────────────────────────── */
  const answers = useMemo<Answer[]>(() => {
    if (!ds || !ix || !place || !scopeSets) return [];
    const out: Answer[] = [];
    const where = isLocality ? `in ${placeName}` : `in ${cityName}`;

    /* 1. What needs attention now (always now, whatever the period). */
    {
      const aging = openAging(ds, allIdx, today);
      let critical = 0, oldest = -1;
      for (const i of allIdx) {
        if (!openOn(ds, i, today)) continue;
        const o = i * C_STRIDE;
        if (DEFAULT_TRIAGE[(CONDITIONS[ds.cases[o + C.cond]] ?? "Not recorded") as Condition] === "Critical") critical++;
        oldest = Math.max(oldest, today - ds.cases[o + C.day]);
      }
      if (!allIdx.length) out.push({ id: "now", q: "What needs attention now?", missing: "what needs attention now" });
      else out.push({
        id: "now", q: "What needs attention now?",
        a: aging.open ? <><b>{n(aging.open)}</b> request{aging.open === 1 ? " is" : "s are"} open{critical ? <>, <b className="is-hot">{an(critical)}</b> critical</> : null}.</> : <>Nothing is open {where}.</>,
        detail: aging.open ? <>The longest has waited {days(oldest)}{aging.bins[3] ? <>; {n(aging.bins[3])} {aging.bins[3] === 1 ? "has" : "have"} waited over 90 days and need a decision</> : null}.</> : "Every request on the record here has been dealt with.",
        evidence: aging.open ? <Bars rows={AGE_BINS.map((l, k) => ({ label: l, n: aging.bins[k], hot: k === 3 }))} fmt={n} /> : undefined,
        action: aging.open ? { href: mapHref("cases"), label: "See them on the map" } : undefined,
      });
    }

    /* 2. How fast field teams get there. */
    {
      const fa = firstAction(ds, idx);
      if (fa.known < 3 || fa.median === null) out.push({ id: "speed", q: "How fast do field teams get there?", missing: "how fast field teams get there" });
      else {
        const city = isLocality ? firstAction(ds, cityIdx) : null;
        const within3 = fa.bins[0] + fa.bins[1];
        out.push({
          id: "speed", q: "How fast do field teams get there?",
          a: <>Half the time, <b>{fa.median === 0 ? "the same day" : `within ${days(fa.median)}`}</b>.</>,
          detail: <>{pct(within3, fa.known)}% within three days, of the {n(fa.known)} requests with a recorded first action{city?.median != null ? <>. Across {cityName}: {city.median === 0 ? "the same day" : `within ${days(city.median)}`}</> : null}.</>,
          evidence: <Bars rows={FIRST_ACTION_BINS.map((l, k) => ({ label: l, n: fa.bins[k], hatch: k === 5, hot: k === 4 }))} fmt={n} />,
        });
      }
    }

    /* 3. What happens to a request. */
    {
      const by = fates(ds, idx), total = idx.length;
      if (total < 3) out.push({ id: "fate", q: "What happens to a request here?", missing: "what happens to a request" });
      else {
        const reasons = closureReasons(ds, idx);
        const named = reasons.parts.find((p) => p.reason !== "unspecified");
        const noAct = by.no_action + by.not_attended;
        out.push({
          id: "fate", q: "What happens to a request here?",
          a: <><b>{pct(by.closed, total)}%</b> closed after field work.</>,
          detail: noAct ? <>{an(noAct).replace(/^a/, "A")} closed without it{named ? <>, most often because {REASON[named.reason] ?? named.reason.replace(/_/g, " ")} ({n(named.n)})</> : null}{reasons.unspecified ? <>; {n(reasons.unspecified)} with no reason written down</> : null}.</> : "None closed without field work.",
          evidence: <ShareBand height={12} total={total} parts={FATES.map((f) => ({ key: f, n: by[f], color: FATE_META[f].color, hatch: FATE_META[f].hatch, label: FATE_META[f].short }))} />,
          action: noAct ? { href: mapHref("cases", { lens: "noaction" }), label: "Where they closed without action" } : undefined,
        });
      }
    }

    /* 4. What people call about. */
    {
      const rows = conditionOutcome(ds, idx).filter((r) => r.condition !== "Not recorded");
      const total = idx.length;
      if (rows.length < 1 || total < 3) out.push({ id: "why", q: "What are people calling about?", missing: "what people call about" });
      else {
        const top = rows[0];
        out.push({
          id: "why", q: "What are people calling about?",
          a: <><b>{top.condition}</b>, {pct(top.total, total)}% of requests.</>,
          detail: rows.length > 1 ? <>Then {listOf(rows.slice(1, 3).map((r) => r.condition.toLowerCase()))}.</> : undefined,
          evidence: <Bars rows={rows.slice(0, 5).map((r) => ({ label: r.condition, n: r.total, hot: DEFAULT_TRIAGE[r.condition] === "Critical" }))} fmt={n} />,
        });
      }
    }

    /* 5. When it is busiest. */
    {
      const s = season(ds, idx, today);
      const mo = monthly(ds, idx, Math.max(fromDay, today - 730), today);
      if (idx.length < 12 || !s.years.length) out.push({ id: "when", q: "When is it busiest?", missing: "when it is busiest" });
      else {
        const peakNames = s.peaks.map((k) => MONTHS[k]);
        const hi = s.peaks.length ? mo.total.map((_, k) => k).filter((k) => s.peaks.includes((mo.m0 + k) % 12)) : [];
        out.push({
          id: "when", q: "When is it busiest?",
          a: peakNames.length ? <><b>{listOf(peakNames)}</b>, every year on record.</> : s.surge ? <>No season; <b>{MONTHS[s.surge.month]} {s.surge.year}</b> was a surge.</> : <>No month stands out.</>,
          detail: s.yoy ? <>This year so far: {n(s.yoy.now)} requests, against {n(s.yoy.before)} in the same months last year.</> : undefined,
          evidence: <MiniBars values={mo.total} highlight={hi} w={260} h={44} label={`Requests per month ${where}, most recent two years`} />,
        });
      }
    }

    /* 6. Where in the city (for a city). */
    if (!isLocality) {
      const rows = localityTable(ds, ix, { cells: scopeSets.city, from: fromDay, to: today }, today).filter((r) => r.cases > 0);
      if (rows.length < 2) out.push({ id: "where", q: `Where in ${cityName} is the work?`, missing: `where in ${cityName} the work is` });
      else {
        const byOpen = [...rows].sort((a, b) => b.open - a.open || b.cases - a.cases);
        const top = byOpen[0];
        out.push({
          id: "where", q: `Where in ${cityName} is the work?`,
          a: top.open ? <><b>{top.name}</b> has the most open requests ({n(top.open)}).</> : <><b>{[...rows].sort((a, b) => b.cases - a.cases)[0].name}</b> asks for the most help.</>,
          detail: <>Across {rows.length} localities with requests. Choose one to read it on its own.</>,
          evidence: (
            <ol className="ib-rank">
              {byOpen.slice(0, 6).map((r) => (
                <li key={r.locality}>
                  <button type="button" onClick={() => setPlace({ city: place.city, locality: r.locality })}>
                    <span>{r.name}</span>
                    <i style={{ width: `${Math.max(4, (r.cases / Math.max(1, byOpen[0].cases, ...byOpen.map((x) => x.cases))) * 100)}%` }} aria-hidden />
                    <small className="sys-mono">{n(r.open)} open · {n(r.cases)}</small>
                  </button>
                </li>
              ))}
            </ol>
          ),
        });
      }
    }

    /* 7. How much ABC and ARV is recorded. */
    {
      const k = animalKnowledge(ds, ix, scopeSets.here, today);
      if (k.total < 3) out.push({ id: "abc", q: "How many animals here are sterilised and vaccinated?", missing: "how many animals are sterilised and vaccinated" });
      else out.push({
        id: "abc", q: "How many animals here are sterilised and vaccinated?",
        a: <><b>{pct(k.ster.yes, k.total)}%</b> recorded as sterilised, <b>{pct(k.vacc.yes, k.total)}%</b> as vaccinated.</>,
        detail: <>Of {n(k.total)} animals on the record. {pct(k.ster.unknown, k.total)}% have no sterilisation status at all, which is unknown, not no{k.due ? <>; {n(k.due)} {k.due === 1 ? "is" : "are"} due a booster</> : null}.</>,
        evidence: (
          <div className="ib-bands">
            <p>ABC</p><ShareBand height={10} legend={false} total={k.total} parts={[{ key: "y", n: k.ster.yes, color: "var(--sp-blue)", label: "Sterilised" }, { key: "n", n: k.ster.no, color: "var(--sp-ink)", label: "Not sterilised" }, { key: "u", n: k.ster.unknown, hatch: true, label: "Not recorded" }]} />
            <p>ARV</p><ShareBand height={10} legend={false} total={k.total} parts={[{ key: "y", n: k.vacc.yes, color: "var(--sp-arv)", label: "Vaccinated" }, { key: "n", n: k.vacc.no, color: "var(--sp-ink)", label: "Not vaccinated" }, { key: "u", n: k.vacc.unknown, hatch: true, label: "Not recorded" }]} />
          </div>
        ),
        action: { href: mapHref("abc"), label: "See where on the map" },
      });
    }

    /* 8. What is missing from the record. */
    {
      const gaps = completeness(ds, ix, idx, scopeSets.here, today).filter((g) => g.total >= 3 && g.known < g.total).sort((a, b) => a.known / a.total - b.known / b.total).slice(0, 3);
      if (gaps.length) out.push({
        id: "gaps", q: "What is missing from the record here?",
        a: <><b>{gaps[0].label}</b>, missing for {100 - pct(gaps[0].known, gaps[0].total)}% of {gaps[0].of}.</>,
        detail: <>Recording {gaps[0].next} is what would sharpen every answer above.</>,
        evidence: <Bars rows={gaps.map((g) => ({ label: g.label, n: g.total - g.known, of: g.total, hatch: true }))} fmt={n} missing />,
        action: scope === "org" ? { href: "/partner/animals?ster=unknown", label: "Record missing data" } : { href: "/report", label: "Report a sighting" },
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds, ix, place, scopeSets, idx, allIdx, cityIdx, isLocality, guard, fromDay, today]);

  const shown = answers.filter((x): x is Extract<Answer, { a: ReactNode }> => "a" in x);
  const missing = answers.filter((x): x is Extract<Answer, { missing: string }> => "missing" in x);
  const animalsHere = useMemo(() => (ds && ix && scopeSets ? animalKnowledge(ds, ix, scopeSets.here, today).total : 0), [ds, ix, scopeSets, today]);
  const openNowHere = useMemo(() => (ds ? allIdx.filter((i) => openOn(ds, i, today)).length : 0), [ds, allIdx, today]);
  const periodLabel = PERIODS.find((p) => p.id === period)!.label.toLowerCase();

  return (
    <div className={`ib ${scope === "org" ? "is-org" : ""}`}>
      {notice && <div className="ib-notice">{notice}</div>}

      {/* ── the place ──────────────────────────────────────────────── */}
      <header className="ib-head">
        <div className="ib-head-words">
          <p className="ib-kicker sys-mono">{scope === "org" ? "Your records" : "Insights"} · {periodLabel}</p>
          <h1>{placeName || <>&nbsp;</>}</h1>
          {isLocality && <p className="ib-city">{cityName}</p>}
          <dl className="ib-figs">
            <div><dt>requests for help</dt><dd>{ds ? n(idx.length) : "—"}</dd></div>
            <div><dt>open now</dt><dd>{ds ? n(openNowHere) : "—"}</dd></div>
            <div><dt>animals on record</dt><dd>{ds ? n(animalsHere) : "—"}</dd></div>
          </dl>
        </div>
        <div className="ib-plate">
          {plate && ds && place && (
            <HexPlate width={360} height={300} box={ds.cities[place.city].box} cells={plate} label={`Requests by cell in ${cityName}`}
              onCell={(key) => { const i = ds.cells.indexOf(key); if (i >= 0 && ds.cellLocality[i] >= 0) setPlace({ city: place.city, locality: ds.cellLocality[i] }); }} />
          )}
          <p className="ib-plate-note">Brighter cells ask for more help. Choose one to read its locality.</p>
        </div>
      </header>

      <div className="ib-bar">
        <PlaceSearch options={options} onPick={pickPlace} label="Choose a place" />
        {isLocality && ds && place && <button type="button" className="ib-up" onClick={() => setPlace({ city: place.city, locality: -1 })}>All of {cityName}</button>}
        <div className="ib-period" role="group" aria-label="Period">
          {PERIODS.map((p) => <button key={p.id} type="button" aria-pressed={period === p.id} className={period === p.id ? "is-on" : ""} onClick={() => setPeriod(p.id)}>{p.label}</button>)}
        </div>
        <Link href={mapHref("density")} className="ib-map"><MapIcon size={15} aria-hidden /> Open on the map</Link>
      </div>

      {/* ── the answers ────────────────────────────────────────────── */}
      <div className="ib-body">
        {loading && <p className="ib-state" role="status">Reading the register…</p>}
        {error && <p className="ib-state" role="status">{error}</p>}
        {shown.map((x, k) => (
          <section key={x.id} className="ib-q" aria-labelledby={`ib-${x.id}`} style={{ ["--i" as string]: k }}>
            <div className="ib-q-words">
              <h2 id={`ib-${x.id}`}>{x.q}</h2>
              <p className="ib-a">{x.a}</p>
              {x.detail && <p className="ib-detail">{x.detail}</p>}
              {x.action && <Link href={x.action.href} className="ib-act">{x.action.label} <ArrowUpRight size={14} aria-hidden /></Link>}
            </div>
            {x.evidence && <div className="ib-q-ev">{x.evidence}</div>}
          </section>
        ))}
        {missing.length > 0 && shown.length > 0 && (
          <p className="ib-missing">Not enough is recorded {isLocality ? `in ${placeName}` : `in ${cityName}`} {period !== "all" ? `in the ${periodLabel} ` : ""}to say {listOf(missing.map((m) => m.missing))} yet.</p>
        )}
        {ds && shown.length === 0 && !loading && (
          <p className="ib-state">Nothing is recorded {isLocality ? `in ${placeName}` : `in ${cityName}`} {period !== "all" ? `in the ${periodLabel} ` : ""}yet. Choose another place or period.</p>
        )}
        <p className="ib-foot">Recorded requests and recorded animals, never a population estimate.{guard ? " In a locality, one or two reads as “few”." : ""}</p>
        {tail}
      </div>
    </div>
  );
}

/* Ranked horizontal bars: a label, a bar to scale, the count. Hatched for
   what is not recorded; flame for the one row that needs attention. */
function Bars({ rows, fmt, missing = false }: { rows: { label: string; n: number; of?: number; hatch?: boolean; hot?: boolean }[]; fmt: (n: number) => string; missing?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.of ?? r.n));
  return (
    <ul className={`ib-bars ${missing ? "is-missing" : ""}`}>
      {rows.map((r) => (
        <li key={r.label} className={`${r.hot && r.n ? "is-hot" : ""} ${r.hatch ? "is-hatch" : ""}`}>
          <span className="ib-bars-l">{r.label}</span>
          <span className="ib-bars-t"><i style={{ width: `${r.n ? Math.max(2, (r.n / max) * 100) : 0}%` }} /></span>
          <span className="ib-bars-n sys-mono">{fmt(r.n)}{r.of ? <small> / {fmt(r.of)}</small> : null}</span>
        </li>
      ))}
    </ul>
  );
}
