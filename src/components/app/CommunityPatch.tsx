"use client";

/* ════════════════════════════════════════════════════════════════════
   Your patch: the few square kilometres a person actually walks.

   Everything on this screen is about that patch and nothing else — which
   animals in it need someone, who you follow, what changed since you
   last looked, where the record is thin and a notched ear or a photograph
   would help, and what was finished nearby. The patch is set by your
   location or a place you choose, remembered on this device only.

   The register arrives as the same compact dataset the map uses; the
   named animals are a bounded read of the patch's own cells.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Crosshair, MapPin, Plus } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { LightsMap, type Light } from "@/components/system/LightsMap";
import { PlaceSearch, type PlaceOption } from "./PlaceSearch";
import { PlaceGate, type GateState } from "./PlaceGate";
import { reachOf, usePlace } from "@/lib/place";
import { pointInCell, ringOf } from "@/components/spatial/data";
import { useSpatialDataset } from "@/components/spatial/data";
import { useFollows } from "@/lib/follows";
import { A, A_STRIDE, AF, C, C_STRIDE, K, K_STRIDE, S, S_STRIDE } from "@/lib/spatial/types";
import { dayLabel } from "@/lib/spatial/engine";
import type { PublicCaseStory } from "@/lib/community-case-stories";
import { dogLabel } from "@/lib/utils";
import "./patch.css";

type Patch = { lng: number; lat: number; label: string; mine: boolean };
type PAnimal = {
  id: string; name: string | null; code: string | null; straypaw_id: string | null; cover_photo: string | null; status: string | null;
  needs_help: boolean | null; sterilisation_status: string | null; vaccination_status: string | null; ear_notch: string | null;
  first_seen: string | null; last_seen: string | null; zone: string | null; h3_r8: string | null; source: string | null;
};

const SEEN_KEY = "sp.patch.seen.v1";
const RADIUS_KM = 2.5;
const km = (a: [number, number], b: [number, number]) => {
  const r = (v: number) => (v * Math.PI) / 180, dLat = r(b[1] - a[1]), dLng = r(b[0] - a[0]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};
const ago = (iso: string | null) => {
  if (!iso) return "";
  const d = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000));
  return d < 1 ? "today" : d === 1 ? "yesterday" : d < 31 ? `${d} days ago` : d < 365 ? `${Math.round(d / 30)} months ago` : `${(d / 365).toFixed(1)} years ago`;
};
const nameOf = (a: PAnimal) => dogLabel({ name: a.name, zone: a.zone || "here" });
const ringCenter = (r: number[]): [number, number] => { let x = 0, y = 0; const n = r.length / 2 - 1; for (let i = 0; i < n; i++) { x += r[i * 2]; y += r[i * 2 + 1]; } return [x / n, y / n]; };

export function CommunityPatch({ stories, availableCities = [] }: { stories: PublicCaseStory[]; availableCities?: { city: string; state: string | null }[] }) {
  const router = useRouter();
  const { ds, ix, loading, error, cities: cityRollup } = useSpatialDataset("public");
  const { ids: follows } = useFollows();
  const { place, ready: placeReady, locating, choose: savePlace, locate: findMe } = usePlace();
  const patch = useMemo<Patch | null>(() => (place ? { ...place, mine: true } : null), [place]);
  const [gateWhy, setGateWhy] = useState<"denied" | "abroad" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [animals, setAnimals] = useState<PAnimal[] | null>(null);
  const [followed, setFollowed] = useState<PAnimal[]>([]);
  const [tab, setTab] = useState<"attention" | "recent" | "following">("attention");
  const [lastSeenVisit, setLastSeenVisit] = useState<number | null>(null);

  useEffect(() => {
    try { const v = Number(localStorage.getItem(SEEN_KEY)); if (v) setLastSeenVisit(v); localStorage.setItem(SEEN_KEY, String(Date.now())); } catch { /* storage blocked */ }
  }, []);

  /* Switching city is a bounded dataset reload. Remember only that explicit
     choice long enough to place the patch at the selected city's centre. */
  useEffect(() => {
    if (!ds || !placeReady) return;
    try {
      const pending = sessionStorage.getItem("sp.patch.pending-city");
      if (!pending) return;
      const selected = ds.cities.find((item) => item.name === pending);
      if (!selected) return;
      savePlace({ lng: selected.lng, lat: selected.lat, label: selected.name });
      sessionStorage.removeItem("sp.patch.pending-city");
    } catch { /* storage blocked; the city still opens and can be picked again */ }
  }, [ds, placeReady, savePlace]);
  const choose = (p: Patch) => { setGateWhy(null); savePlace({ lng: p.lng, lat: p.lat, label: p.label }); };
  const locate = async () => {
    const r = await findMe();
    if (r.ok) { setGateWhy(null); setNote(null); return; }
    if (patch) setNote(r.why === "abroad" ? "Your phone places you outside India. Your patch stays where it was." : "We could not get your location. Choose a place instead.");
    else setGateWhy(r.why === "abroad" ? "abroad" : "denied");
  };

  /* ── has the record reached the patch? ───────────────────────────── */
  const reach = useMemo(() => (ds && patch ? reachOf(ds, patch.lng, patch.lat) : null), [ds, patch]);

  /* ── the cells of the patch ────────────────────────────────────────── */
  const cells = useMemo(() => {
    if (!ds || !patch) return null;
    const c: [number, number] = [patch.lng, patch.lat];
    const inside: number[] = [];
    for (let i = 0; i < ds.cells.length; i++) if (km(c, [ds.centers[i * 2], ds.centers[i * 2 + 1]]) <= RADIUS_KM) inside.push(i);
    const edge = ds.frontier.filter((f) => km(c, ringCenter(f.ring)) <= RADIUS_KM);
    const nextHere = ds.next.filter((n) => km(c, n.center) <= RADIUS_KM + 0.8);
    return { inside, set: new Set(inside), edge, nextHere };
  }, [ds, patch]);

  /* ── the city the patch is in: its whole record, not the patch's ─────
     Citywide figures are authoritative totals from the city rollup, never a
     count of the bounded dataset (which caps at ~1,200 animals and would
     under-report a large city like Jamshedpur or Ranchi). The bounded dataset
     still supplies the geometry and the patch's own dots below. */
  const city = useMemo(() => {
    if (!ds || !ix || !patch) return null;
    if (!reach?.reached) return null;
    const ci = reach.city;
    const name = ds.cities[ci]?.name ?? "";
    const roll = cityRollup.find((c) => c.city === name);
    if (roll) return {
      name,
      animalsN: roll.animals,
      help: roll.needs_help ?? 0,
      sterilised: roll.sterilised ?? 0,
      vaccinated: roll.vaccinated ?? 0,
      openCases: roll.open_cases ?? 0,
      cases: roll.cases ?? 0,
    };
    /* Fallback only if the rollup row is missing: a bounded count, clearly
       an under-count, but never shown in normal operation. */
    let animalsN = 0, help = 0;
    for (let i = 0; i < ds.animals.length / A_STRIDE; i++) {
      const o = i * A_STRIDE;
      if (ds.cellCity[ds.animals[o + A.cell]] !== ci) continue;
      animalsN++;
      if (ds.animals[o + A.flags] & (AF.help | AF.injured)) help++;
    }
    return { name, animalsN, help, sterilised: 0, vaccinated: 0, openCases: 0, cases: 0 };
  }, [ds, ix, patch, reach, cityRollup]);

  /* ── what the register holds there ─────────────────────────────────── */
  const stats = useMemo(() => {
    if (!ds || !ix || !cells) return null;
    const perCell = new Map<number, { n: number; help: number }>();
    let animalsN = 0, help = 0, sterUnknown = 0, boosterDue = 0;
    const week = ds.today - 7, visit = lastSeenVisit ? Math.floor((lastSeenVisit - Date.UTC(2000, 0, 1)) / 86_400_000) : ds.today - 30;
    /* Anything since the last visit; if nothing, the last thirty days, said so. */
    let quiet = false, since = visit;
    const count = (from: number) => {
      let n = 0;
      for (const c of cells.inside) {
        for (const i of ix.animalsByCell[c]) if (ds.animals[i * A_STRIDE + A.first] > from) n++;
        for (const i of ix.casesByCell[c]) { const d = ds.cases[i * C_STRIDE + C.day]; if (d > from && d <= ds.today) n++; }
        for (const i of ix.careByCell[c]) { const d = ds.care[i * K_STRIDE + K.day]; if (d > from && d <= ds.today) n++; }
        for (const i of ix.sightingsByCell[c]) { const d = ds.sightings[i * S_STRIDE + S.day]; if (d > from && d <= ds.today) n++; }
      }
      return n;
    };
    if (lastSeenVisit && count(visit) === 0) { quiet = true; since = Math.min(visit, ds.today - 30); }
    let newAnimals = 0, newSightings = 0, newRequests = 0, newCare = 0, weekEvents = 0;
    for (const c of cells.inside) {
      for (const i of ix.animalsByCell[c]) {
        const o = i * A_STRIDE, f = ds.animals[o + A.flags];
        animalsN++;
        const v = perCell.get(c) ?? { n: 0, help: 0 };
        v.n++;
        if (f & AF.help) { help++; v.help++; }
        perCell.set(c, v);
        if (!(f & (AF.sterYes | AF.sterNo))) sterUnknown++;
        const lv = ds.animals[o + A.lastVacc];
        if (lv >= 0 && lv < ds.today - 365) boosterDue++;
        if (ds.animals[o + A.first] > since) newAnimals++;
      }
      for (const i of ix.casesByCell[c]) { const d = ds.cases[i * C_STRIDE + C.day]; if (d > since && d <= ds.today) newRequests++; if (d > week && d <= ds.today) weekEvents++; }
      for (const i of ix.careByCell[c]) { const d = ds.care[i * K_STRIDE + K.day]; if (d > since && d <= ds.today) newCare++; if (d > week && d <= ds.today) weekEvents++; }
      for (const i of ix.sightingsByCell[c]) { const d = ds.sightings[i * S_STRIDE + S.day]; if (d > since && d <= ds.today) newSightings++; if (d > week && d <= ds.today) weekEvents++; }
    }
    return { perCell, animalsN, help, sterUnknown, boosterDue, newAnimals, newSightings, newRequests, newCare, weekEvents, since, quiet };
  }, [ds, ix, cells, lastSeenVisit]);

  /* ── the named animals of the patch, and the ones you follow ─────── */
  useEffect(() => {
    if (!ds || !cells) return;
    const keys = cells.inside.map((i) => ds.cells[i]).slice(0, 80);
    if (!keys.length) { setAnimals([]); return; }
    let live = true;
    setAnimals(null);
    fetch(`/api/spatial/patch?cells=${keys.join(",")}`).then((r) => (r.ok ? r.json() : { animals: [] })).then((j) => { if (live) setAnimals(j.animals ?? []); }).catch(() => { if (live) setAnimals([]); });
    return () => { live = false; };
  }, [ds, cells]);
  const followKey = (follows ?? []).join(",");
  useEffect(() => {
    if (!followKey) { setFollowed([]); return; }
    fetch(`/api/spatial/patch?ids=${followKey}`).then((r) => (r.ok ? r.json() : { animals: [] })).then((j) => setFollowed(j.animals ?? [])).catch(() => setFollowed([]));
  }, [followKey]);

  const localities = useMemo(() => {
    if (!ds) return [] as { i: number; name: string; city: string; c: number }[];
    const seen = new Map<number, number>();
    for (let c = 0; c < ds.cells.length; c++) { const l = ds.cellLocality[c]; if (l >= 0 && !seen.has(l)) seen.set(l, c); }
    return [...seen.entries()].map(([l, c]) => ({ i: l, name: ds.localities[l], city: ds.cities[ds.cellCity[c]]?.name ?? "", c })).sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
  }, [ds]);
  /* Everything that can be typed: every locality on the record, and every city (at its centre). */
  const placeOptions = useMemo<PlaceOption[]>(() => {
    const current = ds ? ds.cities.map((c, i) => ({ key: `c${i}`, name: c.name, city: c.state ?? "" })) : [];
    const local = ds ? localities.map((l) => ({ key: `l${l.i}`, name: l.name, city: l.city })) : [];
    const all = [
      ...availableCities.map((item) => ({ key: `ac:${item.city}`, name: item.city, city: item.state ?? "" })),
      ...current,
      ...local,
    ];
    const seen = new Set<string>();
    return all.filter((item) => {
      const key = `${item.name.toLowerCase()}|${item.city.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [ds, localities, availableCities]);
  const pickPlace = (o: PlaceOption) => {
    if (o.key.startsWith("ac:")) {
      const cityName = o.key.slice(3);
      const current = ds?.cities.find((item) => item.name === cityName);
      if (current) { choose({ lng: current.lng, lat: current.lat, label: current.name, mine: true }); return; }
      try { sessionStorage.setItem("sp.patch.pending-city", cityName); } catch { /* optional */ }
      router.push(`/app?city=${encodeURIComponent(cityName)}`);
      return;
    }
    if (!ds) return;
    if (o.key.startsWith("c")) { const c = ds.cities[Number(o.key.slice(1))]; if (c) choose({ lng: c.lng, lat: c.lat, label: c.name, mine: true }); return; }
    const l = localities.find((x) => `l${x.i}` === o.key);
    if (l) choose({ lng: ds.centers[l.c * 2], lat: ds.centers[l.c * 2 + 1], label: `${l.name}, ${l.city}`, mine: true });
  };

  const attention = (animals ?? []).filter((a) => a.needs_help || a.status === "injured");
  const cityMode = !!city && patch.label.trim().toLowerCase() === city.name.trim().toLowerCase();
  const cityNotSterilised = city ? Math.max(0, city.animalsN - city.sterilised) : 0;
  const cityNotVaccinated = city ? Math.max(0, city.animalsN - city.vaccinated) : 0;
  const recent = [...(animals ?? [])].sort((a, b) => (b.last_seen ?? "").localeCompare(a.last_seen ?? "")).slice(0, 12);
  const list = tab === "attention" ? attention : tab === "recent" ? recent : followed;
  const patchIds = new Set((animals ?? []).map((a) => a.id));
  const nearStories = stories.filter((s) => patchIds.has(s.dog_id));
  const shownStories = nearStories.slice(0, 4);

  /* ── the plate: the patch's animals as lights on its streets ─────── */
  const lights = useMemo((): Light[] | null => {
    if (!ds || !cells) return null;
    const inside = new Set(cells.inside);
    const out: Light[] = [];
    const rings = new Map<number, [number, number][]>();
    for (let i = 0; i < ds.animals.length / A_STRIDE; i++) {
      const o = i * A_STRIDE, c = ds.animals[o + A.cell];
      if (!inside.has(c)) continue;
      let r = rings.get(c); if (!r) { r = ringOf(ds, c); rings.set(c, r); }
      const [lng, lat] = pointInCell(r, i + 1);
      out.push({ lng, lat, help: !!(ds.animals[o + A.flags] & (AF.help | AF.injured)) });
    }
    return out;
  }, [ds, cells]);

  /* No place yet: ask for one first. The question needs nothing from the
     register, so it is asked even while the register is loading or could
     not be read. */
  if (placeReady && !patch) return (
    <main className="cp">
      <PlaceGate state={gateWhy ?? "ask"} locating={locating} onLocate={locate} options={placeOptions} onPick={pickPlace} />
    </main>
  );

  /* The register could not be read: the patch cannot be drawn, but the two
     things a person came to do here still work. */
  if (!loading && !ds && error) return (
    <main className="cp">
      <header className="cp-head is-error">
        <div className="cp-head-id">
          <p className="sys-eyebrow">Your patch{patch ? ` · ${patch.label}` : ""}</p>
          <h1>The register could not be read just now.</h1>
          <p className="cp-sample">Your patch is drawn here once it can be. Reporting an animal does not wait for it.</p>
        </div>
        <div className="cp-head-acts">
          <Link href={patch ? `/report?lat=${patch.lat}&lng=${patch.lng}` : "/report"} className="sys-btn is-flame"><Plus size={16} /> Report an animal</Link>
          <button type="button" className="sys-btn is-quiet" onClick={locate} disabled={locating}><Crosshair size={15} /> {locating ? "Finding you…" : "Use my location"}</button>
        </div>
        {note && <p className="cp-note">{note}</p>}
      </header>
    </main>
  );
  /* No place yet, outside India, or beyond the record's reach: say so,
     and show nothing about anywhere else. */
  const gate: GateState | null = !placeReady ? null : !patch ? (gateWhy ?? "ask") : reach && !reach.reached ? "unreached" : null;
  if (gate) return (
    <main className="cp">
      <PlaceGate state={gate} where={patch?.label === "Around you" ? "around you" : patch?.label} locating={locating} onLocate={locate}
        options={placeOptions} onPick={pickPlace} reportHref={patch ? `/report?lat=${patch.lat}&lng=${patch.lng}` : "/report"} />
    </main>
  );
  if (!placeReady || loading || !ds || !patch || !stats || !cells || !city) return <main className="cp"><p className="cp-state">Reading the register…</p></main>;

  return (
    <main className="cp">
      <header className="cp-head is-loaded">
        <div className="cp-head-id">
          <p className="cp-head-kicker">Your patch / the living record</p>
          <h1>{city.name}{!patch.mine && <small>Sample city</small>}</h1>
          <p className="cp-head-deck">Citywide figures from recorded animals. The street-level picture begins with your patch below.</p>
        </div>
        <dl className="cp-figs">
          <div><dt>animals on the record</dt><dd>{city.animalsN.toLocaleString("en-IN")}</dd></div>
          <div className="is-hot"><dt>flagged for help</dt><dd>{city.help.toLocaleString("en-IN")}</dd></div>
        </dl>
      </header>
      <div className="cp-location-bar">
        <p>{patch.mine ? "Your chosen place" : "Showing a sample place"}<span>{patch.label}</span></p>
        <div className="cp-head-acts">
          <Link href={`/report?lat=${patch.lat}&lng=${patch.lng}`} className="sys-btn is-flame"><Plus size={16} /> Report an animal</Link>
          <button type="button" className="sys-btn is-quiet" onClick={locate} disabled={locating}><Crosshair size={15} /> {locating ? "Finding you…" : "Use my location"}</button>
          <PlaceSearch options={placeOptions} onPick={pickPlace} label="Choose a place" />
        </div>
        {note && <p className="cp-note">{note}</p>}
      </div>

      <p className="cp-near"><MapPin size={13} aria-hidden /> {cityMode ? `Near ${city.name} city centre` : `Near ${patch.label === "Around you" ? "you" : patch.label}`} · {RADIUS_KM} km{cityMode ? " · citywide totals are shown above" : ""}</p>
      <section className="cp-work" aria-label="Near you">
        <figure className="cp-plate">
          {lights && <LightsMap center={[patch.lng, patch.lat]} radiusKm={RADIUS_KM} lights={lights} label={`The animals recorded in your patch around ${patch.label}`} />}
          <figcaption>
            <span><i className="is-light" /> one animal on record</span>
            <span><i className="is-flame" /> needs help</span>
            <span><i className="is-ring" /> your {RADIUS_KM} km</span>
            <Link href={`/map?mode=animals&lat=${patch.lat}&lng=${patch.lng}`}>Open on the map <ArrowUpRight size={12} /></Link>
          </figcaption>
        </figure>

        <div className="cp-register">
          <div className="cp-tabs" role="tablist" aria-label="Animals in your patch">
            <button role="tab" aria-selected={tab === "attention"} className={tab === "attention" ? "is-on" : ""} onClick={() => setTab("attention")}>Needs attention nearby <b className="sys-mono">{attention.length}</b>{cityMode && city.help > attention.length ? <small className="sys-mono"> · {city.help.toLocaleString("en-IN")} citywide</small> : null}</button>
            <button role="tab" aria-selected={tab === "recent"} className={tab === "recent" ? "is-on" : ""} onClick={() => setTab("recent")}>Seen lately</button>
            <button role="tab" aria-selected={tab === "following"} className={tab === "following" ? "is-on" : ""} onClick={() => setTab("following")}>You follow <b className="sys-mono">{followed.length}</b></button>
          </div>
          {animals === null && tab !== "following" ? <p className="cp-quiet">Reading the patch…</p>
            : list.length === 0 ? (
              <p className="cp-quiet">{tab === "attention" ? "Nobody in your patch is flagged as needing help. If you see an injured animal, report it — that is how it gets here."
                : tab === "recent" ? "No animal is recorded in your patch yet. A photograph and the place are enough to start."
                : "Follow an animal from its record and it stays here, wherever you set your patch."}</p>
            ) : (
              <ol className="cp-list">
                {list.slice(0, 5).map((a) => (
                  <li key={a.id}><Link href={`/dog/${a.id}`}>
                    <DogPhoto src={a.cover_photo} alt="" seed={a.id} tone={a.needs_help ? "urgent" : "neutral"} className="cp-thumb" />
                    <span className="cp-who"><b>{nameOf(a)}</b><small>{[a.straypaw_id, a.zone && !nameOf(a).toLowerCase().includes(a.zone.toLowerCase()) ? a.zone : null].filter(Boolean).join(" · ") || "On the record"}</small></span>
                    <span className="cp-when">{a.needs_help ? <em className="is-hot">Needs help</em> : a.status === "injured" ? <em className="is-hot">Injured</em> : null}<small>seen {ago(a.last_seen)}</small></span>
                  </Link></li>
                ))}
              </ol>
            )}
          {list.length > 5 && <Link href={`/map?mode=animals&lat=${patch.lat}&lng=${patch.lng}`} className="cp-more">{list.length - 5} more on the map <ArrowUpRight size={13} /></Link>}
        </div>
      </section>

      {/* What changed is for someone coming back, and only when something did. */}
      {lastSeenVisit && !stats.quiet && <section className="cp-changed" aria-label="What changed">
        <p className="cp-eyebrow">Since you last looked · {dayLabel(stats.since)}</p>
        <ol>
          <li><b>{stats.newSightings}</b><span>sightings sent in</span></li>
          <li><b>{stats.newAnimals}</b><span>animals newly recorded</span></li>
          <li><b>{stats.newRequests}</b><span>requests for help</span></li>
          <li><b>{stats.newCare}</b><span>care events recorded</span></li>
        </ol>
      </section>}

      {/* One ask, the most useful thing to do here right now — not a menu
          of four. Each used to link into a map mode that already makes
          the same case on the map itself; this keeps only the one local
          fact a map mode can't say as directly. */}
      {(cityMode ? (cityNotSterilised > 0 || cityNotVaccinated > 0 || city.help > 0 || city.openCases > 0) : (stats.sterUnknown > 0 || cells.edge.length > 0 || stats.boosterDue > 0 || cells.nextHere[0])) && (
        <section className="cp-help" aria-label="Where help is needed">
          <p className="cp-eyebrow">Where you can help{cityMode ? ` · ${city.name} citywide` : ""}</p>
          <ol>
            {cityMode ? (
              <li>
                <b>{cityNotSterilised.toLocaleString("en-IN")}</b>
                <p>animals across {city.name} are not recorded as sterilised. That is a citywide register count, not the {RADIUS_KM} km sample around the centre.</p>
                <Link href={`/map?city=${encodeURIComponent(city.name)}&mode=abc`} className="sys-btn is-sm is-quiet">See the citywide ABC map</Link>
              </li>
            ) : stats.sterUnknown > 0 ? (
              <li>
                <b>{stats.sterUnknown.toLocaleString("en-IN")}</b>
                <p>animals in this {RADIUS_KM} km patch have no sterilisation on record. A notched ear is the sign — if you see one, a sighting with a photo settles it.</p>
                <Link href={`/report?lat=${patch.lat}&lng=${patch.lng}`} className="sys-btn is-sm is-quiet">Report a sighting</Link>
              </li>
            ) : cells.edge.length > 0 ? (
              <li>
                <b>{cells.edge.length}</b>
                <p>cells at the edge of your patch have no animal recorded at all — which is not the same as none living there.</p>
                <Link href={`/map?mode=coverage&lat=${patch.lat}&lng=${patch.lng}`} className="sys-btn is-sm is-quiet">See the edge</Link>
              </li>
            ) : stats.boosterDue > 0 ? (
              <li>
                <b>{stats.boosterDue}</b>
                <p>vaccinated animals here were last vaccinated more than a year ago and are due a booster.</p>
                <Link href={`/map?mode=arv&lat=${patch.lat}&lng=${patch.lng}`} className="sys-btn is-sm is-quiet">Where they are</Link>
              </li>
            ) : cells.nextHere[0] ? (
              <li>
                <b className="cp-next-n">1</b>
                <p><b className="cp-inline">{cells.nextHere[0].locality || "A nearby cell"}</b> is worth a look: {cells.nextHere[0].reasons.slice(0, 2).join(", ")}.</p>
                <Link href={`/map?mode=coverage&cell=${cells.nextHere[0].cell}`} className="sys-btn is-sm is-quiet">Map next</Link>
              </li>
            ) : null}
          </ol>
        </section>
      )}

      {shownStories.length > 0 && (
        <section className="cp-done" aria-label="Recently completed">
          <p className="cp-eyebrow"><span>{nearStories.length ? "Finished near you" : "Finished recently"}</span><Link href="/stories">All stories <ArrowUpRight size={12} /></Link></p>
          <ol>
            {shownStories.map((s) => (
              <li key={s.id}><Link href={`/dog/${s.dog_id}`}>
                <DogPhoto src={s.cover_photo} alt="" seed={s.dog_id} tone="resolved" className="cp-done-thumb" />
                <span><b>{s.animal_name || s.animal_code || "An animal"}</b><small>{[s.title, s.zone].filter(Boolean).join(" · ")}</small></span>
                <em className="sys-mono">{ago(s.resolved_at ?? s.occurred_at)}</em>
              </Link></li>
            ))}
          </ol>
        </section>
      )}

      <p className="cp-foot"><MapPin size={12} /> Your patch is kept on this device only. Positions are shown to their cell, never finer. Recorded animals, not population.</p>
    </main>
  );
}
