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
     city · how much ABC and ARV is recorded

   A question the place's record cannot answer yet is not drawn empty; it is
   named once, at the end. On the public record a locality never prints a
   count of one or two; it reads "few". The organisation's own view is the
   same brief over its own register, with its exports after it.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const PHONE_FIRST = 2;
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { HexPlate } from "@/components/system/HexPlate";
import { ShareBand } from "@/components/system/ShareBand";
import { MiniBars } from "@/components/system/Spark";
import { PlaceSearch, type PlaceOption } from "@/components/app/PlaceSearch";
import { PlaceGate, type GateState } from "@/components/app/PlaceGate";
import { reachOf, usePlace } from "@/lib/place";
import { useSpatialDataset, type Scope } from "@/components/spatial/data";
import { fewOr, openOn } from "@/lib/spatial/engine";
import { animalKnowledge, casesIn, closureReasons, conditionOutcome, firstAction, FIRST_ACTION_BINS, localityTable, monthly, openAging, AGE_BINS } from "@/lib/spatial/measures";
import { FATE_META, FATES, fates, season } from "@/lib/spatial/report";
import { C, C_STRIDE, type SpatialDataset } from "@/lib/spatial/types";
import { CONDITIONS, DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";
import "./brief.css";
import "./insights-x.css";

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
  const router = useRouter();
  const pathname = usePathname();
  const requestedCity = params.get("city");
  const { ds, ix, loading, error, cities: cityList } = useSpatialDataset(scope, userKey);
  const [place, setPlace] = useState<Place | null>(null);
  const [allShown, setAllShown] = useState(false);
  const [period, setPeriod] = useState<Period>("all");
  const mine = usePlace();
  const [gate, setGate] = useState<GateState | null>(null);
  useEffect(() => { setPlace(null); }, [requestedCity, scope, userKey]);

  /* ── the place: links and saved places win. A public visitor outside the
     record still gets a real, current sample city instead of a dead-end
     "not reached" screen; they can choose their own place in the bar. ── */
  useEffect(() => {
    if (!ds || place || !mine.ready) return;
    // A city selection can arrive before its replacement dataset. Wait for it
    // rather than restoring the old city's name and indices into the URL.
    if (requestedCity && cityList.some(c => c.city === requestedCity) && !ds.cities.some(c => c.name === requestedCity)) return;
    let city = -1, locality = -1;
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
    if (city < 0 && scope === "org") city = busiest(ds);
    if (city < 0 && mine.place) {
      const r = reachOf(ds, mine.place.lng, mine.place.lat);
      if (r.reached) city = r.city;
      else if (scope === "org") { setGate("unreached"); return; }
    }
    if (city < 0 && scope === "public") city = busiest(ds);
    if (city < 0) { setGate((g) => g ?? "ask"); return; }
    setGate(null);
    setPlace({ city, locality });
  }, [ds, place, params, requestedCity, cityList, mine.ready, mine.place, scope]);
  const locateMe = async () => {
    const r = await mine.locate();
    if (!r.ok) setGate(r.why === "abroad" ? "abroad" : "denied");
  };

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
  /* Authoritative citywide totals from the rollup. Used whenever the whole
     city is in scope, so a figure never reports the ~1,200-row bounded dataset
     as the city total. A locality (a sub-city view) stays on the bounded
     dataset, which is well within its cap. Public insights are city-level. */
  const cityRoll = useMemo(() => (cityName ? cityList.find((c) => c.city === cityName) ?? null : null), [cityName, cityList]);
  const cityWhole = !isLocality && !!cityRoll;
  /* Every city on the record: the country's count, shown beside the place's own share. */
  const indiaCare = useMemo(() => cityList.reduce((t, c) => ({ animals: t.animals + Number(c.animals || 0), sterilised: t.sterilised + Number(c.sterilised || 0), vaccinated: t.vaccinated + Number(c.vaccinated || 0) }), { animals: 0, sterilised: 0, vaccinated: 0 }), [cityList]);
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
    const cities = cityList.length ? cityList.map(c => ({ key: `city:${c.city}`, name: c.city, city: c.state ?? "" })) : ds.cities.map((c, i) => ({ key: `c${i}`, name: c.name, city: c.state ?? "" }));
    return [...cities, ...locs];
  }, [ds, cityList]);
  const pickPlace = (o: PlaceOption) => {
    setGate(null);
    if (o.key.startsWith("city:")) {
      const name = o.key.slice(5);
      const current = ds?.cities.findIndex(c => c.name === name) ?? -1;
      if (current >= 0) { setPlace({ city: current, locality: -1 }); return; }
      setPlace(null);
      const query = new URLSearchParams({ city: name });
      if (period !== "all") query.set("p", period);
      router.push(`${pathname}?${query}`);
    }
    else if (o.key.startsWith("c")) setPlace({ city: Number(o.key.slice(1)), locality: -1 });
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
        a: aging.open ? <>In the loaded detail, <b>{n(aging.open)}</b>{aging.open === 1 ? " request is open" : " requests are open"}{critical ? <>, <b className="is-hot">{an(critical)}</b> critical</> : null}.</> : <>No open request appears in the loaded detail {where}.</>,
        detail: aging.open ? <>Longest recorded wait in this detail: {days(oldest)}{aging.bins[3] ? <>. {n(aging.bins[3])} over 90 days</> : null}.</> : "This describes the loaded records; the citywide open total appears above.",
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
          detail: <>{pct(within3, fa.known)}% within three days{isLocality && city?.median != null ? <>. {cityName}: {city.median === 0 ? "the same day" : `within ${days(city.median)}`}</> : null}.</>,
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
          detail: noAct ? <>{an(noAct).replace(/^a/, "A")} closed without it{named ? <>, mostly {REASON[named.reason] ?? named.reason.replace(/_/g, " ")}</> : null}.</> : undefined,
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
          detail: <>Across {rows.length} localities. Choose one to read it alone.</>,
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

    /* 7. How much ABC and ARV is recorded. At city scope the totals are the
       authoritative rollup (sterilised/vaccinated over all recorded animals);
       the rollup confirms the recorded-yes count only, so the remainder is
       drawn as one hatched "not recorded as such" band rather than split into
       "no" and "unknown", which only the bounded per-animal rows can separate.
       A locality view keeps that finer bounded split. */
    if (cityWhole && cityRoll) {
      const total = cityRoll.animals, sterYes = cityRoll.sterilised ?? 0, vaccYes = cityRoll.vaccinated ?? 0;
      if (total < 3) out.push({ id: "abc", q: "How many animals here are sterilised and vaccinated?", missing: "how many animals are sterilised and vaccinated" });
      else out.push({
        id: "abc", q: "How many animals here are sterilised and vaccinated?",
        a: <><b>{pct(sterYes, total)}%</b> recorded as sterilised, <b>{pct(vaccYes, total)}%</b> as vaccinated.</>,
        detail: <>Of {total.toLocaleString("en-IN")} animals on the record here. The rest is not recorded as such. Across India, {indiaCare.sterilised.toLocaleString("en-IN")} animals are recorded as sterilised and {indiaCare.vaccinated.toLocaleString("en-IN")} as vaccinated, of {indiaCare.animals.toLocaleString("en-IN")} on the record. <Link href="/explore#care">By city</Link>.</>,
        evidence: (
          <div className="ib-bands">
            <p>ABC</p><ShareBand height={10} legend={false} total={total} parts={[{ key: "y", n: sterYes, color: "var(--sp-blue)", label: "Sterilised" }, { key: "u", n: total - sterYes, hatch: true, label: "Not recorded as sterilised" }]} />
            <p>ARV</p><ShareBand height={10} legend={false} total={total} parts={[{ key: "y", n: vaccYes, color: "var(--sp-arv)", label: "Vaccinated" }, { key: "u", n: total - vaccYes, hatch: true, label: "Not recorded as vaccinated" }]} />
          </div>
        ),
        action: { href: mapHref("abc"), label: "See where on the map" },
      });
    } else {
      const k = animalKnowledge(ds, ix, scopeSets.here, today);
      if (k.total < 3) out.push({ id: "abc", q: "How many animals here are sterilised and vaccinated?", missing: "how many animals are sterilised and vaccinated" });
      else out.push({
        id: "abc", q: "How many animals here are sterilised and vaccinated?",
        a: <><b>{pct(k.ster.yes, k.total)}%</b> recorded as sterilised, <b>{pct(k.vacc.yes, k.total)}%</b> as vaccinated.</>,
        detail: <>Of {n(k.total)} animals. {pct(k.ster.unknown, k.total)}% have no status recorded{k.due ? <>; {n(k.due)} due a booster</> : null}.</>,
        evidence: (
          <div className="ib-bands">
            <p>ABC</p><ShareBand height={10} legend={false} total={k.total} parts={[{ key: "y", n: k.ster.yes, color: "var(--sp-blue)", label: "Sterilised" }, { key: "n", n: k.ster.no, color: "var(--sp-ink)", label: "Not sterilised" }, { key: "u", n: k.ster.unknown, hatch: true, label: "Not recorded" }]} />
            <p>ARV</p><ShareBand height={10} legend={false} total={k.total} parts={[{ key: "y", n: k.vacc.yes, color: "var(--sp-arv)", label: "Vaccinated" }, { key: "n", n: k.vacc.no, color: "var(--sp-ink)", label: "Not vaccinated" }, { key: "u", n: k.vacc.unknown, hatch: true, label: "Not recorded" }]} />
          </div>
        ),
        action: { href: mapHref("abc"), label: "See where on the map" },
      });
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds, ix, place, scopeSets, idx, allIdx, cityIdx, isLocality, guard, fromDay, today, cityWhole, cityRoll, indiaCare]);

  const shown = answers.filter((x): x is Extract<Answer, { a: ReactNode }> => "a" in x);
  const animalsHere = useMemo(() => (cityWhole ? cityRoll!.animals : ds && ix && scopeSets ? animalKnowledge(ds, ix, scopeSets.here, today).total : 0), [cityWhole, cityRoll, ds, ix, scopeSets, today]);
  const openNowHere = useMemo(() => (cityWhole && cityRoll!.open_cases != null ? cityRoll!.open_cases : ds ? allIdx.filter((i) => openOn(ds, i, today)).length : 0), [cityWhole, cityRoll, ds, allIdx, today]);
  /* "Requests for help" follows the chosen period, so only the all-time view
     has an authoritative rollup equivalent; narrower periods are a time window
     the rollup does not carry and stay on the bounded dataset. */
  const requestsHere = cityWhole && period === "all" && cityRoll!.cases != null ? cityRoll!.cases : idx.length;
  const periodLabel = PERIODS.find((p) => p.id === period)!.label.toLowerCase();

  if (gate && !place) return (
    <div className="ib">
      <PlaceGate state={gate} where={mine.place?.label === "Around you" ? "around you" : mine.place?.label} locating={mine.locating} onLocate={locateMe}
        options={options} onPick={pickPlace} what="this page"
        ask={{ title: "Which place do you want to read?", body: "Share your location, or type a city or a locality. This reads its record: requests for help, how quickly field teams reached them, and what is known about the animals there." }} reportHref={mine.place ? `/report?lat=${mine.place.lat}&lng=${mine.place.lng}` : "/report"} />
    </div>
  );

  return (
    <div className={`ib ${scope === "org" ? "is-org" : ""}`}>
      {notice && <div className="ib-notice">{notice}</div>}

      {/* ── the place ──────────────────────────────────────────────── */}
      <header className="ib-register-head">
        <p className="ib-k">{scope === "org" ? "Your organisation's analysis" : "Insights"} · {periodLabel}</p>
        <h1>{placeName || "Reading the evidence"}</h1>
        {ds && <dl className="ib-measures"><div><dt>{cityWhole && period === "all" ? "Citywide case records" : "Loaded requests"}</dt><dd>{requestsHere.toLocaleString("en-IN")}</dd></div><div><dt>{cityWhole ? "Open citywide" : "Open in detail"}</dt><dd>{openNowHere.toLocaleString("en-IN")}</dd></div><div><dt>{cityWhole ? "Citywide profiles" : "Loaded profiles"}</dt><dd>{animalsHere.toLocaleString("en-IN")}</dd></div><div><dt>Explore geography</dt><dd><Link href={mapHref("density")}>Open the map ↗</Link></dd></div></dl>}
        <p>{isLocality ? `Loaded locality detail / ${cityName}` : "Citywide totals and bounded findings are different scopes. Period filters apply to the loaded record."}</p>
      </header>

      {ds && <div className="ib-pick">
        {plate && place && <details className="ib-geography"><summary>Spatial distribution / loaded requests</summary><figure className="ib-plate">
          <HexPlate round width={360} height={300} box={ds.cities[place.city].box} cells={plate} label={`Loaded requests by cell in ${cityName}`}
            onCell={(key) => { const i = ds.cells.indexOf(key); if (i >= 0 && ds.cellLocality[i] >= 0) setPlace({ city: place.city, locality: ds.cellLocality[i] }); }} />
          <figcaption className="ib-plate-note">Deeper blue cells have more requests. Choose one to read its locality.</figcaption>
        </figure></details>}
        <div className="ib-bar">
          <PlaceSearch options={options} onPick={pickPlace} label="Choose a place" />
          {isLocality && place && <button type="button" className="dk-btn is-tint" onClick={() => setPlace({ city: place.city, locality: -1 })}>All of {cityName}</button>}
          <div className="ib-period" role="group" aria-label="Period">
            {PERIODS.map((pp) => <button key={pp.id} type="button" aria-pressed={period === pp.id} className={period === pp.id ? "is-on" : ""} onClick={() => setPeriod(pp.id)}>{pp.label}</button>)}
          </div>
        </div>
      </div>}

      {/* ── the answers ────────────────────────────────────────────── */}
      <div className={`ib-body${allShown ? " is-all" : ""}`}>
        {shown.length > 0 && <div className="ib-chapter"><h2>{shown.length} findings from the record</h2><p>{allIdx.length.toLocaleString("en-IN")} loaded, location-linked requests{cityRoll ? ` / ${cityRoll.cases.toLocaleString("en-IN")} citywide` : ""}. Status figures outside this sample are labelled separately.</p></div>}
        {loading && <p className="ib-state" role="status">Reading the register…</p>}
        {error && <div className="ib-unavailable" role="status">
          <div><span>The record is temporarily unavailable</span><h2>Keep exploring while it reconnects.</h2><p>{error}</p></div>
          <nav aria-label="Recover the record"><button type="button" onClick={() => window.location.reload()}>Retry this brief <ArrowUpRight size={15} /></button>{scope === "org" ? <><Link href="/partner/records">Open working records <ArrowUpRight size={15} /></Link><Link href="/partner/map">Open the field map <ArrowUpRight size={15} /></Link></> : <><Link href="/stories">Read completed rescues <ArrowUpRight size={15} /></Link><Link href="/orgs">Meet the organisations <ArrowUpRight size={15} /></Link></>}</nav>
        </div>}
        {shown.map((x, k) => (
          <section key={x.id} className={`ib-q${k === 0 ? " is-lead" : ""}`} aria-labelledby={`ib-${x.id}`} style={{ ["--i" as string]: k }}>
            <span className="ib-q-index" aria-hidden>{String(k + 1).padStart(2, "0")}</span>
            <div className="ib-q-words">
              <h2 id={`ib-${x.id}`}>{x.q}</h2>
              <p className="ib-a">{x.a}</p>
              {x.detail && <p className="ib-detail">{x.detail}</p>}
              {x.action && <Link href={x.action.href} className="ib-act">{x.action.label} <ArrowUpRight size={14} aria-hidden /></Link>}
            </div>
            {x.evidence && <div className="ib-q-ev">{x.evidence}</div>}
          </section>
        ))}
        {ds && shown.length === 0 && !loading && (
          <p className="ib-state">Nothing is recorded {isLocality ? `in ${placeName}` : `in ${cityName}`} {period !== "all" ? `in the ${periodLabel} ` : ""}yet. Choose another place or period.</p>
        )}
        {/* Phones show the first findings; the rest open on request. */}
        {shown.length > PHONE_FIRST && !allShown && <button type="button" className="ib-more" onClick={() => setAllShown(true)}>Show all {shown.length} findings</button>}
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
