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
import { getSupabaseAdmin } from "@/lib/supabase";
import { sxSerif } from "@/components/shell/fonts";
import { IndiaStrings, type HomeCity, type HomeFace } from "@/components/home/IndiaStrings";
import { LivingMap, type CityFacts } from "@/components/home/LivingMap";
import { CareFlow, CARE_STEPS } from "@/components/home/CareFlow";
import { Scene } from "@/components/home/Scene";
import { WorkDemo } from "@/components/home/WorkDemo";
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

/* Community reports sent through StrayPaw in the last 90 days: one server-side aggregate count,
   never a row. Null when it cannot be read, and the figure is then left out. */
const recentReports = unstable_cache(async (): Promise<number | null> => {
  const supa = getSupabaseAdmin(); if (!supa) return null;
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { count, error } = await supa.from("sightings").select("id", { count: "exact", head: true }).gte("created_at", since);
  return error ? null : count ?? null;
}, ["landing-recent-reports-v1"], { revalidate: 3600 });

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
  const SIGHTINGS_90D = await recentReports().catch(() => null);
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
    <div className={`sp field-site product-site ld home3 ${sxSerif.variable}`}>
      <PageView name="landing_view" />
      <Motion />
      <SiteHeader tone="night" />
      <main>
        {/* A. The company, the product and the country in one opening frame. The workspace is
               visible from the first second; as the reader scrolls, India's strings and animals
               converge into it and the night opens into the app's cream. */}
        <Scene className="s-hero" screens={2.3} label="StrayPaw">
          <div className="hx-copy">
            <p className="hx-eyebrow">StrayPaw · for rescue organisations and cities in India</p>
            <h1 id="h-title">The operating system for <em>street-animal welfare.</em></h1>
            <p className="h-lede">Report an animal on WhatsApp. Run the rescue as a case. Keep its care history for good. See the whole city. One connected system.</p>
            <div className="h-acts">
              <Link href="/partner-apply" className="h-btn is-flame is-lg" data-mag>Get StrayPaw for your NGO <ArrowUpRight size={18} aria-hidden /></Link>
              <Link href="/explore" className="h-btn is-ghost is-lg" data-mag>Explore the live map</Link>
            </div>
          </div>
          <div className="hx-world" data-tilt="8"><IndiaStrings cities={cities} faces={faces} tone="night" max={6} className="hx-map" /></div>
          <div className="hx-app">
            <p className="hx-app-k">Every report becomes work someone owns.</p>
            {story && (
              <div className="h-app" aria-label={`Open requests on the public record in ${story.hero.city}`}>
                <div className="h-app-bar"><b>StrayPaw</b><span>NGO</span><nav><i aria-current="page">Work</i><i>Animals</i><i>Map</i></nav><em className="h-app-live">Live record · {story.hero.city}</em></div>
                <div className="h-app-body">
                  <div className="h-app-day"><b>Today&rsquo;s work</b><span>{fmt(story.desk.live)} open · {fmt(story.desk.critical)} critical</span></div>
                  <ol>{story.desk.queue.slice(0, 4).map((q, i) => (
                    <li key={i} className={q.critical ? "is-crit" : ""} style={{ ["--i" as string]: i }}><b>{q.condition}</b><span>{q.locality}</span><em>{q.days === 0 ? "today" : `${q.days}d waiting`}</em></li>
                  ))}</ol>
                  <p className="h-app-note">Real open requests on {story.hero.city}&rsquo;s public record. No organisation is named.</p>
                </div>
              </div>
            )}
          </div>
        </Scene>

        {/* B. The product: one continuous system, played by scrolling. */}
        <Scene className="s-wa" screens={4} steps={CARE_STEPS} label="One continuous system">
          <Folk k="bird" className="h-folk-wa" w={120} par={0.05} flip />
          <header className="sx-head"><p className="h-k">The product</p><h2>Message → case → care → <em>history</em> → city.</h2></header>
          <CareFlow />
        </Scene>

        {/* B2. The same record, three readers (preserved relay). */}
        {story?.relay && (
          <section className="h-sec h-relay" aria-labelledby="h-relay">
            <Folk k="cowCalf" className="h-folk-relay" w={160} par={0.07} />
            <header className="h-head" data-rv="up">
              <h2 id="h-relay">One request. <em>Three views.</em></h2>
              <p>The resident who sent it, the team that works it, the city that plans around it.</p>
            </header>
            <div data-rv="tilt"><Relay city={story.hero.city} desk={story.desk} report={story.relay} /></div>
          </section>
        )}

        {/* C. The living atlas: India → city → locality → animal, on the live record. */}
        <Scene className="s-map" screens={1.7} label="The living atlas">
          <Folk k="peacocks" className="h-folk-map" w={170} par={0.05} />
          <header className="sx-head"><p className="h-k">The living atlas</p><h2>India, city by city, <em>animal by animal.</em></h2></header>
          <div className="sx-map"><LivingMap cities={cities} faces={faces} facts={facts} sample={sample} plate={null} /></div>
        </Scene>

        {/* D. The individuals behind the records. */}
        <section className="h-sec h-lives" aria-labelledby="h-lives">
          <Folk k="dogSitting" className="h-folk-lives" w={140} par={0.09} />
          <header className="h-head" data-rv="up"><h2 id="h-lives">Every animal keeps <em>its own history.</em></h2><p>A permanent record means the next person to help knows what already happened.</p></header>
          <div data-rv="right"><AnimalRegister data={register} total={story?.totals.animals ?? register.total} plate={null} /></div>
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

        {/* E. What each organisation gets, travelling sideways. NGOs first. */}
        <Scene className="s-rail" screens={3.2} label="What organisations get">
          <header className="sx-head is-left"><p className="h-k">What you get</p><h2>Built for the people <em>doing the work.</em></h2></header>
          <div className="rail">
            <article className="rail-card is-ngo" style={{ ["--i" as string]: 0 }} data-tilt="4">
              <header className="rail-h"><b>NGOs</b><span>Intake, triage, assignment, treatment, follow-ups, reporting.</span><Link href="/partner-apply">Get StrayPaw →</Link></header>
              <WorkDemo start="Work" />
            </article>
            <article className="rail-card is-muni" style={{ ["--i" as string]: 1 }} data-tilt="4">
              <header className="rail-h"><b>Municipalities</b><span>Geographic registers, ABC and ARV evidence, patterns by area.</span><Link href="/for-governments">For cities →</Link></header>
              {city && (
                <figure className="h-city-fig">
                  <figcaption><b>{city.city}</b> · sterilisation as recorded · {fmt(city.animals)} animals</figcaption>
                  <div className="h-bar" role="img" aria-label={`${ster}% recorded sterilised, ${unk}% not recorded, the rest recorded not sterilised`}>
                    <i className="is-yes" style={{ width: `${ster}%` }} /><i className="is-no" style={{ width: `${Math.max(0, 100 - ster - unk)}%` }} /><i className="is-unk" style={{ width: `${unk}%` }} />
                  </div>
                  <ul className="h-bar-key"><li><i className="is-yes" />Sterilised {ster}%</li><li><i className="is-no" />Recorded not</li><li><i className="is-unk" />Not recorded {unk}%</li></ul>
                  <p className="h-fine">Recorded activity, not population coverage. Unknown is never counted as no.</p>
                  <Link className="h-btn is-quiet" href={`/city?city=${encodeURIComponent(city.city)}`}>Open {city.city} as a city <ArrowUpRight size={15} aria-hidden /></Link>
                </figure>
              )}
            </article>
            <article className="rail-card is-comm" style={{ ["--i" as string]: 2 }} data-tilt="4">
              <header className="rail-h"><b>Communities</b><span>Report an animal, follow what happens, add a sighting.</span><Link href="/community/report">Report now →</Link></header>
              <ol className="rail-steps"><li><b>01</b>A photo, if it is safe</li><li><b>02</b>Where, as an area</li><li><b>03</b>What you saw</li><li><b>04</b>Received, and followed on your phone</li></ol>
              {SIGHTINGS_90D !== null && <p className="h-fine">{fmt(SIGHTINGS_90D)} community reports through StrayPaw in the last 90 days.</p>}
            </article>
            <article className="rail-card is-fund" style={{ ["--i" as string]: 3 }} data-tilt="4">
              <header className="rail-h"><b>Funders and partners</b><span>Traceable records, documented activity, evidence you can check.</span><Link href="/for-funders">For funders →</Link></header>
              <ul className="rail-files"><li><b>Evidence workbook</b><span>Every case, animal and care event, with source</span></li><li><b>Government submission</b><span>Cases and care by area, with method</span></li><li><b>Report to print</b><span>Headline figures and limits, for a board</span></li></ul>
            </article>
          </div>
        </Scene>

        {/* F. Proof, with what each number is and is not. */}
        {story && (
          <section className="h-sec h-proof" aria-labelledby="h-proof">
            <header className="h-head" data-rv="up"><p className="h-k">On the record today</p><h2 id="h-proof">Real records. <em>Honest numbers.</em></h2></header>
            <dl className="pf" data-rv="up">
              <div><dt>Animal records</dt><dd>{fmt(story.totals.animals)}</dd><small>Mostly historical registers organisations imported</small></div>
              <div><dt>Cities</dt><dd>{fmt(story.totals.cities)}</dd><small>Precision varies: street areas to city level</small></div>
              <div><dt>Requests for help</dt><dd>{fmt(story.totals.cases)}</dd><small>Cases on the record, open and closed</small></div>
              {SIGHTINGS_90D !== null && <div><dt>Community reports</dt><dd>{fmt(SIGHTINGS_90D)}</dd><small>Sent through StrayPaw in the last 90 days</small></div>}
            </dl>
            <p className="h-partner" data-rv="up">Field partner: <b>The Pawsome People Project</b>, Coimbatore, runs its rescue cases in StrayPaw. <Link href="/community/organisations">Every organisation on the record</Link></p>
          </section>
        )}

        {/* G. The vision, earned by what came before. */}
        <section className="h-vision" aria-labelledby="h-vision">
          <Folk k="elephantTree" className="h-folk-vision" w={210} par={0.06} />
          <div className="vz" data-rv="up">
            <p className="h-k">Where this goes</p>
            <h2 id="h-vision">Today, StrayPaw helps organisations coordinate care. <em>Over time, connected records become a city&rsquo;s memory.</em></h2>
            <ol className="vz-steps">
              <li><b>Now</b>Reports, cases and care in one workspace for every rescue team.</li>
              <li><b>Next</b>Shared records across organisations, so no animal starts again from zero.</li>
              <li><b>Then</b>Geographic intelligence cities can plan with, and funders can trust.</li>
            </ol>
          </div>
        </section>

        {/* H. The invitation. */}
        <section className="h-close" aria-labelledby="h-close">
          <Folk k="tiger" className="h-folk-close" w={160} par={0.05} />
          <h2 id="h-close" data-rv="up">Run your rescue work <em>on StrayPaw.</em></h2>
          <p data-rv="up">Bring your spreadsheets. StrayPaw imports them into one record.</p>
          <div className="h-acts is-center" data-rv="up">
            <Link href="/partner-apply" className="h-btn is-flame is-lg" data-mag>Get StrayPaw for your NGO <ArrowUpRight size={18} aria-hidden /></Link>
            <Link href="/explore" className="h-btn is-quiet is-lg" data-mag>Explore the live map</Link>
          </div>
          <p className="h-close-alt">Municipality or partner? <Link href="/for-governments">For cities</Link> · <Link href="/for-funders">For funders</Link> · <Link href="/contact">Talk to us</Link></p>
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
