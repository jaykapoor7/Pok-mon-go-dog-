import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PhoneTabs } from "@/components/shell/PhoneTabs";
import { LightsMap } from "@/components/system/LightsMap";
import { getPublicSpatialCities } from "@/lib/spatial/server";
import { CITIES } from "@/lib/geo/cities";
import "@/components/site/site.css";
import "@/components/company/company.css";
import "./explore.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Explore the record, StrayPaw",
  description: "Every place with a street animal on the record across India, and the ways in: the live map, a brief on any place, stories and the evidence behind each figure.",
};

/* ════════════════════════════════════════════════════════════════════
   Explore: the atlas's front door. One question, answered before anything
   else: what is recorded, and where? India at night, one light for every
   cell that holds a record; the cities, in order of what they hold; then
   the four ways in, each with its own live figure. It never repeats those
   pages: the map is /map, the brief is /insights, the rescues are
   /stories, the sources are /evidence. Recorded animals, not population.
   ════════════════════════════════════════════════════════════════════ */

const INDIA: [number, number, number, number] = [68.0, 7.0, 92.0, 35.6];
const fmt = (n: number) => n.toLocaleString("en-IN");

export default async function ExplorePage() {
  const cities = await getPublicSpatialCities().catch(() => []);
  const animals = cities.reduce((sum, city) => sum + city.animals, 0);
  const cases = cities.reduce((sum, city) => sum + city.cases, 0);
  /* One light per city summary: this page is an atlas doorway, while /map
     fetches the bounded cell geometry for the selected city. */
  const lights = cities.flatMap((city) => {
    const point = CITIES.find((item) => item.name.toLowerCase() === city.city.toLowerCase());
    return point ? [{ lng: point.lng, lat: point.lat }] : [];
  });
  /* Sterilisation and vaccination across every city on the record, from the same rollup as the
     city list. These count animals the records say were sterilised or vaccinated; a register that
     records a status counts even where it has no dated procedure. */
  const sterilised = cities.reduce((sum, city) => sum + Number(city.sterilised || 0), 0);
  const vaccinated = cities.reduce((sum, city) => sum + Number(city.vaccinated || 0), 0);
  const careRows = cities
    .filter((city) => Number(city.sterilised || 0) > 0 || Number(city.vaccinated || 0) > 0)
    .sort((a, b) => Number(b.sterilised || 0) + Number(b.vaccinated || 0) - (Number(a.sterilised || 0) + Number(a.vaccinated || 0)));
  const latestYear = (iso: string | null | undefined) => { const t = iso ? new Date(iso) : null; return t && !Number.isNaN(+t) ? String(t.getUTCFullYear()) : "not dated"; };
  const top = cities.slice(0, 10);
  const max = Math.max(1, ...top.map((x) => x.animals));
  const rest = cities.slice(10);

  const doors = [
    { href: "/map", k: "Map", d: "Every recorded animal on the streets it lives on, with its cases and care. Filter by what was done and when." },
    { href: "/insights", k: "Insights", d: "One place at a time: what is recorded there, what was done, how fast, and what is still unknown." },
    { href: "/stories", k: "Stories", d: "Rescues with an issue, care and an outcome, followed from the day it was reported to the day it ended." },
    { href: "/evidence", k: "Evidence", d: "Where every imported record came from, its licence, and what the public evidence does and does not say." },
  ];

  return (
    <AppShell>
    <div className="co ex ex-inapp">
      <main>
        <section className="ex-hero" aria-labelledby="ex-title">
          <div className="ex-map" aria-hidden={lights.length === 0}>
            {lights.length > 0 && <LightsMap center={[82.8, 22.6]} box={INDIA} lights={lights} dot={2.2} glow={2} label={`${fmt(cities.length)} recorded cities across India`} />}
          </div>
          <div className="ex-hero-copy">
            <p className="co-kicker">Explore the record</p>
            <h1 id="ex-title">What is recorded, <em>and&nbsp;where.</em></h1>
            <p className="co-lede">Each light is a place of about 0.7 km² with at least one street animal on the record. Recorded animals, not population: a dark place has not been recorded, not found empty.</p>
            <p className="co-acts">
              <Link href="/map" className="sys-btn is-flame">Open the live map <ArrowUpRight size={15} /></Link>
              <Link href="/insights" className="co-link">Read one place <ArrowUpRight size={14} /></Link>
            </p>
          </div>
        </section>

        <PhoneTabs label="Explore" tabs={[
          { id: "where", label: "Where", node: top.length > 0 ? (
<section className="co-sec" aria-labelledby="ex-where">
            <div className="co-sec-in">
              <header className="co-sec-head">
                <h2 id="ex-where">Where the record <em>is deepest.</em></h2>
                <p>{fmt(cases)} case records sit on these animals&apos; records. They include imported clinic and rescue registers, so a larger count is not necessarily more requests. A short bar is a city recorded less, not a city with fewer animals.</p>
              </header>
              <div>
                <ol className="ex-cities">
                  {top.map((x) => (
                    <li key={`${x.city}-${x.state}`}>
                      <Link href={`/map?city=${encodeURIComponent(x.city)}`}>
                        <span className="ex-city"><b>{x.city}</b><small>{x.state}</small></span>
                        <span className="ex-bar" aria-hidden><i style={{ width: `${Math.max(1.5, (x.animals / max) * 100)}%` }} /></span>
                        <span className="ex-n"><strong>{fmt(x.animals)}</strong>{x.cases > 0 ? `${fmt(x.cases)} case record${x.cases === 1 ? "" : "s"}` : "no case records yet"}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
                {rest.length > 0 && <p className="ex-rest">And {rest.length} more: {rest.slice(0, 8).map((x) => x.city).join(", ")}{rest.length > 8 ? "…" : ""}</p>}
              </div>
            </div>
          </section>
          ) : null },
          { id: "care", label: "Care", node: careRows.length > 0 ? (
<section className="co-sec" id="care" aria-labelledby="ex-care">
            <div className="co-sec-in">
              <header className="co-sec-head">
                <h2 id="ex-care">Sterilisation and vaccination <em>on the record.</em></h2>
                <p>{fmt(vaccinated)} of {fmt(animals)} recorded animals are recorded as vaccinated and {fmt(sterilised)} as sterilised, across {fmt(careRows.length)} cities. That is what the records say, not how many animals are protected today: most come from a few large registers, each from the years shown. A dash is not recorded, never zero protected.</p>
              </header>
              <ol className="ex-care">
                <li className="ex-care-head" aria-hidden><span>City</span><span>Animals</span><span>Sterilised</span><span>Vaccinated</span><span>Latest record</span></li>
                {careRows.map((x) => (
                  <li key={`${x.city}-${x.state}`}>
                    <Link href={`/insights?city=${encodeURIComponent(x.city)}`}>
                      <span className="ex-city"><b>{x.city}</b><small>{x.state}</small></span>
                      <span data-l="Animals">{fmt(x.animals)}</span>
                      <span data-l="Sterilised">{Number(x.sterilised || 0) > 0 ? fmt(Number(x.sterilised)) : "–"}</span>
                      <span data-l="Vaccinated">{Number(x.vaccinated || 0) > 0 ? fmt(Number(x.vaccinated)) : "–"}</span>
                      <span data-l="Latest record">{latestYear(x.latest_seen)}</span>
                    </Link>
                  </li>
                ))}
                <li className="ex-care-total"><span><b>All cities</b></span><span>{fmt(animals)}</span><span>{fmt(sterilised)}</span><span>{fmt(vaccinated)}</span><span /></li>
              </ol>
              <p className="ex-rest">Campaigns and drives behind these figures are listed with their dates and totals on <Link href="/programmes">the programmes page</Link>.</p>
            </div>
          </section>
          ) : null },
          { id: "ways", label: "Ways in", node: (
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
                    <p>{d.d}</p>
                    <span className="ex-go">Open {d.k.toLowerCase()} <ArrowUpRight size={14} aria-hidden /></span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
          ) },
        ]} />
      </main>
    </div>
    </AppShell>
  );
}
