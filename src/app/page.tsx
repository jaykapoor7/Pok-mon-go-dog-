import Link from "next/link";
import { unstable_cache } from "next/cache";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getAnimalRegister, getLandingStory, type RegisterFocus } from "@/lib/landing/story";
import { getMapCities, getNationalCells } from "@/lib/livingmap/server";
import { getListedOrganisations, getOperationalPartners } from "@/lib/partners";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sxSerif } from "@/components/shell/fonts";
import { Stage } from "@/components/bindu/stage";
import { ToneWatch } from "@/components/bindu/Tone";
import type { Cell } from "@/components/bindu/mapkit";
import { VectorIndia } from "@/components/world/VectorIndia";
import { Resolve } from "@/components/world/Resolve";
import { World, type WorldArea } from "@/components/world/World";
import { Chain, type Area } from "@/components/request/Chain";
import { Commons, type Loc } from "@/components/ecosystem/Commons";
import { Lifeline, type Life } from "@/components/company/Lifeline";
import { Origin, type City } from "@/components/company/Origin";
import "@/components/site/site.css";
import "@/components/world/home.css";
import "@/components/world/world.css";
import "@/components/request/chain.css";
import "@/components/ecosystem/commons.css";
import "@/components/company/company4.css";
import "@/components/company/origin.css";

export const revalidate = 300;
export const metadata = {
  title: "StrayPaw. The care infrastructure for India's street animals.",
  description: "StrayPaw connects WhatsApp reports, rescue cases, animal histories and city maps into one shared record for residents, NGOs and municipalities.",
};

/* ════════════════════════════════════════════════════════════════════
   The homepage, in four movements.

   01  The living world: a folk painting of one real neighbourhood that
       becomes the live atlas, and rises from the street to India.
   02  One request: press Send, and watch the system respond.
   03  One ecosystem: four places on one painted street, and the real
       software that unfolds out of each.
   04  The company: why, what continuity means, what is real today,
       what is still to build, and the invitation; the page closes on
       the painted India it opened with.

   Every figure, place, photograph and queue row is read live from the
   public record. The WhatsApp exchange, its case and its animal are an
   example and say so wherever they appear.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");
/* the neighbourhood the opening painting is made from (public/mural, baked by scripts/bake-mural.mjs) */
const PAINTED = "Ganapathy";

/* Community reports sent through StrayPaw in the last 90 days: one server-side count, never a row. */
const recentReports = unstable_cache(async (): Promise<number | null> => {
  const supa = getSupabaseAdmin(); if (!supa) return null;
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { count, error } = await supa.from("sightings").select("id", { count: "exact", head: true }).gte("created_at", since);
  return error ? null : count ?? null;
}, ["landing-recent-reports-v1"], { revalidate: 3600 });

const ringCentre = (ring: number[]): [number, number] => { let x = 0, y = 0; const n = ring.length / 2; for (let i = 0; i < ring.length; i += 2) { x += ring[i]; y += ring[i + 1]; } return [x / n, y / n]; };
const CARE: Record<string, string> = { sterilisation: "Sterilised", vaccination: "Vaccinated", treatment: "Treated", rescue: "Rescued", feeding: "Fed", deworming: "Dewormed", checkup: "Checked" };

export default async function HomePage() {
  const [story, register, rawCities, national, reports, partners, listed] = await Promise.all([
    getLandingStory().catch(() => null),
    getAnimalRegister().catch(() => ({ total: 0, cards: [] as RegisterFocus[] })),
    getMapCities().catch(() => []),
    getNationalCells().catch(() => null),
    recentReports().catch(() => null),
    getOperationalPartners().catch(() => []),
    getListedOrganisations().catch(() => ({ members: [], sources: [] })),
  ]);
  const cells: Cell[] = (national?.cells ?? []).map(([lng, lat, n]) => [lng, lat, n]);
  const totals = story?.totals ?? null;
  const sample = story?.hero.city ?? null;
  const sampleCity = rawCities.find((c) => c.city === sample) ?? null;
  const home: [number, number] | null = sampleCity?.lng != null && sampleCity?.lat != null ? [sampleCity.lng, sampleCity.lat] : null;

  /* the sample city's areas on the live record; the example is reported from the one with the most open requests */
  const areas: Area[] = (story?.desk.cells ?? []).map((c) => ({ ring: c.ring, open: c.open, crit: c.crit, name: c.name }));
  const focusArea = [...areas].sort((a, b) => b.open - a.open || b.crit - a.crit)[0] ?? null;
  const place = focusArea?.name || sample || "the city";
  const locs: Loc[] = (() => { const by = new Map<string, number>(); for (const a of areas) if (a.name) by.set(a.name, (by.get(a.name) ?? 0) + a.open); return [...by.entries()].map(([name, open]) => ({ name, open })).sort((a, b) => b.open - a.open); })();

  /* the painted place's neighbours on the record, each sized as the map sizes it */
  const topN = Math.sqrt(Math.max(1, ...cells.map((c) => c[2])));
  const worldAreas: WorldArea[] = areas.map((a) => {
    const c = ringCentre(a.ring); let best = 0, bd = 9;
    for (const [lng, lat, n] of cells) { const d = Math.abs(lng - c[0]) + Math.abs(lat - c[1]); if (d < bd) { bd = d; best = n; } }
    return { name: a.name, c, open: a.open, crit: a.crit, n: bd < 0.004 ? Math.sqrt(best) / topN : 0.15 };
  });

  /* animals on the record, each with the history the record holds */
  const lives: Life[] = register.cards.filter((c) => c.cover_photo).slice(0, 5).map((c) => ({
    id: c.id, tag: c.straypaw_id ?? c.name ?? "On the record", city: c.city, zone: c.zone, photo: c.cover_photo, first: c.first_seen, last: c.last_seen, sightings: c.sightings,
    events: [...c.care.map((k) => ({ at: k.at, what: CARE[k.kind] ?? k.kind })), ...c.requests.map((r) => ({ at: r.at, what: r.condition ? `Request: ${r.condition}` : "Request for help" }))].filter((e) => e.at).sort((a, b) => b.at.localeCompare(a.at)),
  }));
  const partner = partners[0] ?? null;
  const originCities: City[] = rawCities.filter((c) => c.lng != null && c.lat != null && c.animals > 0).map((c) => ({ city: c.city, c: [c.lng!, c.lat!], animals: c.animals }));
  const brief = sampleCity ? { city: sampleCity.city, animals: sampleCity.animals, cells: sampleCity.cells, sterilised: sampleCity.sterilised, ster_unknown: sampleCity.ster_unknown, cases: sampleCity.cases } : null;

  return (
    <div className={`sp sw ${sxSerif.variable}`}>
      <PageView name="landing_view" />
      <ToneWatch root=".sw" />
      <SiteHeader tone="paper" />
      <main>
        {/* 01 · The living world */}
        <Stage id="world" className="w1" screens={3} still={0} tone="day" label="StrayPaw">
          <World areas={worldAreas} cells={cells} city={`${PAINTED}, Coimbatore`} sampleAt={home} />
          <div className="w1-frame" aria-hidden />
          <div className="w1-card">
            <p className="w1-k">StrayPaw · India</p>
            <h1>The care infrastructure for India&rsquo;s street animals.</h1>
            <p className="w1-lede">StrayPaw connects WhatsApp reports, rescue cases, animal histories and city maps into one shared record, so residents, NGOs and municipalities act on the same information.</p>
            <div className="sw-acts">
              <Link href="/app?choose=1" className="sw-btn is-flame">Open App <ArrowUpRight size={17} aria-hidden /></Link>
              <Link href="/explore" className="sw-btn is-paper">Explore the map</Link>
            </div>
            {totals && (
              <>
                <dl className="w1-proof">
                  <div><dd>{fmt(totals.animals)}</dd><dt>animal records</dt></div>
                  <div><dd>{fmt(totals.cases)}</dd><dt>requests for help</dt></div>
                  <div><dd>{fmt(totals.cities)}</dd><dt>cities</dt></div>
                  <div><dd>{partner ? 1 : 0}</dd><dt>field partner</dt></div>
                </dl>
                <p className="w1-note">Live from the public record. Mostly historical registers organisations brought with them; a record is not a census.</p>
              </>
            )}
          </div>
          {story && (
            <aside className="w1-live" aria-label={`Live open requests in ${story.hero.city}`}>
              <p><i aria-hidden />Live · {story.hero.city}<span>{fmt(story.desk.live)} open</span></p>
              <ol>{story.desk.queue.slice(0, 3).map((q, i) => <li key={i} className={q.critical ? "is-crit" : ""}><b>{q.condition}</b><span>{q.locality}</span></li>)}</ol>
            </aside>
          )}
          <div className="w1-caps" aria-hidden>
            <p>Painted on the real streets of <b>{PAINTED}, Coimbatore</b>.</p>
            <p>Each animal stands where an area is <b>on the record</b>.</p>
            {sampleCity && <p>{sampleCity.city}: <b>{fmt(sampleCity.animals)} animal records</b> in {fmt(sampleCity.cells)} mapped areas.</p>}
            {totals && <p>India: <b>{fmt(totals.animals)} records</b> across {fmt(totals.cities)} cities.</p>}
          </div>
        </Stage>

        {/* 02 · One request */}
        <Stage id="why" className="w2" screens={3.8} still={1} tone="day" label="One request, the whole system">
          <Chain areas={areas} city={sample ?? "The city"} />
        </Stage>

        {/* 03 · One ecosystem */}
        <Stage id="how" className="w3" screens={3.4} steps={4} still={0.62} tone="day" label="One ecosystem, four ways in">
          <Commons place={place} queue={story?.desk.queue ?? []} locs={locs} brief={brief} />
        </Stage>

        {/* 04 · The company */}
        <section id="company" className="w4" data-tone="day" aria-labelledby="w4-why">
          <div className="w4-why">
            <p className="sw-k">Why StrayPaw exists</p>
            <h2 id="w4-why">India&rsquo;s street animals are cared for by thousands of people. <em>Almost none of it is written down in one place.</em></h2>
            <p className="w4-intro">A resident sees an injured dog and posts in a group. A rescuer picks it up. A vet treats it. A feeder sees it again a month later. Each of them keeps a piece of the story, in a chat, a sheet or a notebook, and the next person starts from nothing.</p>
          </div>

          <div className="w4-founder" id="origin">
            <div className="fd">
              <div className="fd-art">
                <Origin cells={cells} cities={originCities} records={totals?.animals ?? 0} cityCount={totals?.cities ?? 0} />
              </div>
              <div className="fd-text">
                <p className="sw-k">How StrayPaw began</p>
                <h3>The problem was never a lack of people who cared. <em>It was a lack of connected infrastructure.</em></h3>
                <p className="fd-first">StrayPaw started with a simple observation by Jay Kapoor, its founder: India has people doing extraordinary work for street animals, but the information they depend on is scattered. A dog might be reported in one WhatsApp group, treated by a volunteer and recorded in a spreadsheet somewhere else, and its story disappears between them.</p>
                <p>What began as a small community reporting tool, with roughly 50 dogs reported, now connects {totals ? `${fmt(totals.animals)} animal records across ${fmt(totals.cities)} cities` : "animal records across India"} with rescue workflows, care histories and geographic intelligence.</p>
                <div className="fd-by"><span className="fd-mono" aria-hidden>JK</span><div><b>Jay Kapoor</b><span>Founder, StrayPaw · Student, University of Pittsburgh</span></div></div>
                <Link href="/our-story#origin" className="fd-more">Read the full story <ArrowUpRight size={15} aria-hidden /></Link>
              </div>
            </div>
          </div>

          {lives.length > 0 && (
            <div className="w4-life">
              <header>
                <p className="sw-k">Why continuity matters</p>
                <h3>One animal. <em>One history, kept.</em></h3>
                <p>Care only adds up when it is remembered. Each animal on StrayPaw keeps one identity across every team that meets it, so a sterilisation in March is known to the rescuer in August.</p>
              </header>
              <Lifeline lives={lives} />
            </div>
          )}

          <div className="w4-mv">
            <div><p className="sw-k">Mission</p><h3>Make street-animal care more coordinated, accountable and informed, through technology anyone can use.</h3></div>
            <div><p className="sw-k">Vision</p><h3>The shared information and coordination infrastructure connecting animals, communities, care organisations and cities.</h3></div>
          </div>

          <div className="w4-real">
            <header><p className="sw-k">What is real today</p><h3>Built, running, <em>and on the record.</em></h3></header>
            <div className="w4-map"><VectorIndia cells={cells} className="w4-vi" /><p>{fmt(cells.length)} mapped areas{totals ? ` in ${fmt(totals.cities)} cities` : ""}</p></div>
            <dl className="w4-nums">
              {totals && <div><dd>{fmt(totals.animals)}</dd><dt>Animal records</dt><small>Mostly historical registers organisations brought with them. A record is not a census.</small></div>}
              {totals && <div><dd>{fmt(totals.cases)}</dd><dt>Requests for help</dt><small>On the record, open and closed.</small></div>}
              {reports !== null && <div><dd>{fmt(reports)}</dd><dt>Community reports</dt><small>Sent through StrayPaw in the last 90 days.</small></div>}
              <div><dd>{fmt(listed.members.length)}</dd><dt>Organisations listed</dt><small>On StrayPaw. Listing is not a partnership.</small></div>
            </dl>
            <div className="w4-facts">
              {partner && <p><b>Field partner</b><span>{partner.name}{partner.city ? `, ${partner.city}` : ""}. The organisation StrayPaw works alongside in the field.</span></p>}
              {listed.sources.length > 0 && <p><b>Data sources</b><span>{fmt(listed.sources.length)} organisations whose published records are imported under their licence and credited on every record.</span></p>}
              <p><b>Live today</b><span><Link href="/explore">The map of India</Link> · <Link href="/community/report">Reporting</Link> · <Link href="/for-ngos">NGO workspace</Link> · <Link href="/for-governments">City briefs</Link> · <Link href="/for-funders">Evidence reports</Link> · <Link href="/learn">Academy</Link></span></p>
            </div>
          </div>

          <div className="w4-next">
            <header><p className="sw-k">Still to build</p><h3>What comes <em>next.</em></h3></header>
            <ol>
              <li><b>More field partners</b><span>Today one organisation works on StrayPaw in the field, in Coimbatore. The record needs many.</span></li>
              <li><b>Live reporting in every city</b><span>Most cities on the map hold imported history. Each needs residents and teams adding to it.</span></li>
              <li><b>Ward boundaries</b><span>City briefs use analysis areas of about 0.7 km², not wards. Matching municipal boundaries comes next.</span></li>
              <li><b>Every Indian language</b><span>Reporting should work in the language each resident speaks.</span></li>
            </ol>
          </div>

          <div className="w4-end">
            <Resolve cells={cells} home={home} />
            <div className="w4-cta">
              <p className="sw-k">Where we are going</p>
              <h2>The shared memory of India&rsquo;s <em>street animals.</em></h2>
              <p className="w4-lede">Better care starts with better information. We are building the record that makes it possible, city by city.</p>
              <div className="sw-acts">
                <Link href="/app?choose=1" className="sw-btn is-flame">Explore the platform <ArrowUpRight size={17} aria-hidden /></Link>
                <Link href="/partner-apply" className="sw-btn is-paper">Work with us</Link>
                <Link href="/contact" className="sw-btn is-paper">Contact StrayPaw</Link>
              </div>
              <p className="w4-contact">Write to us through the <Link href="/contact">contact form</Link>; every message is read by the team building StrayPaw. <Link href="/our-story">Read our story <ArrowUpRight size={13} aria-hidden /></Link></p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter className="sw-foot" />
    </div>
  );
}
