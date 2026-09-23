import "./sys.css";
import { LAB, fmt } from "../data";
import { Band } from "./parts";
import { CoverageMap, type CovCell, type CovLoc } from "./CoverageMap";
import { cells, isGap, CBE_BOX, NOW_DAY, dayLabel } from "./sdata";
import { hexbin } from "../geo";

export function SystemCoverage() {
  const all = cells();
  // Months with work in the last twelve, and recent work, per cell.
  const evBins = hexbin(LAB.cbe.events.map((e, i) => ({ e, i })), (x) => [x.e[0], x.e[1]], 11, 0.55);
  const evBy = new Map(evBins.map((b) => [b.key, b.items.map((x) => x.e)]));
  const monthIdx = (d: number) => { const x = new Date(Date.UTC(2024, 0, 1) + d * 86400000); return (x.getUTCFullYear() - 2024) * 12 + x.getUTCMonth(); };
  const nowM = monthIdx(NOW_DAY);
  const cov: CovCell[] = all.map((c) => {
    const ev = evBy.get(c.key) ?? [];
    const months = new Set(ev.filter((e) => monthIdx(e[2]) > nowM - 12).map((e) => monthIdx(e[2]))).size;
    return { key: c.key, ring: c.ring, loc: c.locality, animals: c.animals, ster: c.ster, help: c.help, months, recent: ev.filter((e) => e[2] > NOW_DAY - 90).length, gap: isGap(c) };
  });
  const byLoc = new Map<string, CovLoc & { lastDay: number; monthSet: Set<number> }>();
  all.forEach((c) => {
    const o = byLoc.get(c.locality) ?? { name: c.locality, cells: 0, animals: 0, ster: 0, help: 0, months: 0, series: new Array(33).fill(0), last: "", gapCells: 0, lastDay: -1, monthSet: new Set<number>() };
    o.cells++; o.animals += c.animals; o.ster += c.ster; o.help += c.help; if (isGap(c)) o.gapCells++;
    for (const e of evBy.get(c.key) ?? []) { const k = monthIdx(e[2]); if (k >= 0 && k < 33) o.series[k]++; if (k > nowM - 12) o.monthSet.add(k); if (e[2] > o.lastDay) o.lastDay = e[2]; }
    byLoc.set(c.locality, o);
  });
  const locs: CovLoc[] = [...byLoc.values()].map(({ lastDay, monthSet, ...l }) => ({ ...l, months: monthSet.size, last: lastDay >= 0 ? dayLabel(lastDay) : "none" }));
  const t = LAB.totals;
  const cellsWithAnimals = cov.filter((c) => c.animals > 0);
  const present = cov.filter((c) => c.months > 0).length;
  const gapN = cov.filter((c) => c.gap).length;
  const sterAnimals = all.reduce((a, c) => a + c.ster, 0), anAnimals = all.reduce((a, c) => a + c.animals, 0);
  return (
    <main className="sx sx-covscreen">
      <Band current="/lab/system/coverage" crumbs={["India", "Coimbatore", "Ward coverage"]} />
      <section className="sx-head">
        <div>
          <span className="lbl">Ward coverage · sample city: Coimbatore · {fmt(all.length)} cells of 0.55 km</span>
          <h1>Where the work reaches, <span className="it">and where it does not.</span></h1>
        </div>
      </section>
      <section className="sx-cov-strip" aria-label="Summary">
        <p><b className="num">{fmt(present)}</b><span>cells with field work in the last 12 months, of {fmt(all.length)} with anything recorded</span></p>
        <p><b className="num need">{fmt(gapN)}</b><span>cells with animals on record and no work in 12 months — {fmt(cellsWithAnimals.length)} cells hold animals</span></p>
        <p><b className="num">{Math.round((sterAnimals / Math.max(1, anAnimals)) * 100)}%</b><span>of {fmt(anAnimals)} mapped animals have sterilisation recorded. The rest is not recorded — not known to be unsterilised.</span></p>
        <p><b className="num">{fmt(t.sterilisationEvents)}</b><span>ABC procedures on the register · {fmt(t.vaccinationEvents)} vaccinations</span></p>
      </section>
      <CoverageMap cells={cov} locs={locs} box={CBE_BOX} />
      <p className="sx-source" style={{ padding: "16px var(--sx-g) 40px" }}>A locality here is the name recorded nearest a cell&apos;s centre, standing in for a ward until ward boundaries are loaded. Public register, 23 Sep 2026; positions to ~1 km.</p>
    </main>
  );
}
