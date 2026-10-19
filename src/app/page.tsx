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
import { ToneWatch, Split } from "@/components/bindu/Tone";
import type { Cell } from "@/components/bindu/mapkit";
import { HeroMap, VectorIndia, type Pin } from "@/components/home3/Hero";
import { Request, type Area } from "@/components/home3/Request";
import { Ecosystem, type Loc } from "@/components/home3/Ecosystem";
import { Resolve } from "@/components/home3/Resolve";
import "@/components/site/site.css";
import "@/components/home3/home3.css";

export const revalidate = 300;
export const metadata = {
  title: "StrayPaw. The infrastructure for street-animal care in India.",
  description: "StrayPaw connects animal reports, WhatsApp rescue workflows and care records into one platform for communities, NGOs and cities.",
};

/* ════════════════════════════════════════════════════════════════════
   The homepage, in four sections.

   1  What StrayPaw is: India at night, on the record, and the product.
   2  Why it exists: one request, and the whole system responding to it.
   3  How it works and who it serves: one city's streets drawn by hand,
      opening onto the record, with the software each person uses.
   4  The company: why, what is real today, where it goes; and the one
      request from section 2 comes home to the map section 1 opened on.

   Every figure, place, photograph and queue row is read live from the
   public record. The WhatsApp exchange, its case and its animal are an
   example, and are labelled so wherever they appear.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");

/* Community reports sent through StrayPaw in the last 90 days: one server-side count, never a row. */
const recentReports = unstable_cache(async (): Promise<number | null> => {
  const supa = getSupabaseAdmin(); if (!supa) return null;
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { count, error } = await supa.from("sightings").select("id", { count: "exact", head: true }).gte("created_at", since);
  return error ? null : count ?? null;
}, ["landing-recent-reports-v1"], { revalidate: 3600 });

const ringCentre = (ring: number[]): [number, number] => { let x = 0, y = 0; const n = ring.length / 2; for (let i = 0; i < ring.length; i += 2) { x += ring[i]; y += ring[i + 1]; } return [x / n, y / n]; };

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
  const pins: Pin[] = rawCities.filter((c) => c.lng != null && c.lat != null && c.animals > 0).map((c) => ({ city: c.city, c: [c.lng!, c.lat!], animals: c.animals }));
  const sample = story?.hero.city ?? null;
  const sampleCity = rawCities.find((c) => c.city === sample) ?? null;
  const home: [number, number] | null = sampleCity?.lng != null && sampleCity?.lat != null ? [sampleCity.lng, sampleCity.lat] : null;

  /* The place the example is reported from: the sample city's locality with the most open requests on the live record. */
  const areas: Area[] = (story?.desk.cells ?? []).map((c) => ({ ring: c.ring, open: c.open, crit: c.crit, name: c.name }));
  const focusArea = [...areas].sort((a, b) => b.open - a.open || b.crit - a.crit)[0] ?? null;
  const place = focusArea?.name || sample || "the city";
  const focusAt: [number, number] = focusArea ? ringCentre(focusArea.ring) : home ?? [76.96, 11.01];
  const locs: Loc[] = (() => { const by = new Map<string, number>(); for (const a of areas) if (a.name) by.set(a.name, (by.get(a.name) ?? 0) + a.open); return [...by.entries()].map(([name, open]) => ({ name, open })).sort((a, b) => b.open - a.open); })();
  const photos = register.cards.filter((c) => c.cover_photo).slice(0, 5);
  const partner = partners[0] ?? null;

  return (
    <div className={`sp h3 ${sxSerif.variable}`}>
      <PageView name="landing_view" />
      <ToneWatch root=".h3" />
      <SiteHeader tone="paper" />
      <main>
        {/* 1 · What StrayPaw is. */}
        <Stage id="what" className="h3-hero" screens={1.5} still={0} tone="day" label="StrayPaw">
          <HeroMap cells={cells} pins={pins} focus={focusAt} />
          <div className="h3-shade" aria-hidden />
          <div className="h3-copy">
            <p className="h3-k">StrayPaw · India</p>
            <h1>
              <span className="h3-l1"><Split text="Every street animal deserves a history." /></span>
              <span className="h3-l2"><Split text="Every rescue needs a system." /></span>
            </h1>
            <p className="h3-lede">StrayPaw connects animal reports, WhatsApp rescue workflows and care records into one platform for communities, NGOs and cities.</p>
            <div className="h3-acts">
              <Link href="/explore" className="h3-btn is-flame">Explore StrayPaw <ArrowUpRight size={17} aria-hidden /></Link>
              <Link href="/organisations" className="h3-btn is-ghost">For Organisations</Link>
            </div>
          </div>
          {totals && (
            <dl className="h3-proof">
              <div><dd>{fmt(totals.animals)}</dd><dt>animal records</dt></div>
              <div><dd>{fmt(totals.cities)}</dd><dt>cities</dt></div>
              <div><dd>{fmt(cells.length)}</dd><dt>mapped areas</dt></div>
              <div><dd>{fmt(totals.cases)}</dd><dt>requests for help</dt></div>
            </dl>
          )}
          {story && (
            <aside className="h3-glimpse" aria-label={`Live open requests in ${story.hero.city}`}>
              <p><i aria-hidden />Live · {story.hero.city}<span>{fmt(story.desk.live)} open</span></p>
              <ol>{story.desk.queue.slice(0, 3).map((q, i) => <li key={i} className={q.critical ? "is-crit" : ""}><b>{q.condition}</b><span>{q.locality}</span></li>)}</ol>
            </aside>
          )}
          <p className="h3-dive" aria-hidden><span>{place}, {sample}</span></p>
        </Stage>

        {/* 2 · Why we exist: one request, and the whole system responding. */}
        <Stage id="why" className="h3-req" screens={3.6} still={1} tone="day" label="One request, the whole system">
          <Request areas={areas} city={sample ?? "The city"} />
        </Stage>

        {/* 3 · How it works and who it serves. */}
        <Stage id="how" className="h3-eco" screens={3} steps={4} still={0.62} tone="day" label="One ecosystem, four ways in">
          <Ecosystem cells={cells} focus={focusAt} place={place} queue={story?.desk.queue ?? []} locs={locs}
            brief={sampleCity ? { city: sampleCity.city, animals: sampleCity.animals, cells: sampleCity.cells, sterilised: sampleCity.sterilised, ster_unknown: sampleCity.ster_unknown, cases: sampleCity.cases } : null} />
          <div className="eco-more"><Link href="/product" className="h3-btn is-ink">See the product <ArrowUpRight size={16} aria-hidden /></Link><Link href="/organisations" className="h3-link">For organisations</Link></div>
        </Stage>

        {/* 4 · The company. */}
        <section id="company" className="h3-co" data-tone="day" aria-labelledby="co-why">
          <div className="co3-why">
            <p className="h3-k is-ink">Why StrayPaw exists</p>
            <h2 id="co-why">India&rsquo;s street animals are cared for by thousands of people. <em>Almost none of it is written down in one place.</em></h2>
            <div className="co3-cols">
              <p>A resident sees an injured dog and posts in a group. A rescuer picks it up. A vet treats it. A feeder sees it again a month later. Each of them keeps a piece of the story, in a chat, a sheet or a notebook, and the next person starts from nothing.</p>
              <p>One rescue register imported into StrayPaw held 169 open requests, and no column for who was responsible for them. That is the problem in one number. StrayPaw gives every report an owner, every animal a history and every city a map of where help is needed.</p>
            </div>
          </div>

          {photos.length > 0 && (
            <ul className="co3-photos" aria-label="Animals on the record">
              {photos.map((c, i) => (
                <li key={c.id} style={{ ["--i" as string]: i }}><Link href={`/animal/${c.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.cover_photo} alt={`${c.name ?? c.straypaw_id ?? "An animal"}, as photographed`} loading="lazy" referrerPolicy="no-referrer" />
                  <span>{c.straypaw_id ?? c.name}<small>{c.city}</small></span>
                </Link></li>
              ))}
            </ul>
          )}

          <div className="co3-mv">
            <div><p className="h3-k is-ink">Mission</p><h3>Make street-animal care more coordinated, accountable and informed.</h3></div>
            <div><p className="h3-k is-ink">Vision</p><h3>The shared information and operational infrastructure connecting animals, communities, care organisations and cities.</h3></div>
          </div>

          <div className="co3-proof">
            <div className="co3-map"><VectorIndia cells={cells} className="co3-vi" /><p>{fmt(cells.length)} mapped areas in {totals ? fmt(totals.cities) : ""} cities</p></div>
            <dl className="co3-nums">
              {totals && <div><dd>{fmt(totals.animals)}</dd><dt>Animal records</dt><small>Mostly historical registers organisations brought with them. A record is not a census.</small></div>}
              {totals && <div><dd>{fmt(totals.cases)}</dd><dt>Requests for help</dt><small>On the record, open and closed.</small></div>}
              {reports !== null && <div><dd>{fmt(reports)}</dd><dt>Community reports</dt><small>Sent through StrayPaw in the last 90 days.</small></div>}
              <div><dd>{fmt(listed.members.length)}</dd><dt>Organisations listed</dt><small>On StrayPaw. Listing is not a partnership.</small></div>
            </dl>
            <div className="co3-part">
              {partner && <p><b>Field partner</b><span>{partner.name}{partner.city ? `, ${partner.city}` : ""}</span></p>}
              {listed.sources.length > 0 && <p><b>Data sources</b><span>{fmt(listed.sources.length)} organisations whose published records are imported under their licence, credited on every record.</span></p>}
              <p><b>Live today</b><span><Link href="/explore">The map of India</Link> · <Link href="/community/report">Reporting</Link> · <Link href="/for-ngos">NGO workspace</Link> · <Link href="/for-governments">City briefs</Link> · <Link href="/learn">Academy</Link></span></p>
            </div>
          </div>

          <div className="co3-end">
            <Resolve cells={cells} home={home} />
            <div className="co3-cta">
              <h2>Better care starts with <em>better information.</em></h2>
              <div className="h3-acts">
                <Link href="/app?choose=1" className="h3-btn is-flame">Open App <ArrowUpRight size={17} aria-hidden /></Link>
                <Link href="/partner-apply" className="h3-btn is-line">Partner With Us</Link>
                <Link href="/contact" className="h3-btn is-line">Contact Us</Link>
              </div>
              <p className="co3-story"><Link href="/our-story">Read our story <ArrowUpRight size={14} aria-hidden /></Link></p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter className="h3-foot" />
    </div>
  );
}
