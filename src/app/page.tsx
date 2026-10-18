import Link from "next/link";
import { unstable_cache } from "next/cache";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { FooterIndex } from "@/components/site/FooterIndex";
import { getAnimalRegister, getLandingStory, type RegisterFocus } from "@/lib/landing/story";
import { getFaces, getMapCities, getMapCity, getNationalCells } from "@/lib/livingmap/server";
import { placeName } from "@/lib/livingmap/reading";
import { getDogProfile } from "@/lib/data";
import { getProfileOperationalRecord } from "@/lib/animal-profile-record";
import { getPublicAnimalIdentity } from "@/lib/animal-identity";
import { buildLiving, type Living } from "@/lib/animal/living";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sxSerif } from "@/components/shell/fonts";
import { Stage } from "@/components/bindu/stage";
import { ToneWatch, Split } from "@/components/bindu/Tone";
import { Flight, type Focus, type Pin } from "@/components/bindu/Flight";
import { Explore, type CityFacts } from "@/components/bindu/Explore";
import { Relay, RELAY_STEPS } from "@/components/bindu/Relay";
import { Identity, type IdCard } from "@/components/bindu/Identity";
import { Lifeline, type LifeCard, type LifeEvent } from "@/components/bindu/Lifeline";
import { Workspace, type AnimalRow } from "@/components/bindu/Workspace";
import { Words, type Word } from "@/components/bindu/Words";
import { Rail } from "@/components/bindu/Rail";
import type { Cell } from "@/components/bindu/mapkit";
import { dogArtFor, WORKS } from "@/lib/art/sources";
import "@/components/site/site.css";
import "@/components/site/field-site.css";
import "@/components/landing/landing.css";
import "@/components/bindu/bindu.css";

export const revalidate = 300;
export const metadata = {
  title: "StrayPaw. Every street animal, on one map.",
  description: "StrayPaw connects WhatsApp reports, rescue cases, animal histories and a live 3D map of India in one system for residents, NGOs and cities.",
};

/* ════════════════════════════════════════════════════════════════════
   The landing, map first. The camera falls from the Earth at night to
   one locality in Coimbatore over columns of real records; the dot it
   lands on opens into a WhatsApp message; the message becomes a case;
   real animals keep their identities; one life runs corner to corner;
   the workspace rises off the table; the map is handed to you; and the
   page ends on what StrayPaw is for. Few words; the record does the
   talking. Every figure, place, photo and queue row is live; the
   WhatsApp exchange is an example and says so.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const month = (iso: string | null) => { if (!iso) return null; const d = new Date(iso); return Number.isFinite(d.getTime()) ? `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}` : null; };
const CHAPTERS = [["b-hero", "India"], ["b-relay", "Report"], ["b-id", "Identity"], ["b-life", "History"], ["b-work", "Workspace"], ["b-map", "Map"], ["b-words", "Product"], ["b-end", "Join"]] as const;

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
  /* a real photograph first, then the fullest history */
  const score = (l: Living) => (l.photo && !l.photoSensitive && l.events.length >= 4 ? 1000 : 0) + l.events.length + l.cases.length * 3 + l.events.filter((e) => e.lane === "care").length * 2;
  return lives.sort((a, b) => score(b) - score(a))[0] ?? null;
}, ["landing-life-v7"], { revalidate: 3600 });

export default async function HomePage() {
  const [story, register, rawCities, rawFaces, national] = await Promise.all([
    getLandingStory().catch(() => null),
    getAnimalRegister().catch(() => ({ total: 0, cards: [] as RegisterFocus[] })),
    getMapCities().catch(() => []),
    getFaces().catch(() => []),
    getNationalCells().catch(() => null),
  ]);
  const cells: Cell[] = (national?.cells ?? []).map(([lng, lat, n]) => [lng, lat, n]);
  const placed = rawCities.filter((c) => c.lng != null && c.lat != null && c.animals > 0);
  const pins: Pin[] = [...placed].sort((a, b) => b.animals - a.animals).slice(0, 10).map((c) => ({ city: c.city, c: [c.lng!, c.lat!] }));
  const sample = story?.hero.city ?? null;
  const sampleCity = rawCities.find((c) => c.city === sample) ?? null;
  const totals = story?.totals ?? null;
  const [reports, life, cityRead] = await Promise.all([
    recentReports().catch(() => null),
    pickLife([...RICH, ...rawFaces.map((f) => f.id), story?.relay?.animalId ?? ""].filter(Boolean).slice(0, 8)),
    sample ? getMapCity(sample).catch(() => null) : Promise.resolve(null),
  ]);

  /* Where the camera lands: the sample city's fullest locality, read from the same areas the Map draws. */
  const place = (() => {
    const by = new Map<string, { animals: number; h3s: string[]; best: { a: number; c: [number, number] } }>();
    for (const q of cityRead?.cells ?? []) {
      const n = placeName(q.zone); if (n === "Unnamed area") continue;
      const g = by.get(n) ?? { animals: 0, h3s: [], best: { a: -1, c: q.c } };
      g.animals += q.animals; g.h3s.push(q.h3); if (q.animals > g.best.a) g.best = { a: q.animals, c: q.c };
      by.set(n, g);
    }
    const top = [...by.entries()].sort((a, b) => b[1].animals - a[1].animals)[0];
    return top ? { name: top[0], animals: top[1].animals, c: top[1].best.c, h3s: top[1].h3s } : null;
  })();
  const focus: Focus = sampleCity?.lng != null && sampleCity?.lat != null ? { city: { name: sampleCity.city, c: [sampleCity.lng, sampleCity.lat] }, place: place ? { name: place.name, c: place.c, h3s: place.h3s } : null } : null;
  const facts: CityFacts[] = [...rawCities].sort((a, b) => b.animals - a.animals).map((c) => ({ city: c.city, c: c.lng != null && c.lat != null ? [c.lng, c.lat] : null, animals: c.animals, cells: c.cells, sterilised: c.sterilised, cases: c.cases }));

  const seen = new Set<string>(life ? [life.id] : []);
  const idCards: IdCard[] = [
    ...register.cards.filter((c) => c.cover_photo).map((c) => ({ id: c.id, name: c.name ?? c.straypaw_id ?? "On the record", place: [c.zone, c.city].filter(Boolean).join(", "), photo: c.cover_photo, sid: c.straypaw_id, since: month(c.first_seen) })),
    ...rawFaces.map((f) => ({ id: f.id, name: f.title, place: f.city, photo: f.photo, sid: null, since: null })),
  ].filter((c) => !seen.has(c.id) && !!seen.add(c.id)).slice(0, 7);
  const animalRows: AnimalRow[] = register.cards.filter((c) => c.cover_photo).map((c) => ({ id: c.id, name: c.name ?? c.straypaw_id ?? "On the record", place: [c.zone, c.city].filter(Boolean).join(", "), photo: c.cover_photo, ster: c.sterilisation, seen: month(c.last_seen) }));
  const lifeCard: LifeCard | null = life ? (() => {
    const art = dogArtFor(life.id, life.size);
    const events: LifeEvent[] = life.events.slice(-8).map((e) => ({ id: e.id, date: day(e.date), title: e.title.replace(/\s*[—–]\s*/g, ", "), lane: e.lane === "case" ? "case" : e.lane === "care" ? "care" : "seen" }));
    return { id: life.id, label: life.label, sid: life.straypawId, place: [life.locality, life.city].filter(Boolean).join(", "), photo: life.photo && !life.photoSensitive ? life.photo : null, art: { src: art.src, ground: art.ground, title: WORKS[art.work].title }, events };
  })() : null;
  const words: Word[] = [
    { w: "Reports", sub: "on WhatsApp", href: "/community/report" },
    { w: "Cases", sub: "for rescue teams", href: "/for-ngos" },
    { w: "Identities", sub: "for every animal", href: "/explore" },
    { w: "Workspaces", sub: "for NGOs", href: "/partner-apply" },
    { w: "Maps", sub: "for every city", href: "/for-governments" },
    { w: "Evidence", sub: "for partners", href: "/for-funders" },
  ];
  const city = sample ?? "the city";

  return (
    <div className={`sp field-site product-site ld bindu is-night ${sxSerif.variable}`}>
      <PageView name="landing_view" />
      <ToneWatch />
      <SiteHeader tone="night" />
      <Rail chapters={CHAPTERS.map(([id, label]) => ({ id, label }))} />
      <main>
        {/* From the Earth at night to one locality, over columns of real records. */}
        <Stage id="b-hero" className="b-hero" screens={6} still={0.5} tone="night" label="StrayPaw">
          <Flight cells={cells} pins={pins} focus={focus} />
          <div className="fl-shade" aria-hidden />
          <div className="fl-beat is-0">
            <h1><Split text="Every street animal." /> <em><Split text="On one map." /></em></h1>
            <div className="b-acts">
              <Link href="/explore" className="b-btn is-flame">Explore the live map <ArrowUpRight size={17} aria-hidden /></Link>
              <Link href="/partner-apply" className="b-btn is-ghost">For NGOs</Link>
            </div>
          </div>
          {totals && <p className="fl-beat is-1" style={{ ["--a" as string]: 0.17, ["--b" as string]: 0.38 }}><b>{fmt(totals.animals)}</b><span>animal records. {fmt(totals.cities)} cities. {fmt(cells.length)} areas.</span></p>}
          {sampleCity && <p className="fl-beat is-2" style={{ ["--a" as string]: 0.43, ["--b" as string]: 0.62 }}><b>{sampleCity.city}</b><span>{fmt(sampleCity.animals)} animals. {fmt(sampleCity.cells)} areas.</span></p>}
          {place && <p className="fl-beat is-3" style={{ ["--a" as string]: 0.69, ["--b" as string]: 0.87 }}><b>{place.name}</b><span>{fmt(place.animals)} animals on the record.</span></p>}
          <div className="fl-door" aria-hidden>
            <div className="fl-msg"><p>Hi, there&rsquo;s a brown dog near the bus stand. Its back leg is bleeding.</p><small>8:42</small></div>
          </div>
        </Stage>

        {/* The message becomes the case: its parts fly into the record, the replies fly back. */}
        <Stage id="b-relay" className="b-relay" screens={5} steps={RELAY_STEPS} tone="day" label="From WhatsApp to a case">
          <header className="b-head"><h2>Report on WhatsApp. <em>It becomes a case.</em></h2></header>
          <Relay />
        </Stage>

        {idCards.length > 2 && (
          <Stage id="b-id" className="b-id" screens={3.4} tone="night" label="Every animal keeps its identity">
            <header className="b-head is-left"><h2>Every animal. <em>One identity.</em></h2></header>
            <Identity cards={idCards} />
          </Stage>
        )}

        {lifeCard && lifeCard.events.length > 1 && (
          <Stage id="b-life" className="b-life" screens={3.2} tone="day" label="One animal's recorded history">
            <header className="b-head is-corner"><h2>One life. <em>Every step.</em></h2></header>
            <Lifeline life={lifeCard} />
          </Stage>
        )}

        {story && (
          <Stage id="b-work" className="b-work" screens={2.6} tone="day" label="The NGO workspace">
            <header className="b-head"><h2>One workspace. <em>The whole team.</em></h2></header>
            <Workspace city={city} live={story.desk.live} critical={story.desk.critical} queue={story.desk.queue} animals={animalRows} cells={story.desk.cells} box={story.desk.box}
              facts={sampleCity ? { city: sampleCity.city, animals: sampleCity.animals, cases: sampleCity.cases, sterilised: sampleCity.sterilised, ster_unknown: sampleCity.ster_unknown, cells: sampleCity.cells } : null} />
          </Stage>
        )}

        {/* The map, handed over. */}
        <section id="b-map" className="b-map" data-tone="night" aria-labelledby="b-map-t">
          <header className="b-head"><h2 id="b-map-t">India, live. <em>Fly it.</em></h2></header>
          <Explore cells={cells} facts={facts} sample={sample} />
        </section>

        <Stage id="b-words" className="b-words" screens={2.6} tone="day" label="What StrayPaw is">
          <Words words={words} />
        </Stage>

        <section id="b-end" className="b-end" data-tone="night" aria-labelledby="b-end-t">
          <h2 id="b-end-t" className="be-say"><span>Every animal.</span><span>Every rescue.</span><em>One record.</em></h2>
          {totals && (
            <dl className="be-pf">
              <div><dd>{fmt(totals.animals)}</dd><dt>animal records</dt></div>
              <div><dd>{fmt(totals.cities)}</dd><dt>cities</dt></div>
              <div><dd>{fmt(totals.cases)}</dd><dt>requests for help</dt></div>
              {reports !== null && <div><dd>{fmt(reports)}</dd><dt>reports in 90 days</dt></div>}
            </dl>
          )}
          <div className="b-acts is-center">
            <Link href="/explore" className="b-btn is-flame">Explore the live map <ArrowUpRight size={17} aria-hidden /></Link>
            <Link href="/partner-apply" className="b-btn is-ghost">Get StrayPaw for your NGO</Link>
            <Link href="/community/report" className="b-btn is-ghost">Report an animal</Link>
          </div>
          <p className="be-alt"><Link href="/for-governments">Cities</Link><Link href="/for-funders">Partners</Link><Link href="/learn">Learn</Link><Link href="/contact">Contact</Link></p>
          <p className="be-fine">Records, not a census. Most are registers organisations brought with them; one animal can be recorded many times.</p>
        </section>
      </main>
      <footer className="ld-foot b-foot" data-tone="night">
        <div className="ld-foot-top">
          <Link href="/" className="ld-foot-brand">StrayPaw<span>From the first report to the recorded outcome.</span></Link>
          <FooterIndex />
        </div>
        <p className="ld-foot-base"><span>© {new Date().getFullYear()} StrayPaw</span><span>Map data © OpenStreetMap contributors, OpenFreeMap. <Link href="/art-credits">Art credits</Link></span></p>
      </footer>
    </div>
  );
}
