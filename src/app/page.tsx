import Link from "next/link";
import { unstable_cache } from "next/cache";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { FooterIndex } from "@/components/site/FooterIndex";
import { HeroTally } from "@/components/landing/HeroTally";
import { AnimalRegister } from "@/components/landing/AnimalRegister";
import { Relay } from "@/components/landing/Relay";
import { getAnimalRegister, getLandingStory, type RegisterFocus } from "@/lib/landing/story";
import { getFaces, getMapCities } from "@/lib/livingmap/server";
import { kindOf } from "@/sp/atlas/evidence";
import { getDogProfile } from "@/lib/data";
import { getProfileOperationalRecord } from "@/lib/animal-profile-record";
import { getPublicAnimalIdentity } from "@/lib/animal-identity";
import { buildLiving, type Living } from "@/lib/animal/living";
import { dogArtFor, WORKS } from "@/lib/art/sources";
import { IndiaStrings, type HomeCity, type HomeFace } from "@/components/home/IndiaStrings";
import { LivingMap, type CityFacts } from "@/components/home/LivingMap";
import { CareFlow } from "@/components/home/CareFlow";
import { WorkDemo } from "@/components/home/WorkDemo";
import { Tone } from "@/components/home/Tone";
import { Motion } from "@/components/home/Motion";
import { Folk } from "@/components/home/Folk";
import "@/components/site/site.css";
import "@/components/site/field-site.css";
import "@/components/landing/landing.css";
import "@/components/home/home.css";

export const revalidate = 300;
export const metadata = {
  title: "StrayPaw. Connected software for street-animal rescue in India.",
  description: "StrayPaw connects community reporting, NGO case management and municipal evidence in one shared system, from the first report to the recorded outcome.",
};

/* ════════════════════════════════════════════════════════════════════
   The landing, in one movement: the living world (India, its cities, real
   animals strung to them) turns into the working system (the app's cream
   surfaces), and then into the institutional layer. Every figure, city,
   photograph and queue row on it comes from the live record; the two
   interactive product sections use example data and say so.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const CARE: Record<string, string> = { sterilisation: "Sterilised", vaccination: "Vaccinated", treatment: "Treated", surgery: "Surgery", wound_care: "Wound care", deworming: "Dewormed", rescue: "Rescued" };

/* One real animal's public record, read exactly as its profile page reads it. */
async function readLife(id: string | null | undefined): Promise<Living | null> {
  if (!id) return null;
  try {
    const [profile, operational, identity] = await Promise.all([getDogProfile(id), getProfileOperationalRecord(id), getPublicAnimalIdentity(id)]);
    return profile ? await buildLiving(profile, operational, identity) : null;
  } catch (e) { console.error("landing life read failed", e); return null; }
}

/* Two public records with long care histories in the Coimbatore register (chosen from the record
   for their depth; read live, so if either leaves the record the next fullest is used). */
const RICH = ["c3ffa160-ba51-42e6-8e69-a87d8ea1f2aa", "acf85c40-f5c7-4527-af44-f34c252878d4"];

/* The fullest real history among a few photographed public animals: the one
   with the most recorded events, cases and care first. Cached for an hour. */
const pickLife = unstable_cache(async (ids: string[]): Promise<Living | null> => {
  /* A photo that may show an injury is never shown here: the record keeps its painting instead. */
  const lives = (await Promise.all(ids.map(readLife))).filter((l): l is Living => !!l);
  const score = (l: Living) => l.events.length + l.cases.length * 3 + l.events.filter((e) => e.lane === "care").length * 2;
  return lives.sort((a, b) => score(b) - score(a))[0] ?? null;
}, ["landing-life-v5"], { revalidate: 3600 });

export default async function HomePage() {
  const [story, register, rawCities, rawFaces] = await Promise.all([
    getLandingStory().catch(() => null),
    getAnimalRegister().catch(() => ({ total: 0, cards: [] as RegisterFocus[] })),
    getMapCities().catch(() => []),
    getFaces().catch(() => []),
  ]);
  const cities: HomeCity[] = rawCities.filter((c) => c.lng != null && c.lat != null && c.animals > 0)
    .map((c) => ({ city: c.city, lng: c.lng!, lat: c.lat!, animals: c.animals, hollow: kindOf(c.city, c.cells) === "clinical" }));
  const faces: HomeFace[] = rawFaces.map((f) => ({ id: f.id, title: f.title, describe: f.describe, photo: f.photo, city: f.city, lng: f.c[0], lat: f.c[1] }));
  const facts: CityFacts[] = [...rawCities].sort((a, b) => b.animals - a.animals)
    .map((c) => ({ city: c.city, state: c.state, animals: c.animals, cells: c.cells, sterilised: c.sterilised, ster_unknown: c.ster_unknown, cases: c.cases, care: c.care, hollow: kindOf(c.city, c.cells) === "clinical" }));
  const sample = story?.hero.city ?? null;
  const life = await pickLife([...RICH, ...rawFaces.map((f) => f.id), story?.relay?.animalId ?? ""].filter(Boolean).slice(0, 8));
  const city = facts.find((c) => c.city === sample) ?? facts.find((c) => !c.hollow) ?? null;
  /* One animal: the fullest record in the register, its own history in order. */
  const lead = [...register.cards].sort((a, b) => (b.requests.length + b.care.length) - (a.requests.length + a.care.length))[0] ?? null;
  const history = lead ? [
    ...(lead.first_seen ? [{ at: lead.first_seen, t: "First on the record", k: "seen" }] : []),
    ...lead.requests.map((r) => ({ at: r.at, t: `Request for help: ${r.condition ?? "condition not recorded"}${r.closed ? ", closed" : ", open"}`, k: "case" })),
    ...lead.care.map((c) => ({ at: c.at, t: CARE[c.kind] ?? c.kind.replace(/_/g, " "), k: "care" })),
    ...(lead.last_seen ? [{ at: lead.last_seen, t: "Last recorded", k: "seen" }] : []),
  ].sort((a, b) => a.at.localeCompare(b.at)) : [];
  const ster = city ? Math.round((city.sterilised / Math.max(1, city.animals)) * 100) : 0;
  const unk = city ? Math.round((city.ster_unknown / Math.max(1, city.animals)) * 100) : 0;

  return (
    <div className="sp field-site product-site ld home3">
      <PageView name="landing_view" />
      <Tone target=".home3" from=".h-hero" span=".h-turn" />
      <Motion />
      <SiteHeader tone="night" />
      <main>
        {/* 1. The living world. */}
        <section className="h-hero" aria-labelledby="h-title">
          <div className="h-hero-copy" data-rv="up">
            <p className="h-k is-night">For rescue organisations, residents and cities in India</p>
            <h1 id="h-title">Animal rescue shouldn&rsquo;t run on scattered messages.</h1>
            <p className="h-lede">StrayPaw connects community reporting, NGO operations and municipal intelligence in one shared system. From the first report to the recorded outcome.</p>
            <div className="h-acts">
              <Link href="/partner-apply" className="h-btn is-flame is-lg">Get StrayPaw for your NGO <ArrowUpRight size={18} aria-hidden /></Link>
              <Link href="/explore" className="h-btn is-ghost is-lg">Explore the live Map</Link>
            </div>
          </div>
          <IndiaStrings cities={cities} faces={faces} tone="night" max={6} className="h-hero-map" />
        </section>

        {/* 2. The turn: night into the app's cream, and the software appears. */}
        <section className="h-turn" aria-labelledby="h-turn-title">
          <Folk k="elephantTree" className="h-folk-turn" w={200} par={0.08} />
          <header className="h-head" data-rv="up">
            <p className="h-k">From scattered observations to organised work</p>
            <h2 id="h-turn-title">Every report becomes work someone owns.</h2>
          </header>
          {story && (
            <div data-rv="scale" className="h-app" aria-label={`Open requests on the public record in ${story.hero.city}`}>
              <div className="h-app-bar"><b>StrayPaw</b><span>NGO</span><nav><i aria-current="page">Work</i><i>Animals</i><i>Map</i></nav></div>
              <div className="h-app-body">
                <div className="h-app-day"><b>Today&rsquo;s work</b><span>{fmt(story.desk.live)} open · {fmt(story.desk.critical)} critical · {story.hero.city}</span></div>
                <ol>{story.desk.queue.slice(0, 5).map((q, i) => (
                  <li key={i} className={q.critical ? "is-crit" : ""}><b>{q.condition}</b><span>{q.locality}</span><em>{q.days === 0 ? "today" : `${q.days}d waiting`}</em></li>
                ))}</ol>
                <p className="h-app-note">Real open requests on {story.hero.city}&rsquo;s public record. No organisation is named.</p>
              </div>
            </div>
          )}
        </section>

        {/* 3. How information enters. */}
        <section className="h-sec" aria-labelledby="h-wa">
          <Folk k="bird" className="h-folk-wa" w={130} par={0.1} flip />
          <header className="h-head" data-rv="left">
            <p className="h-k">WhatsApp and the web, into one inbox</p>
            <h2 id="h-wa">From a message to a case.</h2>
            <p>Rescue lines already run on WhatsApp. StrayPaw turns each conversation into work.</p>
          </header>
          <div data-rv="right"><CareFlow /></div>
        </section>

        {/* 4. The same record, three views (preserved from the original landing). */}
        {story?.relay && (
          <section className="h-sec h-relay" aria-labelledby="h-relay">
            <Folk k="cowCalf" className="h-folk-relay" w={170} par={0.07} />
            <header className="h-head" data-rv="right">
              <p className="h-k">One record</p>
              <h2 id="h-relay">One request. Three views.</h2>
              <p>Resident, rescue team, city. One StrayPaw ID throughout.</p>
            </header>
            <div data-rv="up"><Relay city={story.hero.city} desk={story.desk} report={story.relay} /></div>
          </section>
        )}

        {/* 5. The lives behind the data: the register, and one animal's continuing history. */}
        <section className="h-sec h-lives" aria-labelledby="h-lives">
          <Folk k="dogSitting" className="h-folk-lives" w={150} par={0.09} />
          <header className="h-head" data-rv="up">
            <p className="h-k">The register</p>
            <h2 id="h-lives">One animal. One continuing history.</h2>
            <p>Every animal has a profile. Whoever helps it next sees what came before.</p>
          </header>
          <div data-rv="scale"><AnimalRegister data={register} total={story?.totals.animals ?? register.total} plate={null} /></div>
          {life && life.events.length > 1 ? (() => {
            const art = dogArtFor(life.id, life.size);
            const photo = life.photo && !life.photoSensitive ? life.photo : null;
            return (
              <article className="h-life" data-rv="left">
                <div className="h-life-id">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo ?? art.src} alt={photo ? `${life.label}, as photographed` : ""} loading="lazy" referrerPolicy="no-referrer" className={photo ? "" : "is-art"} style={photo ? undefined : { background: art.ground }} />
                  {!photo && <small className="h-life-art">No photograph on the record. Illustration, not this animal: {WORKS[art.work].title}.</small>}
                  <div><b>{life.label}</b><small>{[life.locality, life.city].filter(Boolean).join(", ")}{life.hands.orgs.length ? ` · ${life.hands.orgs.join(", ")}` : ""}</small></div>
                </div>
                <ol className="h-life-line">{life.events.slice(-7).map((e) => <li key={e.id} className={`is-${e.lane === "case" ? "case" : e.lane === "care" ? "care" : "seen"}`}><time>{day(e.date)}</time><span>{e.title}</span></li>)}</ol>
                <Link className="h-btn is-quiet" href={`/animal/${life.id}`}>Read the full record <ArrowUpRight size={16} aria-hidden /></Link>
              </article>
            );
          })() : lead && history.length > 1 && (
            <article className="h-life" data-rv="left">
              <div className="h-life-id">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lead.cover_photo} alt={`${lead.name ?? lead.straypaw_id ?? "This animal"}, as photographed`} loading="lazy" referrerPolicy="no-referrer" />
                <div><b>{lead.name ?? lead.straypaw_id}</b><small>{[lead.zone, lead.city].filter(Boolean).join(", ")}{lead.org ? ` · kept by ${lead.org}` : ""}</small></div>
              </div>
              <ol className="h-life-line">{history.map((h, i) => <li key={i} className={`is-${h.k}`}><time>{day(h.at)}</time><span>{h.t}</span></li>)}</ol>
              <Link className="h-btn is-quiet" href={`/animal/${lead.id}`}>Read the full record <ArrowUpRight size={16} aria-hidden /></Link>
            </article>
          )}
        </section>

        {/* 6. What connected records make possible geographically. */}
        <section className="h-sec h-maps" aria-labelledby="h-map">
          <Folk k="peacocks" className="h-folk-map" w={190} par={0.06} />
          <header className="h-head" data-rv="left">
            <p className="h-k">The Living Map</p>
            <h2 id="h-map">India, city by city, animal by animal.</h2>
            <p>Every record adds to the picture. Areas, never addresses.</p>
          </header>
          <div data-rv="up"><LivingMap cities={cities} faces={faces} facts={facts} sample={sample} plate={null} /></div>
        </section>

        {/* 7. The software rescue organisations work in. */}
        <section className="h-sec h-work" aria-labelledby="h-ngo">
          <Folk k="elephant" className="h-folk-work" w={200} par={0.07} flip />
          <header className="h-head" data-rv="right">
            <p className="h-k">For NGOs</p>
            <h2 id="h-ngo">Work. Animals. Map.</h2>
            <p>Triage, assign, treat, follow up. Bring your spreadsheets on day one.</p>
          </header>
          <div data-rv="left"><WorkDemo /></div>
          <div className="h-acts is-center"><Link href="/partner-apply" className="h-btn is-flame">Get StrayPaw for your NGO <ArrowUpRight size={16} aria-hidden /></Link><Link href="/for-ngos" className="h-btn is-quiet">How it works for NGOs</Link></div>
        </section>

        {/* 8. The institutional layer. */}
        {city && (
          <section className="h-sec h-city" aria-labelledby="h-muni">
            <div className="h-city-copy" data-rv="left">
              <p className="h-k">For municipalities</p>
              <h2 id="h-muni">The same records, read as a city.</h2>
              <p>Coverage, gaps and programmes, by area. Every figure with its source and its limits.</p>
              <Link href={`/city?city=${encodeURIComponent(city.city)}`} className="h-btn is-quiet">See {city.city} as a municipality <ArrowUpRight size={16} aria-hidden /></Link>
            </div>
            <figure className="h-city-fig" data-rv="right">
              <figcaption><b>{city.city}</b> · sterilisation as recorded, {fmt(city.animals)} animals</figcaption>
              <div className="h-bar" role="img" aria-label={`${ster}% recorded sterilised, ${unk}% not recorded, the rest recorded not sterilised`}>
                <i className="is-yes" style={{ width: `${ster}%` }} /><i className="is-no" style={{ width: `${Math.max(0, 100 - ster - unk)}%` }} /><i className="is-unk" style={{ width: `${unk}%` }} />
              </div>
              <ul className="h-bar-key"><li><i className="is-yes" />Recorded sterilised {ster}%</li><li><i className="is-no" />Recorded not</li><li><i className="is-unk" />Not recorded {unk}%</li></ul>
              <p className="h-fine">Recorded activity, not population coverage. Unknown is shown as unknown, never as no.</p>
            </figure>
          </section>
        )}

        {/* 9. What has actually happened. */}
        {story && (
          <section className="h-sec h-proof" aria-labelledby="h-proof">
            <header className="h-head" data-rv="up">
              <p className="h-k">On the record today</p>
              <h2 id="h-proof">Real records, from real organisations.</h2>
            </header>
            <div data-rv="scale"><HeroTally animals={story.totals.animals} cases={story.totals.cases} cities={story.totals.cities} /></div>
            <p className="h-fine is-center">Animal profiles, requests for help and cities on the public record, including historical registers organisations imported. Counts of records, not of animals in a city.</p>
            <p className="h-partner">Field partner: <b>The Pawsome People Project</b>, Coimbatore, runs its rescue cases in StrayPaw. <Link href="/community/organisations">Who keeps the record</Link></p>
          </section>
        )}

        {/* 10. The invitation. */}
        <section className="h-close" aria-labelledby="h-close">
          <Folk k="tiger" className="h-folk-close" w={170} par={0.05} />
          <h2 id="h-close" data-rv="up">Your rescue work deserves a better system.</h2>
          <p>Bring reports, cases, care and animal histories into one connected workspace.</p>
          <div className="h-acts is-center">
            <Link href="/partner-apply" className="h-btn is-flame is-lg">Get StrayPaw for your NGO <ArrowUpRight size={18} aria-hidden /></Link>
            <Link href="/explore" className="h-btn is-quiet is-lg">Explore the live Map</Link>
          </div>
        </section>
      </main>
      <footer className="ld-foot h-foot">
        <div className="ld-foot-top">
          <Link href="/" className="ld-foot-brand">StrayPaw<span>From the first report to the recorded outcome.</span></Link>
          <FooterIndex />
        </div>
        <p className="ld-foot-base"><span>© {new Date().getFullYear()} StrayPaw</span><span>Folk art: Gond paintings by Bhaiyaji Smile 123 (CC BY-SA 4.0, adapted) and museum works. <Link href="/art-credits">Art credits</Link></span></p>
      </footer>
    </div>
  );
}
