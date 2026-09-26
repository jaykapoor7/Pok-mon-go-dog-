import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LightsMap } from "@/components/system/LightsMap";
import { CountFigures } from "@/components/company/CountFigures";
import { getPublicDataset } from "@/lib/spatial/server";
import { A, A_STRIDE, C_STRIDE, countOf } from "@/lib/spatial/types";
import { getSupabase } from "@/lib/supabase";
import "@/components/site/site.css";
import "@/components/company/company.css";
import "./explore.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Explore the record, StrayPaw",
  description: "What is recorded, and where: every place with a street animal on the record across India, and the ways into it: the live map, a brief on any place, rescue stories and the evidence behind every figure.",
};

/* ════════════════════════════════════════════════════════════════════
   Explore: the atlas's front door. One question, answered before anything
   else: what is recorded, and where? India at night, one light for every
   cell that holds a record; the cities, in order of what they hold; then
   the four ways in, each with its own live figure. It never repeats those
   pages: the map is /map, the brief is /insights, the rescues are
   /stories, the sources are /evidence. Recorded animals, not population.
   ════════════════════════════════════════════════════════════════════ */

const INDIA: [number, number, number, number] = [68.0, 6.5, 97.5, 35.8];
const fmt = (n: number) => n.toLocaleString("en-IN");

async function counts() {
  const supa = getSupabase();
  if (!supa) return { stories: 0, sources: 0, sourceRecords: 0 };
  const [{ count: stories }, { data: src }] = await Promise.all([
    supa.from("public_case_stories").select("id", { count: "exact", head: true }),
    supa.from("data_sources").select("published_record_count"),
  ]);
  const rows = (src ?? []) as { published_record_count: number | null }[];
  return { stories: stories ?? 0, sources: rows.length, sourceRecords: rows.reduce((n, r) => n + (r.published_record_count ?? 0), 0) };
}

export default async function ExplorePage() {
  const [ds, c] = await Promise.all([getPublicDataset(null).catch(() => null), counts().catch(() => ({ stories: 0, sources: 0, sourceRecords: 0 }))]);
  const animals = ds ? countOf(ds.animals, A_STRIDE) : 0;
  const cases = ds ? countOf(ds.cases, C_STRIDE) : 0;
  /* One light per recorded cell, at its centre: the finest the public
     record places anything, and never a row. */
  const perCell = new Map<number, number>();
  if (ds) for (let i = 0; i < ds.animals.length; i += A_STRIDE) perCell.set(ds.animals[i + A.cell], (perCell.get(ds.animals[i + A.cell]) ?? 0) + 1);
  const lights = ds ? [...perCell.keys()].map((cell) => ({ lng: ds.centers[cell * 2], lat: ds.centers[cell * 2 + 1] })) : [];
  const cities = ds ? [...ds.cities].filter((x) => x.animals > 0).sort((a, b) => b.animals - a.animals) : [];
  const top = cities.slice(0, 10);
  const max = Math.max(1, ...top.map((x) => x.animals));
  const rest = cities.slice(10);

  const doors = [
    { href: "/map", k: "Map", n: animals, l: "animals, each in its cell", d: "Every recorded animal on the streets it lives on, with its cases and care. Filter by what was done and when." },
    { href: "/insights", k: "Insights", n: ds?.localities.length ?? 0, l: "localities with a brief", d: "One place at a time: what is recorded there, what was done, how fast, and what is still unknown." },
    { href: "/stories", k: "Stories", n: c.stories, l: "rescues told by their record", d: "Rescues with an issue, care and an outcome, followed from the day they were reported to the day they ended." },
    { href: "/evidence", k: "Evidence", n: c.sources, l: "published sources", d: "Where every imported record came from, its licence, and what the public evidence does and does not say." },
  ];

  return (
    <div className="co ex">
      <SiteHeader tone="night" />
      <main>
        <section className="ex-hero" aria-labelledby="ex-title">
          <div className="ex-map" aria-hidden={lights.length === 0}>
            {lights.length > 0 && <LightsMap center={[82.8, 22.6]} box={INDIA} lights={lights} dot={1.6} label={`${fmt(perCell.size)} places across India with a street animal on the record`} />}
          </div>
          <div className="ex-hero-copy">
            <p className="co-kicker">Explore the record</p>
            <h1 id="ex-title">What is recorded, <em>and&nbsp;where.</em></h1>
            <p className="co-lede">Each light is a place of about 0.7 km² with at least one street animal on the record. Recorded animals, not population: a dark place has not been recorded, not found empty.</p>
            <CountFigures figures={[
              { value: animals, label: "animals on the record" },
              { value: perCell.size, label: "places lit" },
              { value: cities.length, label: "cities" },
            ]} />
            <p className="co-acts">
              <Link href="/map" className="sys-btn is-flame">Open the live map <ArrowUpRight size={15} /></Link>
              <Link href="/insights" className="co-link">Read one place <ArrowUpRight size={14} /></Link>
            </p>
          </div>
        </section>

        {top.length > 0 && (
          <section className="co-sec" aria-labelledby="ex-where">
            <div className="co-sec-in">
              <header className="co-sec-head">
                <h2 id="ex-where">Where the record <em>is deepest.</em></h2>
                <p>{fmt(cases)} requests for help sit on these animals&apos; records. A short bar is a city recorded less, not a city with fewer animals.</p>
              </header>
              <div>
                <ol className="ex-cities">
                  {top.map((x) => (
                    <li key={`${x.name}-${x.state}`}>
                      <Link href={`/map?city=${encodeURIComponent(x.name)}`}>
                        <span className="ex-city"><b>{x.name}</b><small>{x.state}</small></span>
                        <span className="ex-bar" aria-hidden><i style={{ width: `${Math.max(1.5, (x.animals / max) * 100)}%` }} /></span>
                        <span className="ex-n"><strong>{fmt(x.animals)}</strong>{x.cases > 0 ? `${fmt(x.cases)} requests` : "no requests yet"}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
                {rest.length > 0 && <p className="ex-rest">And {rest.length} more: {rest.slice(0, 8).map((x) => x.name).join(", ")}{rest.length > 8 ? "…" : ""}</p>}
              </div>
            </div>
          </section>
        )}

        <section className="co-sec is-shell" aria-labelledby="ex-ways">
          <div className="ex-ways-in">
            <header className="co-sec-head ex-ways-head">
              <h2 id="ex-ways">Four ways <em>into it.</em></h2>
            </header>
            <ol className="ex-ways">
              {doors.map((d) => (
                <li key={d.href}>
                  <Link href={d.href}>
                    <small>{d.k}</small>
                    <strong>{fmt(d.n)}</strong>
                    <span className="ex-ways-l">{d.l}</span>
                    <p>{d.d}</p>
                    <span className="ex-go">Open {d.k.toLowerCase()} <ArrowUpRight size={14} aria-hidden /></span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
