import Link from "next/link";
import { unstable_cache } from "next/cache";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { FooterIndex } from "@/components/site/FooterIndex";
import { getAnimalRegister, getLandingStory, type RegisterFocus } from "@/lib/landing/story";
import { getFaces, getMapCities, getNationalCells } from "@/lib/livingmap/server";
import { kindOf } from "@/sp/atlas/evidence";
import { getDogProfile } from "@/lib/data";
import { getProfileOperationalRecord } from "@/lib/animal-profile-record";
import { getPublicAnimalIdentity } from "@/lib/animal-identity";
import { buildLiving, type Living } from "@/lib/animal/living";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sxSerif } from "@/components/shell/fonts";
import { Stage } from "@/components/bindu/stage";
import { Bindu, type Cell, type CityPin } from "@/components/bindu/Bindu";
import { ToneWatch, Split } from "@/components/bindu/Tone";
import { Relay, RELAY_STEPS } from "@/components/bindu/Relay";
import { Identity, type IdCard } from "@/components/bindu/Identity";
import { Lifeline, type LifeCard, type LifeEvent } from "@/components/bindu/Lifeline";
import { Circle, type AnimalRow } from "@/components/bindu/Circle";
import { Atlas, type CityFacts } from "@/components/bindu/Atlas";
import { Tree, type Branch } from "@/components/bindu/Tree";
import { Rail } from "@/components/bindu/Rail";
import type { HomeCity, HomeFace } from "@/components/bindu/IndiaStrings";
import { dogArtFor, WORKS } from "@/lib/art/sources";
import "@/components/site/site.css";
import "@/components/site/field-site.css";
import "@/components/landing/landing.css";
import "@/components/bindu/bindu.css";

export const revalidate = 300;
export const metadata = {
  title: "StrayPaw. Infrastructure for street-animal care in India.",
  description: "StrayPaw connects community reporting on WhatsApp, rescue case management, lasting animal histories and a living map of India in one system for residents, NGOs and cities.",
};

/* ════════════════════════════════════════════════════════════════════
   Bindu, the dot. In Gond painting a creature is made of dots; on
   StrayPaw every dot is a place on the record. The page follows one dot:
   it is a painted dog, then a recorded area of India, then one message,
   a case, an animal's history, a team's work, a city's map, and at the
   end every dot gathers back into the painting.

   Every figure, place, photograph and queue row is read live from the
   public record. The WhatsApp conversation and its case are an example,
   and say so. The folk drawings are original artwork made for StrayPaw.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const month = (iso: string | null) => { if (!iso) return null; const d = new Date(iso); return Number.isFinite(d.getTime()) ? `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}` : null; };
const CHAPTERS = [["b-hero", "The dot"], ["b-relay", "One message"], ["b-id", "Identity"], ["b-life", "One life"], ["b-circle", "The work"], ["b-atlas", "The map"], ["b-tree", "What we built"], ["b-end", "Join"]] as const;

async function readLife(id: string | null | undefined): Promise<Living | null> {
  if (!id) return null;
  try {
    const [profile, operational, identity] = await Promise.all([getDogProfile(id), getProfileOperationalRecord(id), getPublicAnimalIdentity(id)]);
    return profile ? await buildLiving(profile, operational, identity) : null;
  } catch (e) { console.error("landing life read failed", e); return null; }
}

/* Community reports sent through StrayPaw in the last 90 days: one server-side aggregate count, never a row. */
const recentReports = unstable_cache(async (): Promise<number | null> => {
  const supa = getSupabaseAdmin(); if (!supa) return null;
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { count, error } = await supa.from("sightings").select("id", { count: "exact", head: true }).gte("created_at", since);
  return error ? null : count ?? null;
}, ["landing-recent-reports-v1"], { revalidate: 3600 });

/* Two public records with long care histories (read live; if either leaves the record the next fullest is used). */
const RICH = ["c3ffa160-ba51-42e6-8e69-a87d8ea1f2aa", "acf85c40-f5c7-4527-af44-f34c252878d4"];
const pickLife = unstable_cache(async (ids: string[]): Promise<Living | null> => {
  const lives = (await Promise.all(ids.map(readLife))).filter((l): l is Living => !!l);
  const score = (l: Living) => l.events.length + l.cases.length * 3 + l.events.filter((e) => e.lane === "care").length * 2;
  return lives.sort((a, b) => score(b) - score(a))[0] ?? null;
}, ["landing-life-v5"], { revalidate: 3600 });

export default async function HomePage() {
  const [story, register, rawCities, rawFaces, national] = await Promise.all([
    getLandingStory().catch(() => null),
    getAnimalRegister().catch(() => ({ total: 0, cards: [] as RegisterFocus[] })),
    getMapCities().catch(() => []),
    getFaces().catch(() => []),
    getNationalCells().catch(() => null),
  ]);
  const cells: Cell[] = (national?.cells ?? []).map(([lng, lat, n]) => [lng, lat, n]);
  const pins: CityPin[] = rawCities.filter((c) => c.lng != null && c.lat != null && c.animals > 0).map((c) => ({ city: c.city, lng: c.lng!, lat: c.lat!, animals: c.animals }));
  const sample = story?.hero.city ?? null;
  const focusCity = rawCities.find((c) => c.city === sample) ?? null;
  const focusAt: [number, number] | null = focusCity?.lng != null && focusCity?.lat != null ? [focusCity.lng, focusCity.lat] : null;
  const totals = story?.totals ?? null;
  const [reports, life] = await Promise.all([
    recentReports().catch(() => null),
    pickLife([...RICH, ...rawFaces.map((f) => f.id), story?.relay?.animalId ?? ""].filter(Boolean).slice(0, 8)),
  ]);
  const cities: HomeCity[] = rawCities.filter((c) => c.lng != null && c.lat != null && c.animals > 0)
    .map((c) => ({ city: c.city, lng: c.lng!, lat: c.lat!, animals: c.animals, hollow: kindOf(c.city, c.cells) === "clinical" }));
  const faces: HomeFace[] = rawFaces.map((f) => ({ id: f.id, title: f.title, describe: f.describe, photo: f.photo, city: f.city, lng: f.c[0], lat: f.c[1] }));
  const facts: CityFacts[] = [...rawCities].sort((a, b) => b.animals - a.animals)
    .map((c) => ({ city: c.city, state: c.state, animals: c.animals, cells: c.cells, sterilised: c.sterilised, ster_unknown: c.ster_unknown, cases: c.cases, hollow: kindOf(c.city, c.cells) === "clinical" }));

  /* Identity: the register's photographed animals first, then the Map's; never the life we unroll next. */
  const seen = new Set<string>(life ? [life.id] : []);
  const idCards: IdCard[] = [
    ...register.cards.filter((c) => c.cover_photo).map((c) => ({ id: c.id, name: c.name ?? c.straypaw_id ?? "On the record", place: [c.zone, c.city].filter(Boolean).join(", "), photo: c.cover_photo, sid: c.straypaw_id, since: month(c.first_seen) })),
    ...faces.map((f) => ({ id: f.id, name: f.title, place: f.city, photo: f.photo, sid: null, since: null })),
  ].filter((c) => !seen.has(c.id) && !!seen.add(c.id)).slice(0, 7);
  const animalRows: AnimalRow[] = register.cards.filter((c) => c.cover_photo).map((c) => ({ id: c.id, name: c.name ?? c.straypaw_id ?? "On the record", place: [c.zone, c.city].filter(Boolean).join(", "), photo: c.cover_photo, ster: c.sterilisation, seen: month(c.last_seen) }));

  /* One life: its recorded events in order, the photograph only if it is safe to show. */
  const lifeCard: LifeCard | null = life ? (() => {
    const art = dogArtFor(life.id, life.size);
    const events: LifeEvent[] = life.events.slice(-9).map((e) => ({ id: e.id, date: day(e.date), title: e.title, lane: e.lane === "case" ? "case" : e.lane === "care" ? "care" : "seen" }));
    return { id: life.id, label: life.label, sid: life.straypawId, place: [life.locality, life.city].filter(Boolean).join(", "), photo: life.photo && !life.photoSensitive ? life.photo : null, art: { src: art.src, ground: art.ground, title: WORKS[art.work].title }, events };
  })() : null;

  const branches: Branch[] = [
    { title: "Reporting on WhatsApp", body: "Residents send a photo and a place; it lands as a report", href: "/community/report" },
    { title: "Rescue cases", body: "Triage, an owner, treatment and follow-ups", href: "/for-ngos" },
    { title: "Animal identities", body: "One ID and a lasting history for every animal", href: lifeCard ? `/animal/${lifeCard.id}` : "/explore" },
    { title: "NGO workspace", body: "The queue, the register, the team", href: "/for-ngos" },
    { title: "The living map", body: "Every recorded area in India, down to the locality", href: "/explore" },
    { title: "City intelligence", body: "Coverage, sterilisation and gaps, with their limits", href: "/for-governments" },
    { title: "Evidence of work", body: "Reports partners and funders can check", href: "/for-funders" },
    { title: "Learning", body: "Courses and guides for carers and teams", href: "/learn" },
  ];
  const city = story?.hero.city ?? "the sample city";

  return (
    <div className={`sp field-site product-site ld bindu is-night ${sxSerif.variable}`}>
      <PageView name="landing_view" />
      <ToneWatch />
      <SiteHeader tone="night" />
      <Rail chapters={CHAPTERS.map(([id, label]) => ({ id, label }))} />
      <main>
        {/* I · The painting, the map, the dot, the message. */}
        <Stage id="b-hero" className="b-hero" screens={4.2} still={0} tone="night" label="StrayPaw">
          <Bindu cells={cells} cities={pins} focusAt={focusAt} mode="hero" />
          <div className="bh-copy">
            <p className="bh-k">StrayPaw · India</p>
            <h1><Split text="The infrastructure for" /> <em><Split text="street-animal care." /></em></h1>
            <p className="bh-lede">A report on WhatsApp becomes a rescue case, an animal&rsquo;s lasting history and a living map of India: one system for residents, rescue teams and cities.</p>
            <div className="b-acts">
              <Link href="/explore" className="b-btn is-flame">Explore the live map <ArrowUpRight size={17} aria-hidden /></Link>
              <Link href="/partner-apply" className="b-btn is-ghost">Get StrayPaw for your NGO</Link>
              <Link href="/community/report" className="b-link">Report an animal</Link>
            </div>
          </div>
          <p className="bh-cue" aria-hidden><i />Scroll: every dot is a place</p>
          <div className="bh-cap" style={{ ["--a" as string]: 0.3, ["--b" as string]: 0.52 }}>
            <b>Every dot is a place.</b>
            <span>{fmt(cells.length)} recorded areas{totals ? ` in ${fmt(totals.cities)} cities` : ""}. Where more animals are on the record, the dot is larger. An empty place is unrecorded, not empty.</span>
          </div>
          <div className="bh-cap" style={{ ["--a" as string]: 0.5, ["--b" as string]: 0.64 }}>
            <b>{totals ? `${fmt(totals.animals)} animal records.` : "Animal records."}</b>
            <span>Most are historical registers that organisations brought with them. A record is not a census: one animal can be seen, treated and recorded many times.</span>
          </div>
          <div className="bh-cap" style={{ ["--a" as string]: 0.66, ["--b" as string]: 0.86 }}>
            <b>One of them is in {sample ?? "a city"}.</b>
            <span>Every rescue there starts the same way.</span>
          </div>
          <div className="bh-door" aria-hidden>
            <div className="bh-msg"><p>Hi, there&rsquo;s a brown dog near the bus stand. Its back leg is bleeding.</p><small>8:42</small></div>
            <p className="bh-door-k">It starts with one message.</p>
          </div>
        </Stage>

        {/* II · One message becomes one record: the bubbles fly into the case, the replies fly back. */}
        <Stage id="b-relay" className="b-relay" screens={5.2} steps={RELAY_STEPS} tone="day" label="From WhatsApp to a case">
          <header className="b-head"><p className="b-k">Reporting on WhatsApp</p><h2>One message. <em>One record, for good.</em></h2></header>
          <Relay />
        </Stage>

        {/* III · Drawn, photographed, on the record. */}
        {idCards.length > 2 && (
          <Stage id="b-id" className="b-id" screens={3.4} tone="day" label="Every animal keeps its identity">
            <header className="b-head is-left"><p className="b-k">{totals ? `${fmt(totals.animals)} animal records` : "Animal records"}</p><h2>Drawn. Photographed. <em>On the record.</em></h2><p>Every animal keeps one identity: its StrayPaw ID, its places, and every sighting, case and treatment in order. These are real animals; open any of them.</p></header>
            <Identity cards={idCards} />
          </Stage>
        )}

        {/* IV · One life, unrolled corner to corner as a river. */}
        {lifeCard && lifeCard.events.length > 1 && (
          <Stage id="b-life" className="b-life" screens={3.2} tone="day" label="One animal's recorded history">
            <header className="b-head is-corner"><h2>One life, <em>as the record keeps it.</em></h2></header>
            <Lifeline life={lifeCard} />
          </Stage>
        )}

        {/* V · The circle of people unrolls into the workspace they share. */}
        {story && (
          <Stage id="b-circle" className="b-circle" screens={3.6} tone="night" label="The NGO workspace">
            <Circle city={city} live={story.desk.live} critical={story.desk.critical} queue={story.desk.queue} animals={animalRows} cells={story.desk.cells} box={story.desk.box}
              facts={focusCity ? { city: focusCity.city, animals: focusCity.animals, cases: focusCity.cases, sterilised: focusCity.sterilised, ster_unknown: focusCity.ster_unknown, cells: focusCity.cells } : null} />
          </Stage>
        )}

        {/* VI · The living map, at night, to explore. */}
        <section id="b-atlas" className="b-atlas" data-tone="night" aria-labelledby="b-atlas-t">
          <header className="b-head is-left"><p className="b-k">The living map</p><h2 id="b-atlas-t">India, city by city. <em>Animal by animal.</em></h2><p>Choose a city. Each point of light is a recorded area; a hollow mark is a city-level register, never a street.</p></header>
          <Atlas cities={cities} faces={faces} facts={facts} sample={sample} sky={cells} />
        </section>

        {/* VII · What we have built: the tree. */}
        <Stage id="b-tree" className="b-tree" screens={2.4} tone="day" label="What StrayPaw has built">
          <header className="b-head"><p className="b-k">Why we exist</p><h2>Street-animal care runs on scattered messages. <em>We are building the record it never had.</em></h2>
            <p>Our mission is to make street-animal care more coordinated, accountable and informed, with technology anyone can use. One trunk, the shared record; a branch for every part of the work.</p></header>
          <Tree items={branches} />
        </Stage>

        {/* VIII · Every dot gathers back into the painting; the invitation. */}
        <Stage id="b-end" className="b-end" screens={2.6} still={1} tone="night" label="Join StrayPaw">
          <Bindu cells={cells} cities={pins} focusAt={null} mode="finale" />
          <div className="be-copy">
            <p className="b-k">Where we are going</p>
            <h2>The information and coordination layer for India&rsquo;s street animals: <em>a city that remembers every animal.</em></h2>
            {totals && (
              <dl className="be-pf">
                <div><dt>Animal records</dt><dd>{fmt(totals.animals)}</dd><small>mostly imported registers</small></div>
                <div><dt>Cities</dt><dd>{fmt(totals.cities)}</dd><small>street areas to city level</small></div>
                <div><dt>Requests for help</dt><dd>{fmt(totals.cases)}</dd><small>open and closed</small></div>
                {reports !== null && <div><dt>Community reports</dt><dd>{fmt(reports)}</dd><small>through StrayPaw, last 90 days</small></div>}
              </dl>
            )}
            <div className="b-acts is-center">
              <Link href="/explore" className="b-btn is-flame">Explore the live map <ArrowUpRight size={17} aria-hidden /></Link>
              <Link href="/partner-apply" className="b-btn is-ghost">Get StrayPaw for your NGO</Link>
              <Link href="/community/report" className="b-btn is-ghost">Report an animal</Link>
            </div>
            <p className="be-alt"><Link href="/for-governments">For cities</Link><Link href="/for-funders">For funders and partners</Link><Link href="/learn">Learn</Link><Link href="/contact">Contact us</Link></p>
          </div>
        </Stage>
      </main>
      <footer className="ld-foot b-foot" data-tone="night">
        <div className="ld-foot-top">
          <Link href="/" className="ld-foot-brand">StrayPaw<span>From the first report to the recorded outcome.</span></Link>
          <FooterIndex />
        </div>
        <p className="ld-foot-base"><span>© {new Date().getFullYear()} StrayPaw</span><span>The dog, the circle, the tree and the borders on this page are original drawings made for StrayPaw in the manner of Gond, Warli and Madhubani painting; they are not the work of those traditions&rsquo; artists. Museum and Gond works elsewhere: <Link href="/art-credits">Art credits</Link></span></p>
      </footer>
    </div>
  );
}
