"use client";

/* Community home on the shared dashboard frame: the city around you as a
   live 3D map, its headline record, who needs someone nearby and what was
   followed through. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Crosshair, MapPin, Radio } from "lucide-react";
import { Dashboard, Feed, MapChips, Panel, type Item } from "./Dashboard";
import { LiveMap, type MapTone } from "./LiveMap";
import { useCityCells, MEASURE_LABEL, ago, fmtN, type Measure } from "./useCity";
import { CellCard } from "./CellCard";
import { useSpatialDataset } from "@/components/spatial/data";
import { PlaceSearch, type PlaceOption } from "@/components/app/PlaceSearch";
import { AnimalTile } from "@/components/community/AnimalTile";
import { usePlace, kmBetween } from "@/lib/place";
import { useFollows } from "@/lib/follows";
import type { PublicCaseStory } from "@/lib/community-case-stories";

type PAnimal = { id: string; name: string | null; straypaw_id: string | null; cover_photo: string | null; status: string | null; needs_help: boolean | null; zone: string | null; last_seen: string | null; h3_r8: string | null; sex?: string | null; size?: string | null };
const RADIUS = 2.5;
const LENSES: { id: Measure; label: string; tone: MapTone }[] = [
  { id: "animals", label: "Animals", tone: "blue" },
  { id: "needs_help", label: "Needs help", tone: "flame" },
  { id: "open_cases", label: "Open requests", tone: "flame" },
  { id: "sterilised", label: "Care", tone: "teal" },
];

export function CommunityDash({ stories, availableCities = [], defaultCity = null }: { stories: PublicCaseStory[]; availableCities?: { city: string; state: string | null }[]; defaultCity?: string | null }) {
  const router = useRouter();
  const { ds, city, cities, loading } = useSpatialDataset("public");
  const { cells, names } = useCityCells(city, ds);
  const { place, locating, choose, locate } = usePlace();
  const { ids: follows } = useFollows();
  const [lens, setLens] = useState<Measure>("animals");
  const [sel, setSel] = useState<string | null>(null);
  const [near, setNear] = useState<PAnimal[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const row = cities.find((c) => c.city === city) ?? null;
  /* All cities on the record, so a city's figure is never mistaken for the country's. */
  const india = useMemo(() => cities.reduce((a, c) => ({ animals: a.animals + Number(c.animals || 0), sterilised: a.sterilised + Number(c.sterilised || 0), vaccinated: a.vaccinated + Number(c.vaccinated || 0) }), { animals: 0, sterilised: 0, vaccinated: 0 }), [cities]);
  const loaded = ds?.cities.find((c) => c.name === city);

  /* The place you set, if it is in this city; otherwise the city centre. */
  const centre = useMemo<[number, number] | null>(() => {
    if (place && loaded && kmBetween([place.lng, place.lat], [loaded.lng, loaded.lat]) < 40) return [place.lng, place.lat];
    return loaded ? [loaded.lng, loaded.lat] : null;
  }, [place, loaded]);
  const placeLabel = place && centre && place.lng === centre[0] ? place.label.split(",")[0] : city;

  useEffect(() => {
    if (!ds || !centre) return;
    const keys: string[] = [];
    for (let i = 0; i < ds.cells.length; i++) if (kmBetween(centre, [ds.centers[i * 2], ds.centers[i * 2 + 1]]) <= RADIUS) keys.push(ds.cells[i]);
    if (!keys.length) { setNear([]); return; }
    let live = true; setNear(null);
    fetch(`/api/spatial/patch?cells=${keys.slice(0, 80).join(",")}`).then((r) => (r.ok ? r.json() : { animals: [] })).then((j) => { if (live) setNear(j.animals ?? []); }).catch(() => { if (live) setNear([]); });
    return () => { live = false; };
  }, [ds, centre]);

  const options = useMemo<PlaceOption[]>(() => {
    const out: PlaceOption[] = [];
    const seen = new Set<string>();
    for (const c of availableCities) if (!seen.has(c.city)) { seen.add(c.city); out.push({ key: `ac:${c.city}`, name: c.city, city: c.state ?? "" }); }
    if (ds) { const loc = new Map<number, number>(); ds.cellLocality.forEach((l, c) => { if (l >= 0 && !loc.has(l)) loc.set(l, c); }); for (const [l, c] of loc) out.push({ key: `l:${c}`, name: ds.localities[l], city: city ?? "" }); }
    return out;
  }, [availableCities, ds, city]);
  const pick = (o: PlaceOption) => {
    if (o.key.startsWith("ac:")) { const n = o.key.slice(3); if (n !== city) router.push(`/app?city=${encodeURIComponent(n)}`, { scroll: false }); return; }
    const c = Number(o.key.slice(2)); if (ds && Number.isFinite(c)) choose({ lng: ds.centers[c * 2], lat: ds.centers[c * 2 + 1], label: `${o.name}, ${o.city}` });
  };
  const findMe = async () => { const r = await locate(); setNote(r.ok ? null : r.why === "abroad" ? "Your location is outside India." : "Location unavailable. Choose a place instead."); };

  const L = LENSES.find((l) => l.id === lens)!;
  const mapCells = (cells ?? []).map((c) => ({ h3: c.h3_r8, value: (c[lens] as number | undefined) ?? 0, hot: c.needs_help, label: names.get(c.h3_r8) ?? null }));
  const selCell = sel ? cells?.find((c) => c.h3_r8 === sel) : null;
  const [focus, setFocus] = useState<string | null>(null);
  const vp = useMemo(() => (city ? { city: city } : null), [city]);

  const hot = (near ?? []).filter((a) => a.needs_help || a.status === "injured");
  const feed: Item[] = stories.filter((s) => !city || !s.city || s.city === city).slice(0, 7).map((s) => ({
    key: s.id, href: `/dog/${s.dog_id}`,
    title: s.resolved_at ? `${s.title?.split(" · ")[0] ?? "Request"} closed` : `${s.title?.split(" · ")[0] ?? "Request"} opened`,
    meta: [s.zone, s.ngo_name].filter(Boolean).join(" · "), right: ago(s.resolved_at ?? s.occurred_at), tag: { text: "", tone: s.resolved_at ? "care" : "open" },
  }));
  const recent = (near ?? []).filter((a) => !(a.needs_help || a.status === "injured")).sort((a, b) => Number(!!b.cover_photo) - Number(!!a.cover_photo) || (b.last_seen ?? "").localeCompare(a.last_seen ?? "")).slice(0, 6);

  return (
    <Dashboard
      eyebrow={<><MapPin size={14} aria-hidden /> {place ? "Your place" : `Most recently active city${defaultCity ? "" : ""}`} · {row?.state ?? ""}</>}
      title={<>Around <em>{placeLabel ?? "…"}</em></>}
      subtitle={note ?? "Recorded animals, requests and care around you. Counts are records, never a population."}
      controls={<div className="db-place"><PlaceSearch options={options} onPick={pick} label="Change place" placeholder="Change place…" /><button type="button" className="x-btn" onClick={findMe} disabled={locating}><Crosshair size={15} aria-hidden /> {locating ? "Locating…" : "Near me"}</button></div>}
      kpis={[
        { label: "Animals on record", value: row?.animals, note: `${city ?? ""} · all sources`, href: `/map?city=${encodeURIComponent(city ?? "")}` },
        { label: "Flagged needing help", value: row?.needs_help, tone: "hot", note: `Across ${city ?? "the city"} · injured or a reporter asked` },
        { label: "Open requests", value: row?.open_cases, tone: "blue", note: `Across ${city ?? "the city"} · of ${fmtN(row?.cases)} case records` },
        { label: "Sterilised, all India", value: india.sterilised, tone: "care", note: `${city ?? "This city"}: ${fmtN(row?.sterilised)}`, href: "/explore#care" },
        { label: "Vaccinated, all India", value: india.vaccinated, tone: "care", note: `${city ?? "This city"}: ${fmtN(row?.vaccinated)}`, href: "/explore#care" },
        { label: "You follow", value: follows?.length ?? 0, href: "/following", note: "Saved on this device" },
      ]}
      map={<LiveMap pin={selCell ? <CellCard h3={selCell.h3_r8} title={names.get(selCell.h3_r8) ?? "This area"} facts={`${fmtN(selCell.animals)} animals · ${fmtN(selCell.open_cases)} open requests · ${fmtN(selCell.needs_help)} flagged`} href={`/map?city=${encodeURIComponent(city ?? "")}&cell=${selCell.h3_r8}`} linkLabel="Open this area on the map" focus={focus} onClose={() => { setSel(null); setFocus(null); }} /> : null} cells={mapCells} tone={L.tone} metric={MEASURE_LABEL[lens]} label={`${city}: ${MEASURE_LABEL[lens]} by cell`} viewport={vp} dotFocus={lens === "needs_help" || lens === "open_cases" ? "hot" : "all"} selected={sel} onCell={(h, id) => { setSel(h); setFocus(id ?? null); }} emptyNote={loading ? "Reading the city…" : `No ${MEASURE_LABEL[lens]} recorded here.`}>
        <MapChips value={lens} options={LENSES} onChange={setLens} label="Map measure" />
        <Link href={`/map?city=${encodeURIComponent(city ?? "")}`} className="db-maplink">Open full map <ArrowUpRight size={14} aria-hidden /></Link>
      </LiveMap>}
      side={<>
        <Panel title="Needs someone near you" note={`Flagged animals within ${RADIUS} km`} count={near ? hot.length : undefined} action={{ label: "Report a dog", href: centre ? `/report?lat=${centre[1]}&lng=${centre[0]}` : "/report" }}>
          {near === null ? (
            <div className="db-reclist" aria-busy="true">{[0, 1, 2].map((i) => <span key={i} className="db-skel" />)}</div>
          ) : hot.length ? (
            <div className="db-reclist">{hot.slice(0, 6).map((a) => <AnimalTile key={a.id} a={a} size="row" />)}</div>
          ) : (
            <div className="db-empty"><p>No animal within {RADIUS} km is flagged right now. That only means nobody has recorded one. <Link href="/report" className="db-inline">Report a dog <Radio size={13} aria-hidden /></Link></p></div>
          )}
        </Panel>
        <Panel title="Followed through" action={{ label: "Stories", href: `/stories${city ? `?city=${encodeURIComponent(city)}` : ""}` }}>
          <Feed items={feed} empty="No recent outcomes are published for this city." />
        </Panel>
      </>}
    >
      {recent.length > 0 && (
        <Panel title={`On the record within ${RADIUS} km`} action={{ label: "See on the map", href: centre ? `/map?mode=animals&lat=${centre[1]}&lng=${centre[0]}&city=${encodeURIComponent(city ?? "")}` : "/map" }}>
          <div className="db-tiles">{recent.map((a) => <AnimalTile key={a.id} a={a} size="s" />)}</div>
        </Panel>
      )}
    </Dashboard>
  );
}
