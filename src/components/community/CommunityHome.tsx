"use client";

/* ════════════════════════════════════════════════════════════════════
   Nearby: the community home.

   Opening StrayPaw should feel like stepping outside, not like opening a
   dashboard. So the page opens on a place straight away — yours if you
   have set one, otherwise the city whose record moved most recently,
   labelled as such — with its streets at night and the recorded animals
   lit on them. Then, in the order a neighbour would ask:

     who here needs someone        the animals flagged on the record
     who has been seen lately      faces where photographs exist
     what you can usefully do      one evidence-based ask, not a menu
     what was finished nearby      outcomes, so effort feels real

   Everything shown is either an authoritative city total (from the city
   rollup) or a bounded read of the place's own cells, and says which.
   Positions are never finer than a cell. The full geographic reading
   lives in the Atlas; this page is a neighbourhood, not a second map.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Bookmark, Crosshair, Info, MapPin, Radio } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { AnimalTile, realName } from "./AnimalTile";
import { LightsMap, type Light } from "@/components/system/LightsMap";
import { PlaceSearch, type PlaceOption } from "@/components/app/PlaceSearch";
import { reachOf, usePlace, kmBetween } from "@/lib/place";
import { pointInCell, ringOf, useSpatialDataset } from "@/components/spatial/data";
import { useFollows } from "@/lib/follows";
import { A, A_STRIDE, AF, C, C_STRIDE, K, K_STRIDE, S, S_STRIDE } from "@/lib/spatial/types";
import { dayLabel } from "@/lib/spatial/engine";
import type { PublicCaseStory } from "@/lib/community-case-stories";
import { dogLabel } from "@/lib/utils";
import "./home.css";

type Patch = { lng: number; lat: number; label: string; mine: boolean };
type PAnimal = {
  id: string; name: string | null; code: string | null; straypaw_id: string | null; cover_photo: string | null; status: string | null;
  needs_help: boolean | null; sterilisation_status: string | null; vaccination_status: string | null; ear_notch: string | null;
  first_seen: string | null; last_seen: string | null; zone: string | null; h3_r8: string | null; source: string | null;
};

const SEEN_KEY = "sp.patch.seen.v1";
const RADIUS_KM = 2.5;
const fmt = (n: number) => n.toLocaleString("en-IN");
const ringCenter = (r: number[]): [number, number] => { let x = 0, y = 0; const n = r.length / 2 - 1; for (let i = 0; i < n; i++) { x += r[i * 2]; y += r[i * 2 + 1]; } return [x / n, y / n]; };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function when(iso: string | null) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const d = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  if (d < 1) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  const date = new Date(t);
  return `${MON[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
const nameOf = (a: PAnimal) => dogLabel({ name: a.name, zone: a.zone || "here" });
const isHot = (a: PAnimal) => !!a.needs_help || a.status === "injured";

export function CommunityHome({ stories, storyError = false, availableCities = [], defaultCity = null }: {
  stories: PublicCaseStory[]; storyError?: boolean;
  availableCities?: { city: string; state: string | null; lng?: number; lat?: number }[];
  defaultCity?: string | null;
}) {
  const router = useRouter();
  const { ds, ix, loading, error, cities: cityRollup } = useSpatialDataset("public");
  const { ids: follows } = useFollows();
  const { place, ready: placeReady, locating, choose: savePlace, locate: findMe } = usePlace();
  const [note, setNote] = useState<string | null>(null);
  const [animals, setAnimals] = useState<PAnimal[] | null>(null);
  const [animalsError, setAnimalsError] = useState(false);
  const [followed, setFollowed] = useState<PAnimal[]>([]);
  const [lastSeenVisit, setLastSeenVisit] = useState<number | null>(null);

  useEffect(() => {
    try { const v = Number(localStorage.getItem(SEEN_KEY)); if (v) setLastSeenVisit(v); localStorage.setItem(SEEN_KEY, String(Date.now())); } catch { /* storage blocked */ }
  }, []);

  /* A choice made on another city's page lands here before its data does. */
  useEffect(() => {
    if (!ds || !placeReady) return;
    try {
      const pending = sessionStorage.getItem("sp.patch.pending-city");
      if (!pending) return;
      const selected = ds.cities.find((item) => item.name === pending);
      if (!selected) return;
      savePlace({ lng: selected.lng, lat: selected.lat, label: selected.name });
      sessionStorage.removeItem("sp.patch.pending-city");
    } catch { /* storage blocked */ }
  }, [ds, placeReady, savePlace]);

  /* The place on screen: yours, or — until you choose — the loaded city's
     centre, said plainly. Nobody meets an empty question first. */
  const loadedCity = ds?.cities.find((c) => c.name === (defaultCity ?? ds?.cities[0]?.name)) ?? ds?.cities[0] ?? null;
  const patch = useMemo<Patch | null>(() => {
    if (place) return { ...place, mine: true };
    if (placeReady && loadedCity) return { lng: loadedCity.lng, lat: loadedCity.lat, label: loadedCity.name, mine: false };
    return null;
  }, [place, placeReady, loadedCity]);

  const reach = useMemo(() => (ds && patch ? reachOf(ds, patch.lng, patch.lat) : null), [ds, patch]);

  /* A saved place in another city: load that city rather than declaring the
     record absent. Only when the nearest recorded city really is far away
     do we say the record has not reached it. */
  const nearestCity = useMemo(() => {
    if (!patch || !patch.mine) return null;
    let best: { city: string; km: number } | null = null;
    for (const c of cityRollup) {
      if (c.lng == null || c.lat == null) continue;
      const km = kmBetween([patch.lng, patch.lat], [c.lng, c.lat]);
      if (!best || km < best.km) best = { city: c.city, km };
    }
    return best;
  }, [patch, cityRollup]);
  useEffect(() => {
    if (!ds || !reach || reach.reached || !nearestCity || nearestCity.km > 60) return;
    if (ds.cities.some((c) => c.name === nearestCity.city)) return;
    router.replace(`/app?city=${encodeURIComponent(nearestCity.city)}`, { scroll: false });
  }, [ds, reach, nearestCity, router]);

  const choose = (p: { lng: number; lat: number; label: string }) => { setNote(null); savePlace(p); };
  const locate = async () => {
    const r = await findMe();
    if (r.ok) { setNote(null); return; }
    setNote(r.why === "abroad" ? "Your phone places you outside India. StrayPaw's record covers India only." : "We could not read your location. Choose a place instead.");
  };

  const cells = useMemo(() => {
    if (!ds || !patch) return null;
    const c: [number, number] = [patch.lng, patch.lat];
    const inside: number[] = [];
    for (let i = 0; i < ds.cells.length; i++) if (kmBetween(c, [ds.centers[i * 2], ds.centers[i * 2 + 1]]) <= RADIUS_KM) inside.push(i);
    const edge = ds.frontier.filter((f) => kmBetween(c, ringCenter(f.ring)) <= RADIUS_KM);
    return { inside, edge };
  }, [ds, patch]);

  const city = useMemo(() => {
    if (!ds || !patch || !reach?.reached) return null;
    const name = ds.cities[reach.city]?.name ?? "";
    const roll = cityRollup.find((c) => c.city === name);
    if (!roll) return null;
    return { name, state: roll.state, animals: roll.animals, help: roll.needs_help ?? 0, sterilised: roll.sterilised ?? 0, vaccinated: roll.vaccinated ?? 0, open: roll.open_cases ?? 0, cases: roll.cases ?? 0, care: roll.care_events ?? 0, latest: roll.latest_seen };
  }, [ds, patch, reach, cityRollup]);

  const stats = useMemo(() => {
    if (!ds || !ix || !cells) return null;
    let n = 0, help = 0, sterUnknown = 0, boosterDue = 0;
    const visit = lastSeenVisit ? Math.floor((lastSeenVisit - Date.UTC(2000, 0, 1)) / 86_400_000) : ds.today - 30;
    let newAnimals = 0, newSightings = 0, newRequests = 0, newCare = 0;
    for (const c of cells.inside) {
      for (const i of ix.animalsByCell[c]) {
        const o = i * A_STRIDE, f = ds.animals[o + A.flags];
        n++;
        if (f & AF.help) help++;
        if (!(f & (AF.sterYes | AF.sterNo))) sterUnknown++;
        const lv = ds.animals[o + A.lastVacc];
        if (lv >= 0 && lv < ds.today - 365) boosterDue++;
        if (ds.animals[o + A.first] > visit) newAnimals++;
      }
      for (const i of ix.casesByCell[c]) { const d = ds.cases[i * C_STRIDE + C.day]; if (d > visit && d <= ds.today) newRequests++; }
      for (const i of ix.careByCell[c]) { const d = ds.care[i * K_STRIDE + K.day]; if (d > visit && d <= ds.today) newCare++; }
      for (const i of ix.sightingsByCell[c]) { const d = ds.sightings[i * S_STRIDE + S.day]; if (d > visit && d <= ds.today) newSightings++; }
    }
    return { n, help, sterUnknown, boosterDue, newAnimals, newSightings, newRequests, newCare, since: visit, changed: newAnimals + newSightings + newRequests + newCare > 0 };
  }, [ds, ix, cells, lastSeenVisit]);

  useEffect(() => {
    if (!ds || !cells) return;
    const keys = cells.inside.map((i) => ds.cells[i]).slice(0, 80);
    if (!keys.length) { setAnimals([]); setAnimalsError(false); return; }
    let live = true;
    setAnimals(null); setAnimalsError(false);
    fetch(`/api/spatial/patch?cells=${keys.join(",")}`).then((r) => r.ok ? r.json() : Promise.reject(new Error("unavailable")))
      .then((j) => { if (live) setAnimals(j.animals ?? []); })
      .catch(() => { if (live) { setAnimals([]); setAnimalsError(true); } });
    return () => { live = false; };
  }, [ds, cells]);

  const followKey = (follows ?? []).join(",");
  useEffect(() => {
    if (!followKey) { setFollowed([]); return; }
    let live = true;
    fetch(`/api/spatial/patch?ids=${followKey}`).then((r) => r.ok ? r.json() : Promise.reject(new Error("unavailable")))
      .then((j) => { if (live) setFollowed(j.animals ?? []); })
      .catch(() => { if (live) setFollowed([]); });
    return () => { live = false; };
  }, [followKey]);

  const placeOptions = useMemo<PlaceOption[]>(() => {
    const out: PlaceOption[] = [];
    const seen = new Set<string>();
    const add = (o: PlaceOption, key: string) => { if (!seen.has(key)) { seen.add(key); out.push(o); } };
    for (const c of availableCities) add({ key: `ac:${c.city}`, name: c.city, city: c.state ?? "" }, `city:${c.city.toLowerCase()}`);
    if (ds) {
      ds.cities.forEach((c, i) => add({ key: `c${i}`, name: c.name, city: c.state ?? "" }, `city:${c.name.toLowerCase()}`));
      const loc = new Map<number, number>();
      for (let c = 0; c < ds.cells.length; c++) { const l = ds.cellLocality[c]; if (l >= 0 && !loc.has(l)) loc.set(l, c); }
      for (const [l, c] of loc) add({ key: `l${l}:${c}`, name: ds.localities[l], city: ds.cities[ds.cellCity[c]]?.name ?? "" }, `loc:${ds.localities[l].toLowerCase()}`);
    }
    return out;
  }, [ds, availableCities]);

  const pickPlace = (o: PlaceOption) => {
    if (o.key.startsWith("ac:")) {
      const name = o.key.slice(3);
      const here = ds?.cities.find((c) => c.name === name);
      if (here) { choose({ lng: here.lng, lat: here.lat, label: here.name }); return; }
      try { sessionStorage.setItem("sp.patch.pending-city", name); } catch { /* optional */ }
      router.push(`/app?city=${encodeURIComponent(name)}`);
      return;
    }
    if (!ds) return;
    if (o.key.startsWith("c")) { const c = ds.cities[Number(o.key.slice(1))]; if (c) choose({ lng: c.lng, lat: c.lat, label: c.name }); return; }
    const cell = Number(o.key.split(":")[1]);
    if (Number.isFinite(cell)) choose({ lng: ds.centers[cell * 2], lat: ds.centers[cell * 2 + 1], label: `${o.name}, ${o.city}` });
  };

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

  const hot = (animals ?? []).filter(isHot);
  const recent = [...(animals ?? [])].filter((a) => !isHot(a)).sort((a, b) => Number(!!b.cover_photo) - Number(!!a.cover_photo) || (b.last_seen ?? "").localeCompare(a.last_seen ?? "")).slice(0, 8);
  const ids = new Set((animals ?? []).map((a) => a.id));
  const near = stories.filter((s) => ids.has(s.dog_id));
  const shownStories = (near.length ? near : stories.filter((s) => city && (s as { city?: string | null }).city === city.name)).slice(0, 4);
  const cityMode = !!patch && !!city && patch.label.trim().toLowerCase() === city.name.toLowerCase();
  const reportHref = patch ? `/report?lat=${patch.lat}&lng=${patch.lng}` : "/report";
  const atlasHref = city ? `/map?city=${encodeURIComponent(city.name)}` : "/map";
  const unreached = !!reach && !reach.reached && (!nearestCity || nearestCity.km > 60);

  /* ── the place, at night ─────────────────────────────────────────── */
  const placeName = patch ? (patch.label === "Around you" ? "you" : patch.label.split(",")[0]) : null;
  const hero = (
    <section className="nb-hero x-night" aria-labelledby="nb-place">
      <div className="nb-hero-map" aria-hidden={!lights}>
        {patch && lights && !unreached
          ? <LightsMap center={[patch.lng, patch.lat]} radiusKm={RADIUS_KM} lights={lights} dot={3} glow={1.4} label={`Recorded animals within ${RADIUS_KM} km of ${patch.label}, shown within their cells`} />
          : <div className="nb-hero-ground" />}
      </div>
      <div className="nb-hero-copy">
        <p className="nb-hero-k">
          {patch?.mine ? <><MapPin size={14} aria-hidden /> Your place</> : patch ? <><Info size={14} aria-hidden /> Most recently active city — set your own place below</> : "Finding a place…"}
        </p>
        <h1 id="nb-place" className="x-display">
          <em>Around</em> {placeName ?? <span className="nb-skel x-skel" />}
        </h1>
        <p className="nb-hero-sum" aria-live="polite">
          {unreached ? <>StrayPaw has no records near {patch?.label} yet. The first report here starts its record.</>
            : city ? <>The record holds <b className="x-num">{fmt(city.animals)}</b> animal profiles across {city.name}. <b className="x-num">{fmt(city.help)}</b> are flagged as needing help{city.open ? <>, and <b className="x-num">{fmt(city.open)}</b> requests are open</> : null}.</>
            : error ? <>The city record could not be read just now. Reporting still works.</>
            : <span className="nb-skel-line x-skel" />}
        </p>
        <div className="nb-hero-ctl">
          <div className="nb-place-search"><PlaceSearch options={placeOptions} onPick={pickPlace} label={patch?.mine ? "Change place" : "Set your place"} placeholder={patch?.mine ? "Change place — locality or city" : "Set your place — locality or city"} /></div>
          <button type="button" className="x-btn" onClick={locate} disabled={locating}><Crosshair size={16} aria-hidden /> {locating ? "Finding you…" : "Use my location"}</button>
        </div>
        {note && <p className="nb-note" role="status">{note}</p>}
        <p className="nb-hero-fine">Lights are recorded animals within {RADIUS_KM} km, placed inside their cell — never an exact position. {patch?.mine ? "Your place stays on this device." : ""}</p>
      </div>
    </section>
  );

  const loadingRecords = !placeReady || loading || animals === null;

  return (
    <div className="nb">
      {hero}

      <div className="x-wrap">
        {/* ── who needs someone ──────────────────────────────────────── */}
        <section className="nb-sec" aria-labelledby="nb-hot">
          <header className="nb-sec-head">
            <div>
              <h2 id="nb-hot" className="x-h2">Who needs someone</h2>
              <p className="x-small">Animals near {cityMode ? `${city?.name} centre` : placeName ?? "here"} that the record flags as needing help or injured.</p>
            </div>
            {city && city.help > hot.length && <Link className="x-link" href={`${atlasHref}&mode=cases`}>All {fmt(city.help)} flagged in {city.name} <ArrowRight size={15} aria-hidden /></Link>}
          </header>
          {animalsError ? <p className="nb-quiet" role="alert">These records could not be loaded. Nothing has changed — try again shortly.</p>
            : loadingRecords ? <div className="nb-strip" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="nb-face"><div className="nb-face-img x-skel" /><div className="x-skel nb-skel-t" /></div>)}</div>
            : hot.length === 0 ? (
              <div className="nb-calm">
                <p><b>No animal within {RADIUS_KM} km is flagged on the record right now.</b> That is not proof that none needs help — only that nobody has recorded it. If you see one, a photograph and the place are enough.</p>
                <Link className="x-btn is-flame" href={reportHref}><Radio size={16} aria-hidden /> Report a dog</Link>
              </div>
            ) : (
              <ol className="nb-strip">
                {hot.slice(0, 10).map((a) => <li key={a.id} className="nb-face"><AnimalTile a={a} /></li>)}
              </ol>
            )}
        </section>

        {/* ── seen lately ────────────────────────────────────────────── */}
        <section className="nb-sec" aria-labelledby="nb-recent">
          <header className="nb-sec-head">
            <div>
              <h2 id="nb-recent" className="x-h2">On the record nearby</h2>
              <p className="x-small">{stats ? <>{fmt(stats.n)} profiles are loaded within {RADIUS_KM} km. Photographs first; every other animal is known by its record.</> : "Reading nearby records…"}</p>
            </div>
            <Link className="x-link" href={patch ? `/map?mode=animals&lat=${patch.lat}&lng=${patch.lng}${city ? `&city=${encodeURIComponent(city.name)}` : ""}` : "/map"}>Open them on the Atlas <ArrowUpRight size={15} aria-hidden /></Link>
          </header>
          {loadingRecords ? <div className="nb-sheet" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="nb-card"><div className="nb-card-img x-skel" /></div>)}</div>
            : recent.length === 0 ? <p className="nb-quiet">No individual record is loaded around this place yet. A photograph and the place are enough to start one.</p>
            : (
              <ol className="nb-sheet">
                {recent.map((a) => (
                  <li key={a.id} className={`nb-card${a.cover_photo ? " has-photo" : ""}`}>
                    <AnimalTile a={a} size="s" />
                    <span className="nb-card-care"><CareLine ster={a.sterilisation_status} vacc={a.vaccination_status} /></span>
                  </li>
                ))}
              </ol>
            )}
        </section>

        {followed.length > 0 && (
          <section className="nb-sec" aria-labelledby="nb-follow">
            <header className="nb-sec-head">
              <div><h2 id="nb-follow" className="x-h2">Animals you follow</h2><p className="x-small">Saved on this device, wherever they are.</p></div>
              <Link className="x-link" href="/following"><Bookmark size={15} aria-hidden /> All saved</Link>
            </header>
            <ol className="nb-strip is-small">
              {followed.slice(0, 8).map((a) => <li key={a.id} className="nb-face"><AnimalTile a={a} size="s" /></li>)}
            </ol>
          </section>
        )}

        {/* ── what changed, and what you can do ──────────────────────── */}
        <section className="nb-sec nb-act" aria-label="What you can do here">
          {lastSeenVisit && stats?.changed && (
            <div className="nb-changed">
              <h2 className="x-h3">Since you last looked <span className="x-small">· {dayLabel(stats.since)}</span></h2>
              <dl>
                <div><dt>sightings sent in</dt><dd className="x-num">{stats.newSightings}</dd></div>
                <div><dt>animals newly recorded</dt><dd className="x-num">{stats.newAnimals}</dd></div>
                <div><dt>requests for help</dt><dd className="x-num">{stats.newRequests}</dd></div>
                <div><dt>care recorded</dt><dd className="x-num">{stats.newCare}</dd></div>
              </dl>
            </div>
          )}
          <div className="nb-ask">
            <h2 className="x-h2">The most useful thing <em>you</em> can do here</h2>
            {stats && stats.sterUnknown > 0 ? (
              <p><b className="x-num">{fmt(stats.sterUnknown)}</b> of the {fmt(stats.n)} loaded profiles around {placeName} have no sterilisation status recorded. Unknown is not "no" — but a clear photograph of a notched ear lets a care team settle it.</p>
            ) : cells && cells.edge.length > 0 ? (
              <p><b className="x-num">{cells.edge.length}</b> cells at the edge of this place have no animal recorded at all. That is a gap in the record, not proof that no animal lives there.</p>
            ) : stats && stats.boosterDue > 0 ? (
              <p><b className="x-num">{stats.boosterDue}</b> animals here were last vaccinated more than a year ago, by the record. A sighting tells a team they are still around.</p>
            ) : (
              <p>Every sighting with a photograph and a place adds to an animal's history and helps a care team find it.</p>
            )}
            <div className="nb-ask-do">
              <Link className="x-btn is-flame" href={reportHref}><Radio size={16} aria-hidden /> Report what you see</Link>
              <Link className="x-btn" href="/resources">Emergency contacts</Link>
            </div>
          </div>
        </section>

        {/* ── finished nearby ────────────────────────────────────────── */}
        {(shownStories.length > 0 || storyError) && (
          <section className="nb-sec" aria-labelledby="nb-done">
            <header className="nb-sec-head">
              <div><h2 id="nb-done" className="x-h2">Followed through</h2><p className="x-small">Recent requests {near.length ? "near here" : `in ${city?.name ?? "this city"}`} with care or an outcome on the record.</p></div>
              <Link className="x-link" href={`/stories${city ? `?city=${encodeURIComponent(city.name)}` : ""}`}>All stories <ArrowRight size={15} aria-hidden /></Link>
            </header>
            {storyError ? <p className="nb-quiet" role="status">Recent stories are unavailable just now.</p> : (
              <ol className="x-rows nb-stories">
                {shownStories.map((s) => (
                  <li key={s.id}><Link className="x-row" href={`/dog/${s.dog_id}`}>
                    <DogPhoto src={s.cover_photo} alt="" seed={s.dog_id} tone={s.resolved_at ? "resolved" : "neutral"} className="nb-story-img" />
                    <span><b>{realName(s.animal_name) ?? (s.zone ? `Dog near ${s.zone.split(",")[0]}` : s.animal_code ?? "A dog")}</b><small className="x-small">{[s.title && !s.zone?.includes(s.title) ? s.title.split(" · ")[0] : null, s.ngo_name].filter(Boolean).join(" · ") || "Request on the record"}</small></span>
                    <span className={`x-state ${s.resolved_at ? "is-done" : "is-open"}`}>{s.resolved_at ? `Closed ${when(s.resolved_at) ?? ""}` : `Opened ${when(s.occurred_at) ?? ""}`}</span>
                  </Link></li>
                ))}
              </ol>
            )}
          </section>
        )}

        {/* ── the bridge to the Atlas ────────────────────────────────── */}
        <Link href={atlasHref} className="nb-atlas x-night">
          <span>
            <span className="x-kicker">The Living Atlas</span>
            <b>See how {city?.name ?? "this city"}&apos;s record was collected — rescue, care and campaigns, cell by cell.</b>
          </span>
          <ArrowUpRight size={22} aria-hidden />
        </Link>
      </div>
    </div>
  );
}



/** What the record says about care, in words. Unknown is hatched, never "no". */
function CareLine({ ster, vacc }: { ster: string | null; vacc: string | null }) {
  const s = ster === "sterilised" ? "yes" : ster === "not_sterilised" ? "no" : "unknown";
  const v = vacc === "vaccinated" ? "yes" : vacc === "not_vaccinated" ? "no" : "unknown";
  return (
    <>
      <span className={`x-state ${s === "yes" ? "is-care" : s === "unknown" ? "is-unknown" : ""}`}>{s === "yes" ? "Sterilised" : s === "no" ? "Recorded not sterilised" : "Sterilisation not recorded"}</span>
      <span className={`x-state ${v === "yes" ? "is-care" : v === "unknown" ? "is-unknown" : ""}`}>{v === "yes" ? "Vaccinated" : v === "no" ? "Recorded not vaccinated" : "Vaccination not recorded"}</span>
    </>
  );
}
