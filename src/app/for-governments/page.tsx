import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HexPlate, type PlateCell, type Box } from "@/components/system/HexPlate";
import { getPublicSpatialCities, getPublicSpatialCityCells, type SpatialCell } from "@/lib/spatial/server";
import { cellToBoundary } from "h3-js";
import { getWardCities } from "@/lib/wards";
import { getSupabase } from "@/lib/supabase";
import "@/components/site/site.css";
import "@/components/company/company.css";
import "./cities.css";
import { PlaceGround } from "@/components/system/PlaceGround";

export const revalidate = 300;
export const metadata = {
  title: "For municipalities, StrayPaw",
  description: "Coverage a municipality can audit: which localities and wards are recorded and which are not, animal to locality to ward to city, with ABC, ARV, census and programme records, and existing municipal and NGO data imported with its source.",
};
/* ════════════════════════════════════════════════════════════════════
   For municipalities. Product first: the coverage of a real city, drawn the way
   the map draws it (ink weight for how well a place is recorded, a
   dashed edge where nothing is), then how one animal rolls up to a city,
   the questions a municipality can answer from that, the programme records
   it holds, how existing data comes in, and where every figure comes
   from. Nothing here is promised that the record cannot do today; ward
   boundaries are named only where a city's are loaded.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");
const NIGHT_INK = "rgb(239, 231, 218)";
const coverage = (cell: SpatialCell) => cell.animals >= 12 ? "strong" : cell.animals >= 5 ? "partial" : cell.animals >= 2 ? "weak" : "insufficient";
const INK: Record<string, number> = { strong: 0.95, partial: 0.62, weak: 0.36, insufficient: 0.18 };
const ring = (cell: SpatialCell) => cellToBoundary(cell.h3_r8, true).flatMap(([lng, lat]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]);

function boxOf(rings: number[][], pad = 0.004): Box {
  let w = 180, s = 90, e = -180, n = -90;
  for (const r of rings) for (let i = 0; i < r.length; i += 2) { w = Math.min(w, r[i]); e = Math.max(e, r[i]); s = Math.min(s, r[i + 1]); n = Math.max(n, r[i + 1]); }
  return [w - pad, s - pad, e + pad, n + pad];
}

async function programmeCounts() {
  const supa = getSupabase();
  if (!supa) return { programmes: 0, areaFacts: 0, municipal: [] as string[] };
  const [{ count: programmes }, { count: areaFacts }, { data: src }] = await Promise.all([
    supa.from("public_programme_cards").select("id", { count: "exact", head: true }),
    supa.from("public_atlas_area_metrics").select("id", { count: "exact", head: true }),
    supa.from("data_sources").select("organization_name,source_type").in("source_type", ["municipal_dataset", "government_dataset"]),
  ]);
  return { programmes: programmes ?? 0, areaFacts: areaFacts ?? 0, municipal: [...new Set(((src ?? []) as { organization_name: string }[]).map((r) => r.organization_name))] };
}

export default async function ForGovernmentsPage() {
  const [cities, wardCities, pc] = await Promise.all([
    getPublicSpatialCities().catch(() => []),
    getWardCities().catch(() => []),
    programmeCounts().catch(() => ({ programmes: 0, areaFacts: 0, municipal: [] as string[] })),
  ]);

  const city = [...cities].sort((a, b) => b.cells - a.cells)[0] ?? null;
  const cells = city ? await getPublicSpatialCityCells(city.city).catch(() => []) : [];
  const byCov = new Map<string, number>();
  for (const cell of cells) { const c = coverage(cell); byCov.set(c, (byCov.get(c) ?? 0) + 1); }
  const plateCells: PlateCell[] = cells.map((cell) => ({ key: cell.h3_r8, ring: ring(cell), fill: NIGHT_INK, opacity: Math.max(0.12, INK[coverage(cell)]) }));
  const plateBox = cells.length ? boxOf(cells.map(ring), 0.006) : null;

  /* Animal → locality → ward → city, from bounded city-cell summaries. */
  const locCount = new Map<string, number>();
  for (const cell of cells) if (cell.zone) locCount.set(cell.zone, (locCount.get(cell.zone) ?? 0) + cell.animals);
  const topLoc = [...locCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const locCells = topLoc ? cells.filter((cell) => cell.zone === topLoc[0]) : [];
  const oneCell = [...locCells].sort((a, b) => b.animals - a.animals)[0];
  const wards = city ? wardCities.find((w) => w.level === "ward" && w.city.toLowerCase() === city.city.toLowerCase())?.wards ?? 0 : 0;
  const wardCityCount = wardCities.filter((w) => w.level === "ward").length;
  const rung = (rows: SpatialCell[], hot?: string): PlateCell[] => rows.map((cell) => ({ key: cell.h3_r8, ring: ring(cell), fill: cell.h3_r8 === hot ? "var(--sp-flame)" : "var(--sp-seq-3)" }));
  const abc = cells.reduce((sum, cell) => sum + cell.sterilised, 0);
  const arv = cells.reduce((sum, cell) => sum + cell.vaccinated, 0);
  const animalsInCity = city?.animals ?? 0;

  return (
    <div className="co gv">
      <SiteHeader tone="night" />
      <main>
        <section className="gv-hero" aria-labelledby="gv-title">
          <div className="gv-hero-in">
            <div className="gv-hero-copy">
              <p className="co-kicker">For municipalities</p>
              <h1 id="gv-title">See what is covered. <em>And what is&nbsp;not.</em></h1>
              <p className="co-lede">The Animal Birth Control Rules, 2023 place sterilisation and vaccination on the local body. The hard part is proving, a year later, which localities were reached. StrayPaw draws it from the record, and draws the gaps as gaps.</p>
              <p className="co-acts">
                <Link href="/contact?subject=Request%20a%20municipal%20pilot" className="sys-btn is-flame">Request a small pilot <ArrowUpRight size={15} /></Link>
                <Link href={`/municipality${city ? `?city=${encodeURIComponent(city.city)}&mode=coverage` : ""}`} className="co-link">Open the city command <ArrowUpRight size={14} /></Link>
              </p>
            </div>
            {city && plateBox && plateCells.length > 0 && (
              <figure className="gv-plate">
                <HexPlate night width={560} height={460} box={plateBox} cells={plateCells} label={`Coverage of ${city.city}: each recorded cell drawn by how well it is mapped`} scaleBarKm={2} />
                <figcaption>
                  <span className="sys-mono">{city.city} · live · each cell about 0.7 km²</span>
                  <ul className="gv-legend">
                    {(["strong", "partial", "weak", "insufficient"] as const).map((c) => (
                      <li key={c}><i className={`gv-sw is-${c}`} aria-hidden />{c === "strong" ? "Strong record" : c === "partial" ? "Partial" : c === "weak" ? "Thin" : "Small"}<b>{fmt(byCov.get(c) ?? 0)}</b></li>
                    ))}
                  </ul>
                  <span className="gv-legend-note">A place not mapped is a place nobody has recorded, not a place without dogs.</span>
                </figcaption>
              </figure>
            )}
          </div>
        </section>

        {city && topLoc && oneCell && (
          <section className="co-sec is-shell" aria-labelledby="gv-roll">
            <div className="gv-roll-in">
              <header className="co-sec-head gv-roll-head">
                <h2 id="gv-roll">Animal, locality, ward, city: <em>one record, rolled up.</em></h2>
              </header>
              <ol className="gv-roll">
                <li>
                  <HexPlate width={120} height={120} box={boxOf([ring(oneCell)], 0.001)} cells={rung([oneCell], oneCell.h3_r8)} label="One animal's cell" />
                  <small>Animal</small><b>One StrayPaw ID</b><p>Its cases, care and outcome, placed in its cell, never at an address.</p>
                </li>
                <li>
                  <HexPlate width={120} height={120} box={boxOf(locCells.map(ring), 0.002)} cells={rung(locCells, oneCell.h3_r8)} label={`The locality ${topLoc[0]}`} />
                  <small>Locality</small><b>{topLoc[0]}</b><p>{fmt(topLoc[1])} animals on record across {locCells.length} cell{locCells.length === 1 ? "" : "s"}.</p>
                </li>
                <li>
                  <span className="gv-ward" aria-hidden><i /></span>
                  <small>Ward</small><b>{wards > 0 ? `${fmt(wards)} wards loaded` : "Ward boundaries, where supplied"}</b>
                  <p>{wards > 0 ? `Every locality in ${city.city} rolls into its municipal ward.` : `Localities roll into wards once a city's ward boundaries are loaded; ${wardCityCount} ${wardCityCount === 1 ? "city has" : "cities have"} them today.`}</p>
                </li>
                <li>
                  <HexPlate width={120} height={120} box={plateBox!} cells={rung(cells)} label={`The city of ${city.city}`} />
                  <small>City</small><b>{city.city}</b><p>{fmt(animalsInCity)} animals and {fmt(city.cases)} requests, in one view a council can read.</p>
                </li>
              </ol>
            </div>
          </section>
        )}

        <section className="co-sec" aria-labelledby="gv-q">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="gv-q">What the record <em>answers.</em></h2>
              <p>{city ? `Sterilisation and vaccination are for ${city.city}; area facts and programmes across the public register.` : "Across the public register."} Each answer is on a page anyone can open.</p>
              <dl className="gv-figs is-compact">
                <div><dt>Sterilisations (ABC)</dt><dd>{fmt(abc)}</dd></div>
                <div><dt>Rabies vaccinations (ARV)</dt><dd>{fmt(arv)}</dd></div>
                <div><dt>Census figures, by area</dt><dd>{fmt(pc.areaFacts)}</dd></div>
                <div><dt>Programmes and drives</dt><dd>{fmt(pc.programmes)}</dd></div>
              </dl>
            </header>
            <ol className="co-rows">
              <li><span className="co-n">01</span><span><b>Which localities has nobody recorded?</b><p>The unmapped edge, drawn and counted, so a drive can go where the gaps are.</p></span><Link className="gv-q-go" href="/map">Map</Link></li>
              <li><span className="co-n">02</span><span><b>How many are sterilised, of how many checked?</b><p>Every rate shown twice: of the animals examined, and of everything on record.</p></span><Link className="gv-q-go" href="/insights">Insights</Link></li>
              <li><span className="co-n">03</span><span><b>How fast do requests get a field response?</b><p>From recorded dates only; assumed dates are counted and left out.</p></span><Link className="gv-q-go" href="/insights">Insights</Link></li>
              <li><span className="co-n">04</span><span><b>What happened to a particular animal?</b><p>One StrayPaw ID carries every report, case, treatment and outcome.</p></span><Link className="gv-q-go" href="/stories">Stories</Link></li>
            </ol>
          </div>
        </section>

        <section className="co-sec is-shell" aria-labelledby="gv-import">
          <div className="co-sec-in is-stack">
            <header className="co-sec-head">
              <h2 id="gv-import">Your data in, <em>its source kept.</em></h2>
              <p>Existing municipal and NGO records come in as they are, mapped and checked before anything is added.</p>
            </header>
            <div className="ngo-join">
              <ol className="co-steps">
                <li><b>Census and survey tables</b><p>Ward and zone counts stay area facts, never invented animals.</p></li>
                <li><b>ABC and ARV registers</b><p>Care on an animal where a row identifies one; a counted fact where it does not.</p></li>
                <li><b>NGO rescue registers</b><p>Imported as history, placed no finer than the source allows, reporters left out.</p></li>
              </ol>
              <ul className="ngo-terms">
                <li><b>Every record badged</b> with where it came from.</li>
                <li><b>Absence recorded</b>, never counted as zero.</li>
                <li><b>Nothing merged on a guess</b>: a field team confirms.</li>
                <li><b>Every source named</b>, on <Link href="/evidence">the evidence page</Link>.</li>
              </ul>
              {pc.municipal.length > 0 && <p className="gv-already">Already imported with their source: {pc.municipal.join(", ")}.</p>}
            </div>
          </div>
        </section>

        <section className="co-close has-ground">
          <PlaceGround className="co-hero-ground" caption={null} city={city?.city} />
          <div className="co-close-in">
            <div>
              <h2>Start with one ward, <em>one quarter.</em></h2>
              <p>A small pilot: your existing records imported, the ward&apos;s coverage drawn, and the record handed back to you.</p>
            </div>
            <p className="co-acts">
              <Link href="/contact?subject=Request%20a%20municipal%20pilot" className="sys-btn is-flame">Request a pilot <ArrowUpRight size={15} /></Link>
              <Link href="/evidence" className="co-link">See the evidence <ArrowUpRight size={14} /></Link>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
