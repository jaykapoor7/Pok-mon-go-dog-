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
import { dogArtFor, WORKS } from "@/lib/art/sources";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sxSerif } from "@/components/shell/fonts";
import { IndiaStrings, type HomeCity, type HomeFace } from "@/components/home/IndiaStrings";
import { CareFlow, CARE_STEPS } from "@/components/home/CareFlow";
import { LivingMap, type CityFacts } from "@/components/home/LivingMap";
import { Scene } from "@/components/home/Scene";
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
  const [story, register, rawCities, rawFaces, national] = await Promise.all([
    getLandingStory().catch(() => null),
    getAnimalRegister().catch(() => ({ total: 0, cards: [] as RegisterFocus[] })),
    getMapCities().catch(() => []),
    getFaces().catch(() => []),
    getNationalCells().catch(() => null),
  ]);
  /* Every recorded area in India, slimmed to [lng, lat, animals]: the hero's sky of real records. */
  const sky = (national?.cells ?? []).map(([lng, lat, n]) => [lng, lat, n] as [number, number, number]);
  const cities: HomeCity[] = rawCities.filter((c) => c.lng != null && c.lat != null && c.animals > 0)
    .map((c) => ({ city: c.city, lng: c.lng!, lat: c.lat!, animals: c.animals, hollow: kindOf(c.city, c.cells) === "clinical" }));
  const faces: HomeFace[] = rawFaces.map((f) => ({ id: f.id, title: f.title, describe: f.describe, photo: f.photo, city: f.city, lng: f.c[0], lat: f.c[1] }));
  const facts: CityFacts[] = [...rawCities].sort((a, b) => b.animals - a.animals)
    .map((c) => ({ city: c.city, state: c.state, animals: c.animals, cells: c.cells, sterilised: c.sterilised, ster_unknown: c.ster_unknown, cases: c.cases, care: c.care, hollow: kindOf(c.city, c.cells) === "clinical" }));
  const sample = story?.hero.city ?? null;
  const reports = await recentReports().catch(() => null);
  const life = await pickLife([...RICH, ...rawFaces.map((f) => f.id), story?.relay?.animalId ?? ""].filter(Boolean).slice(0, 8));
  /* The register's real photographed animals, for the sideways reel. */
  const reel = register.cards.filter((c) => c.cover_photo).slice(0, 7);
  const n = reel.length + (life ? 1 : 0);
  const words = ["The", "operating", "system", "for", "street-animal", "welfare."];

  return (
    <div className={`sp field-site product-site ld home3 home4 ${sxSerif.variable}`}>
      <PageView name="landing_view" />
      <Motion />
      <SiteHeader tone="night" />
      <main>
        {/* 1 · The statement, then the dive: the words tear apart sideways, the camera falls
               into India down to one city, and that city opens into the working app. */}
        <Scene className="s-hero s-dive" screens={2.2} label="StrayPaw">
          <div className="hx-copy">
            <p className="hx-eyebrow">StrayPaw</p>
            <h1 id="h-title" aria-label="The operating system for street-animal welfare.">
              {words.map((w, i) => <span key={i} className="w" style={{ ["--w" as string]: i, ["--side" as string]: i % 2 ? 1 : -1 }} aria-hidden><span>{i >= 4 ? <em>{w}</em> : w}</span></span>)}
            </h1>
            <p className="h-lede">Report on WhatsApp. Run the rescue as a case. Keep every animal&rsquo;s history. See the whole city.</p>
            <div className="h-acts">
              <Link href="/partner-apply" className="h-btn is-flame is-lg" data-mag>Get StrayPaw for your NGO <ArrowUpRight size={18} aria-hidden /></Link>
              <Link href="/explore" className="h-btn is-ghost is-lg" data-mag>Explore the live map</Link>
            </div>
          </div>
          <div className="hx-world" data-tilt="8"><IndiaStrings cities={cities} faces={faces} tone="night" max={6} className="hx-map" sky={sky} /></div>
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

        {/* 2 · One record, played by scrolling: message → case → care → history → city. */}
        <Scene className="s-wa" screens={4} steps={CARE_STEPS} label="One continuous system">
          <Folk k="bird" className="h-folk-wa" w={120} par={0.05} flip />
          <header className="sx-head"><h2>One message. <em>One record, for good.</em></h2></header>
          <CareFlow />
        </Scene>

        {/* 3 · The animals: real register animals travel sideways in depth; the reel ends on one real history. */}
        {n > 0 && (
          <Scene className="s-reel" screens={2.8} label="The animals on the record">
            <header className="sx-head is-left"><p className="h-k">{fmt(story?.totals.animals ?? register.total)} animals on the record</p><h2>Every animal keeps <em>its own history.</em></h2></header>
            <div className="reel" style={{ ["--n" as string]: n }}>
              {reel.map((c, i) => (
                <Link key={c.id} href={`/animal/${c.id}`} className="reel-card" style={{ ["--i" as string]: i }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.cover_photo} alt={`${c.name ?? c.straypaw_id ?? "An animal"}, as photographed`} loading="lazy" referrerPolicy="no-referrer" />
                  <span className="reel-id"><b>{c.name ?? c.straypaw_id}</b><small>{[c.zone, c.city].filter(Boolean).join(", ")}</small><small className="mono">{c.straypaw_id}{c.first_seen ? ` · since ${day(c.first_seen).slice(-8)}` : ""}</small></span>
                </Link>
              ))}
              {life && (() => {
                const art = dogArtFor(life.id, life.size);
                const photo = life.photo && !life.photoSensitive ? life.photo : null;
                return (
                  <article className="reel-card is-life" style={{ ["--i" as string]: reel.length }}>
                    <div className="reel-life-id">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo ?? art.src} alt={photo ? `${life.label}, as photographed` : ""} className={photo ? "" : "is-art"} style={photo ? undefined : { background: art.ground }} />
                      <div><b>{life.label}</b><small>{[life.locality, life.city].filter(Boolean).join(", ")}</small>{!photo && <small>No photograph. Illustration, not this animal: {WORKS[art.work].title}.</small>}</div>
                    </div>
                    <ol className="h-life-line">{life.events.slice(-6).map((e) => <li key={e.id} className={`is-${e.lane === "case" ? "case" : e.lane === "care" ? "care" : "seen"}`}><time>{day(e.date)}</time><span>{e.title}</span></li>)}</ol>
                    <Link className="h-btn is-quiet" href={`/animal/${life.id}`}>The full record <ArrowUpRight size={15} aria-hidden /></Link>
                  </article>
                );
              })()}
            </div>
          </Scene>
        )}

        {/* 4 · The atlas tips up off the table: India → city → locality → animal, live. */}
        <Scene className="s-map" screens={1.7} label="The living atlas">
          <Folk k="peacocks" className="h-folk-map" w={170} par={0.05} />
          <header className="sx-head"><h2>India, city by city, <em>animal by animal.</em></h2></header>
          <div className="sx-map"><LivingMap cities={cities} faces={faces} facts={facts} sample={sample} plate={null} sky={sky} /></div>
        </Scene>

        {/* 5 · What is real today, and the invitation. */}
        <section className="h-end" aria-labelledby="h-close">
          <Folk k="elephantTree" className="h-folk-end" w={200} par={0.06} />
          {story && (
            <dl className="pf" data-rv="up">
              <div><dt>Animal records</dt><dd>{fmt(story.totals.animals)}</dd><small>Mostly historical registers organisations imported</small></div>
              <div><dt>Cities</dt><dd>{fmt(story.totals.cities)}</dd><small>From street areas to city level</small></div>
              <div><dt>Requests for help</dt><dd>{fmt(story.totals.cases)}</dd><small>On the record, open and closed</small></div>
              {reports !== null && <div><dt>Community reports</dt><dd>{fmt(reports)}</dd><small>Through StrayPaw, last 90 days</small></div>}
            </dl>
          )}
          <h2 id="h-close" data-rv="up">Today, rescue teams coordinate care on StrayPaw. <em>Tomorrow, a city remembers every animal.</em></h2>
          <div className="h-acts is-center" data-rv="up">
            <Link href="/partner-apply" className="h-btn is-flame is-lg" data-mag>Get StrayPaw for your NGO <ArrowUpRight size={18} aria-hidden /></Link>
            <Link href="/explore" className="h-btn is-ghost is-lg" data-mag>Explore the live map</Link>
          </div>
          <p className="h-close-alt">Field partner: The Pawsome People Project, Coimbatore · <Link href="/for-governments">For cities</Link> · <Link href="/for-funders">For funders</Link> · <Link href="/contact">Talk to us</Link></p>
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
