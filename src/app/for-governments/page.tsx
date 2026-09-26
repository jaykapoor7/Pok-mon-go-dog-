import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HexPlate, type PlateCell, type Box } from "@/components/system/HexPlate";
import { getPublicDataset } from "@/lib/spatial/server";
import { buildIndex, cellStats, COVERAGE_ORDER, COVERAGE_TEXT, type Coverage } from "@/lib/spatial/engine";
import { A, A_STRIDE, K, K_STRIDE } from "@/lib/spatial/types";
import { getWardCities } from "@/lib/wards";
import { getSupabase } from "@/lib/supabase";
import "@/components/site/site.css";
import "@/components/company/company.css";
import "./cities.css";

export const dynamic = "force-dynamic";
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
/* Coverage is ink weight on the night ground, never a hue. */
const INK: Record<Coverage, number> = { strong: 0.95, partial: 0.62, weak: 0.36, insufficient: 0.18, unmapped: 0 };
const NIGHT_INK = "rgb(239, 231, 218)";

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
  const [ds, wardCities, pc] = await Promise.all([
    getPublicDataset(null).catch(() => null),
    getWardCities().catch(() => []),
    programmeCounts().catch(() => ({ programmes: 0, areaFacts: 0, municipal: [] as string[] })),
  ]);

  /* The city with the most field work, as the landing picks it. */
  let ci = -1;
  if (ds) ds.cities.forEach((c, i) => { if (ci < 0 || c.cases > ds.cities[ci].cases || (c.cases === ds.cities[ci].cases && c.animals > ds.cities[ci].animals)) ci = i; });
  const city = ds && ci >= 0 ? ds.cities[ci] : null;
  const ix = ds ? buildIndex(ds) : null;
  const stats = ds && ix && ci >= 0 ? cellStats(ds, ix, ds.today, undefined, ci).filter((s) => s.animals > 0 || s.events > 0) : [];
  const frontier = ds && ci >= 0 ? ds.frontier.filter((f) => f.city === ci) : [];
  const byCov = new Map<Coverage, number>();
  for (const s of stats) byCov.set(s.coverage, (byCov.get(s.coverage) ?? 0) + 1);
  byCov.set("unmapped", frontier.length);

  const plateCells: PlateCell[] = ds ? [
    ...frontier.map((f) => ({ key: `f-${f.cell}`, ring: f.ring, fill: "transparent", stroke: "rgba(239,231,218,0.45)", dashed: true })),
    ...stats.map((s) => ({ key: ds.cells[s.cell], ring: ds.rings[s.cell], fill: NIGHT_INK, opacity: Math.max(0.12, INK[s.coverage]) })),
  ] : [];
  const plateBox = ds && city ? boxOf(stats.map((s) => ds.rings[s.cell]), 0.006) : null;

  /* Animal → locality → ward → city, from the same city's record. */
  const locCount = new Map<number, number>();
  if (ds) for (const s of stats) { const li = ds.cellLocality[s.cell]; if (li >= 0) locCount.set(li, (locCount.get(li) ?? 0) + s.animals); }
  const topLoc = [...locCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const locCells = ds && topLoc ? stats.filter((s) => ds.cellLocality[s.cell] === topLoc[0]) : [];
  const oneCell = locCells.sort((a, b) => b.animals - a.animals)[0];
  const wards = city ? wardCities.find((w) => w.level === "ward" && w.city.toLowerCase() === city.name.toLowerCase())?.wards ?? 0 : 0;
  const wardCityCount = wardCities.filter((w) => w.level === "ward").length;
  const rung = (cells: typeof stats, hot?: number): PlateCell[] => ds ? cells.map((s) => ({ key: ds.cells[s.cell], ring: ds.rings[s.cell], fill: s.cell === hot ? "var(--sp-flame)" : "var(--sp-seq-3)" })) : [];

  /* Programme records held for the whole register. */
  let abc = 0, arv = 0;
  if (ds) {
    const ABC = ds.dict.care.indexOf("sterilisation"), ARV = ds.dict.care.indexOf("vaccination");
    for (let i = 0; i < ds.care.length; i += K_STRIDE) { if (ds.care[i + K.kind] === ABC) abc++; if (ds.care[i + K.kind] === ARV) arv++; }
  }
  const animalsInCity = ds && ci >= 0 ? (() => { let n = 0; for (let i = 0; i < ds.animals.length; i += A_STRIDE) if (ds.animals[i + A.city] === ci) n++; return n; })() : 0;

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
                {city && <Link href={`/insights?city=${encodeURIComponent(city.name)}`} className="co-link">Read {city.name} <ArrowUpRight size={14} /></Link>}
              </p>
            </div>
            {city && plateBox && plateCells.length > 0 && (
              <figure className="gv-plate">
                <HexPlate night width={560} height={460} box={plateBox} cells={plateCells} label={`Coverage of ${city.name}: each recorded cell drawn by how well it is mapped, with the unmapped edge dashed`} scaleBarKm={2} />
                <figcaption><span className="sys-mono">{city.name} · live</span>Each cell about 0.7 km². Brighter is better mapped; dashed is not mapped yet.</figcaption>
              </figure>
            )}
          </div>
        </section>

        {city && (
          <section className="co-sec" aria-labelledby="gv-cov">
            <div className="co-sec-in">
              <header className="co-sec-head">
                <h2 id="gv-cov">Coverage, <em>and the unmapped gaps.</em></h2>
                <p>How well each place in {city.name} is recorded, by the same rules the map uses. A place not mapped is a place nobody has recorded, not a place without dogs.</p>
              </header>
              <ol className="gv-cov">
                {COVERAGE_ORDER.map((c) => (
                  <li key={c}>
                    <i className={`gv-sw is-${c}`} aria-hidden />
                    <span><b>{COVERAGE_TEXT[c].label}</b><small>{COVERAGE_TEXT[c].rule}</small></span>
                    <strong>{fmt(byCov.get(c) ?? 0)}<small>{c === "unmapped" ? "cells at the edge" : "cells"}</small></strong>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {city && topLoc && oneCell && ds && (
          <section className="co-sec is-shell" aria-labelledby="gv-roll">
            <div className="gv-roll-in">
              <header className="co-sec-head gv-roll-head">
                <h2 id="gv-roll">Animal, locality, ward, city: <em>one record, rolled up.</em></h2>
              </header>
              <ol className="gv-roll">
                <li>
                  <HexPlate width={120} height={120} box={boxOf([ds.rings[oneCell.cell]], 0.001)} cells={rung([oneCell], oneCell.cell)} label="One animal's cell" />
                  <small>Animal</small><b>One StrayPaw ID</b><p>Its cases, care and outcome, placed in its cell, never at an address.</p>
                </li>
                <li>
                  <HexPlate width={120} height={120} box={boxOf(locCells.map((s) => ds.rings[s.cell]), 0.002)} cells={rung(locCells, oneCell.cell)} label={`The locality ${ds.localities[topLoc[0]]}`} />
                  <small>Locality</small><b>{ds.localities[topLoc[0]]}</b><p>{fmt(topLoc[1])} animals on record across {locCells.length} cell{locCells.length === 1 ? "" : "s"}.</p>
                </li>
                <li>
                  <span className="gv-ward" aria-hidden><i /></span>
                  <small>Ward</small><b>{wards > 0 ? `${fmt(wards)} wards loaded` : "Ward boundaries, where supplied"}</b>
                  <p>{wards > 0 ? `Every locality in ${city.name} rolls into its municipal ward.` : `Localities roll into wards once a city's ward boundaries are loaded; ${wardCityCount} ${wardCityCount === 1 ? "city has" : "cities have"} them today.`}</p>
                </li>
                <li>
                  <HexPlate width={120} height={120} box={plateBox!} cells={rung(stats)} label={`The city of ${city.name}`} />
                  <small>City</small><b>{city.name}</b><p>{fmt(animalsInCity)} animals and {fmt(city.cases)} requests, in one view a council can read.</p>
                </li>
              </ol>
            </div>
          </section>
        )}

        <section className="co-sec" aria-labelledby="gv-q">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="gv-q">Questions a municipality <em>can answer.</em></h2>
              <p>Each one is answered from the record, on a page anyone can open.</p>
            </header>
            <ol className="co-rows">
              <li><span className="co-n">01</span><span><b>Which localities has nobody recorded?</b><p>The unmapped edge of the record, drawn and counted, so a drive can be planned where the gaps are.</p></span><Link className="gv-q-go" href="/map">Map</Link></li>
              <li><span className="co-n">02</span><span><b>How many animals are known to be sterilised, and of how many checked?</b><p>Every rate shown twice: of the animals actually examined, and of everything on record.</p></span><Link className="gv-q-go" href="/insights">Insights</Link></li>
              <li><span className="co-n">03</span><span><b>How quickly do requests get a field response?</b><p>Time to first action and to closure, from recorded dates only; assumed dates are counted and left out.</p></span><Link className="gv-q-go" href="/insights">Insights</Link></li>
              <li><span className="co-n">04</span><span><b>What happened to a particular animal?</b><p>One StrayPaw ID carries every report, case, treatment and outcome, with who recorded each.</p></span><Link className="gv-q-go" href="/stories">Stories</Link></li>
            </ol>
          </div>
        </section>

        <section className="co-sec is-shell" aria-labelledby="gv-prog">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="gv-prog">ABC, ARV, census <em>and programme records.</em></h2>
              <p>The records a municipal programme is judged on, held in one place and counted across the register.</p>
            </header>
            <dl className="gv-figs">
              <div><dt>Sterilisations (ABC) on record</dt><dd>{fmt(abc)}</dd></div>
              <div><dt>Anti-rabies vaccinations (ARV) on record</dt><dd>{fmt(arv)}</dd></div>
              <div><dt>Census and survey figures, by area</dt><dd>{fmt(pc.areaFacts)}</dd></div>
              <div><dt>Published programmes and drives</dt><dd>{fmt(pc.programmes)}</dd></div>
            </dl>
          </div>
        </section>

        <section className="co-sec" aria-labelledby="gv-import">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="gv-import">Bring the data <em>you already hold.</em></h2>
              <p>Existing municipal and NGO records come in as they are, mapped and checked before anything is added, with their source kept.</p>
            </header>
            <ol className="co-steps">
              <li><b>Census and survey tables</b><p>Ward and zone counts stay area facts; they are never turned into invented animals.</p></li>
              <li><b>ABC and ARV registers</b><p>Each row becomes care on an animal where the register identifies one, and a counted fact where it does not.</p></li>
              <li><b>NGO rescue registers</b><p>Imported as history, dated by the event, placed no finer than the source allows, with reporters&apos; names left out.</p></li>
            </ol>
            {pc.municipal.length > 0 && <p className="gv-already">Already imported with their source: {pc.municipal.join(", ")}.</p>}
          </div>
        </section>

        <section className="co-sec is-shell" aria-labelledby="gv-prov">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="gv-prov">Provenance <em>on every figure.</em></h2>
            </header>
            <ul className="co-terms">
              <li><b>Where each record came from</b><p>A resident report, a field intake or an imported register, badged on the record itself.</p></li>
              <li><b>Absence is recorded</b><p>A place with no data is reported as not recorded, never as zero coverage.</p></li>
              <li><b>Nothing merged on a guess</b><p>Two reports become one animal only when a field team confirms it.</p></li>
              <li><b>Every source is named</b><p>Licence, date and department, on <Link href="/evidence">the evidence page</Link>.</p></li>
            </ul>
          </div>
        </section>

        <section className="co-close">
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
