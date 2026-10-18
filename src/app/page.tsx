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
import type { HomeCity, HomeFace } from "@/components/home/IndiaStrings";
import { CareFlow, CARE_STEPS } from "@/components/home/CareFlow";
import { Scene } from "@/components/home/Scene";
import { Motion } from "@/components/home/Motion";
import { Scraps, type Scrap } from "@/components/kantha/Scraps";
import { Stitch } from "@/components/kantha/Stitch";
import { Quilt, type Patch } from "@/components/kantha/Quilt";
import { Patchwork, type Way } from "@/components/kantha/Patchwork";
import { AtlasPull } from "@/components/kantha/AtlasPull";
import "@/components/site/site.css";
import "@/components/site/field-site.css";
import "@/components/landing/landing.css";
import "@/components/home/home.css";
import "@/components/kantha/kantha.css";

export const revalidate = 300;
export const metadata = {
  title: "StrayPaw. Connected software for street-animal rescue in India.",
  description: "StrayPaw connects community reporting, NGO case management and municipal evidence in one shared system, from the first report to the recorded outcome.",
};

/* ════════════════════════════════════════════════════════════════════
   The landing as a kantha: the quilt Bengal and Odisha stitch from old
   cloth, scrap by scrap, with one running stitch. A single flame thread
   runs through every act. It gathers the scattered ways rescue work
   arrives (I), sews a message into a record (II), pieces real animals
   into one cloth and opens one of them (III), shows the four ways into
   the same cloth (IV), pulls back from a street to India (V), and ties
   off in a knot at the invitation (VI).
   Every figure, place, photograph and queue row comes from the live
   record. The message texts and the WhatsApp conversation are examples,
   and say so.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");

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
  /* Every recorded area in India, slimmed to [lng, lat, animals]: the atlas's sky of real records. */
  const sky = (national?.cells ?? []).map(([lng, lat, n]) => [lng, lat, n] as [number, number, number]);
  const cities: HomeCity[] = rawCities.filter((c) => c.lng != null && c.lat != null && c.animals > 0)
    .map((c) => ({ city: c.city, lng: c.lng!, lat: c.lat!, animals: c.animals, hollow: kindOf(c.city, c.cells) === "clinical" }));
  const faces: HomeFace[] = rawFaces.map((f) => ({ id: f.id, title: f.title, describe: f.describe, photo: f.photo, city: f.city, lng: f.c[0], lat: f.c[1] }));
  const sample = story?.hero.city ?? null;
  const focusCity = rawCities.find((c) => c.city === sample) ?? null;
  const reports = await recentReports().catch(() => null);
  const life = await pickLife([...RICH, ...rawFaces.map((f) => f.id), story?.relay?.animalId ?? ""].filter(Boolean).slice(0, 8));
  const totals = story?.totals ?? null;

  /* The quilt: the register's photographed animals, then the Map's, never the one we open. */
  const seen = new Set<string>(life ? [life.id] : []);
  const patches: Patch[] = [
    ...register.cards.filter((c) => c.cover_photo).map((c) => ({ id: c.id, name: c.name ?? c.straypaw_id ?? "On the record", place: [c.zone, c.city].filter(Boolean).join(", "), photo: c.cover_photo })),
    ...faces.map((f) => ({ id: f.id, name: f.title, place: f.city, photo: f.photo })),
  ].filter((p) => !seen.has(p.id) && seen.add(p.id)).slice(0, 8);

  /* The scraps: how rescue work arrives today. Photographs and places are real public records;
     the message texts are examples of what arrives. */
  const places = [...new Set((story?.desk.queue ?? []).map((q) => q.locality).filter(Boolean))];
  const photos = patches.slice(0, 3);
  const scraps: Scrap[] = [
    { k: "msg", t: "Dog near the bus stand, back leg bleeding. Anyone?" },
    photos[0] ? { k: "photo", src: photos[0].photo, id: photos[0].name } : { k: "call", t: "Missed call · 3" },
    { k: "pin", t: places[0] ?? "Shared location" },
    { k: "voice", t: "Voice note · 0:42" },
    { k: "sheet", t: "rescues_FINAL_v3.xlsx" },
    { k: "msg", t: "Who took the brown dog to the vet yesterday?" },
    photos[1] ? { k: "photo", src: photos[1].photo, id: photos[1].name } : { k: "pin", t: places[3] ?? "Shared location" },
    { k: "call", t: "Missed call · 3" },
    { k: "pin", t: places[1] ?? "Shared location" },
    { k: "msg", t: "Was she vaccinated? Can't find it in the group." },
    photos[2] ? { k: "photo", src: photos[2].photo, id: photos[2].name } : { k: "voice", t: "Voice note · 1:15" },
    { k: "pin", t: places[2] ?? "Shared location" },
  ];
  const words = ["The", "operating", "system", "for", "street-animal", "welfare."];

  const ways: Way[] = [
    { key: "community", who: "Residents", title: "Report what you see", art: "bird", href: "/community", cta: "Open the community map",
      body: "Send a photo and a place on WhatsApp or in the app. See the animals around you, and what happened next.",
      show: reports !== null ? <p className="kp-fig"><b>{fmt(reports)}</b><span>community reports through StrayPaw in the last 90 days</span></p> : <p className="kp-fig"><span>Reports land in one shared record, never in a lost chat.</span></p> },
    { key: "ngo", who: "Rescue teams", title: "Run every rescue as a case", art: "elephant", href: "/for-ngos", cta: "StrayPaw for NGOs",
      body: "One queue for every report, an owner for every case, and care recorded on the animal for whoever helps it next.",
      show: story ? <ol className="kp-queue" aria-label={`Open requests on the public record in ${story.hero.city}`}>{story.desk.queue.slice(0, 3).map((q, i) => <li key={i} className={q.critical ? "is-crit" : ""}><b>{q.condition}</b><span>{q.locality}</span><em>{q.days === 0 ? "today" : `${q.days}d`}</em></li>)}</ol> : null },
    { key: "city", who: "Municipalities", title: "See the whole city", art: "peacocks", href: "/for-governments", cta: "StrayPaw for cities",
      body: "Sterilisation, requests and care by area, with the limits of the evidence written beside every figure.",
      show: focusCity ? <dl className="kp-figs"><div><dt>Animals on the record</dt><dd>{fmt(focusCity.animals)}</dd></div><div><dt>Requests for help</dt><dd>{fmt(focusCity.cases)}</dd></div><div><dt>Recorded sterilised</dt><dd>{fmt(focusCity.sterilised)}</dd></div><small>{focusCity.city}, live from the record</small></dl> : null },
    { key: "fund", who: "Funders and partners", title: "Fund outcomes you can check", art: "tiger", href: "/for-funders", cta: "StrayPaw for funders",
      body: "Every case keeps its record from the first report to the outcome, so support can follow the work, not the claims.",
      show: totals ? <p className="kp-fig"><b>{fmt(totals.cases)}</b><span>requests for help on the record, open and closed</span></p> : null },
  ];

  return (
    <div className={`sp field-site product-site ld home3 kantha ${sxSerif.variable}`}>
      <PageView name="landing_view" />
      <Motion />
      <SiteHeader tone="paper" />
      <main>
        {/* I · The scraps. Scattered ways rescue work arrives drift around the real workspace;
               the thread sews round them and draws every one into the app. */}
        <Scene className="k-open" screens={2.6} label="StrayPaw">
          <div className="ko-copy">
            <p className="ko-k">StrayPaw</p>
            <h1 aria-label="The operating system for street-animal welfare.">
              {words.map((w, i) => <span key={i} className="w" style={{ ["--w" as string]: i }} aria-hidden><span>{i >= 4 ? <em>{w}</em> : w}</span></span>)}
            </h1>
            <p className="ko-lede">Rescue runs on scattered messages. StrayPaw sews them into one record: a case for every report, a history for every animal, a view of the whole city.</p>
            <div className="h-acts">
              <Link href="/partner-apply" className="h-btn is-flame is-lg" data-mag>Get StrayPaw for your NGO <ArrowUpRight size={18} aria-hidden /></Link>
              <Link href="/explore" className="h-btn is-lg" data-mag>Explore the live map</Link>
            </div>
          </div>
          <Scraps scraps={scraps}>
            {story && (
              <div className="h-app ko-app" aria-label={`Open requests on the public record in ${story.hero.city}`}>
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
          </Scraps>
          <p className="ko-gather" aria-hidden>Every scrap, one record.</p>
          <p className="ko-fine">Messages shown are examples. Photographs and places are from the public record.</p>
        </Scene>

        {/* II · The stitch. A message is sewn, field by field, into a case record. */}
        <Scene className="s-wa k-stitch" screens={4} steps={CARE_STEPS} label="One message, one record">
          <header className="sx-head"><p className="h-k">WhatsApp, sewn into the record</p><h2>One message. <em>One record, for good.</em></h2></header>
          <div className="k-stitch-cf"><CareFlow /><Stitch /></div>
        </Scene>

        {/* III · The quilt. Real animals pieced into one cloth; we fall into one, and it opens into its history. */}
        {(patches.length > 0 || life) && (
          <Scene className="k-quilt" screens={3} steps={3} label="The animals on the record">
            <header className="kq-head"><p className="h-k">{fmt(totals?.animals ?? register.total)} animals on the record</p><h2>Every animal keeps <em>its own history.</em></h2></header>
            <Quilt patches={patches} life={life} />
          </Scene>
        )}

        {/* IV · One cloth, four ways in. */}
        <section className="k-ways" aria-labelledby="k-ways-t">
          <header className="kw-head" data-rv="up"><p className="h-k">One record underneath</p><h2 id="k-ways-t">One cloth. <em>Four ways in.</em></h2></header>
          <div data-rv="up"><Patchwork ways={ways} /></div>
        </section>

        {/* V · The atlas, pulled back: one locality, the city, then India. */}
        <Scene className="k-atlas" screens={2.6} label="The living map">
          <AtlasPull cities={cities} faces={faces} sky={sky} focus={focusCity && focusCity.lng != null && focusCity.lat != null ? { lng: focusCity.lng, lat: focusCity.lat } : null} />
          <div className="ka-caps" aria-hidden>
            <p className="ka-cap is-1"><b>{places[0] ?? "One locality"}.</b><span>One locality in {sample ?? "a city"}, on the record.</span></p>
            <p className="ka-cap is-2"><b>{sample ?? "A city"}.</b><span>{focusCity ? `${fmt(focusCity.animals)} animals on the record, area by area.` : "Area by area."}</span></p>
            <p className="ka-cap is-3"><b>India.</b><span>{totals ? `${fmt(totals.cities)} cities, ${fmt(totals.animals)} animal records. Every point of light is a recorded area.` : "Every point of light is a recorded area."}</span></p>
          </div>
          <h2 className="sr-only">The living map: from one locality to India</h2>
          <div className="ka-act"><Link className="h-btn is-flame is-lg" href="/explore" data-mag>Explore the live map <ArrowUpRight size={18} aria-hidden /></Link></div>
        </Scene>

        {/* VI · The vision, stitched with what is real today, tied off in a knot at the invitation. */}
        <section className="k-end" aria-labelledby="k-close">
          {totals && (
            <dl className="ke-pf" data-rv="up">
              <div><dt>Animal records</dt><dd>{fmt(totals.animals)}</dd><small>Mostly historical registers organisations imported</small></div>
              <div><dt>Cities</dt><dd>{fmt(totals.cities)}</dd><small>From street areas to city level</small></div>
              <div><dt>Requests for help</dt><dd>{fmt(totals.cases)}</dd><small>On the record, open and closed</small></div>
              {reports !== null && <div><dt>Community reports</dt><dd>{fmt(reports)}</dd><small>Through StrayPaw, last 90 days</small></div>}
            </dl>
          )}
          <h2 id="k-close" data-rv="up">Today, rescue teams coordinate care on StrayPaw. <em>Tomorrow, a city remembers every animal.</em></h2>
          <div className="h-acts is-center ke-acts" data-rv="up">
            <i className="ke-knot" aria-hidden />
            <Link href="/partner-apply" className="h-btn is-flame is-lg" data-mag>Get StrayPaw for your NGO <ArrowUpRight size={18} aria-hidden /></Link>
            <Link href="/explore" className="h-btn is-lg" data-mag>Explore the live map</Link>
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
