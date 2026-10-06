import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { FooterIndex } from "@/components/site/FooterIndex";
import { ScaleGlyph } from "@/components/landing/ScaleGlyph";
import { HeroPlate } from "@/components/landing/HeroPlate";
import { CaseDive } from "@/components/landing/CaseDive";
import { HeroTally } from "@/components/landing/HeroTally";
import { AnimalRegister } from "@/components/landing/AnimalRegister";
import type { RegisterPlateData } from "@/components/landing/RegisterPlate";
import { Relay } from "@/components/landing/Relay";
import { SharedSystem } from "@/components/landing/SharedSystem";
import { getAnimalRegister, getLandingStory } from "@/lib/landing/story";
import "@/components/site/site.css";
import "@/components/site/field-site.css";
import "@/components/landing/landing.css";

export const revalidate = 300;
export const metadata = {
  title: "StrayPaw, every street animal on the record",
  description: "One shared record connecting sightings, field work and outcomes for India's street animals.",
};

/* ════════════════════════════════════════════════════════════════════
   The landing page: the register, at three scales.

   Not a headline and a screenshot. The page is the record itself, read
   aloud: a sample city filling in with every field record it holds; one
   real report passing from a phone to the Field Workspace to the public
   map under one ID, with the three who read it (resident, NGO,
   municipality); one request followed to its close; and the animals
   photographed onto it.
   The Field Workspace itself is shown on /for-ngos. What is still
   unknown is told on /evidence.

   Every figure and shape is computed on the server from the live register
   (lib/landing/story.ts). The sample city is labelled as the sample on
   every plate: StrayPaw is not that city.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");


/* Who reads the record: resident, NGO, municipality. One reader group and
   one thing to do at each, under the three screens. Everyone else it
   serves is in the footer's index. */
const LEVELS = [
  { level: "street", scale: "Resident", who: "Residents and feeders", does: "Report an animal, follow what happens to it, keep the patch you feed.", action: "Report an animal", href: "/report" },
  { level: "field", scale: "NGO", who: "Rescue organisations", does: "Run cases, drives and care from one queue, on records you control.", action: "For NGOs", href: "/for-ngos" },
  { level: "city", scale: "Municipality", who: "Municipalities and funders", does: "See which wards are covered, and check outcomes against the record.", action: "View municipal coverage", href: "/for-governments" },
] as const;

const EMPTY_REGISTER = { total: 0, cards: [] };

async function LandingAnimalRegister({ plate }: { plate: RegisterPlateData | null }) {
  const register = await getAnimalRegister().catch(() => EMPTY_REGISTER);
  return <AnimalRegister data={register} total={register.total} plate={plate} />;
}

export default async function HomePage() {
  /* The landing's narrative — hero plate, three-screen relay, one-request
     walkthrough — is computed from ONE sample city and cached (lib/landing/
     story.ts). It is bounded by design and never reads the register; if it
     is unavailable the page still renders every section that does not need
     it. The animal register is streamed separately in its own Suspense. */
  const story = await getLandingStory().catch(() => null);
  return (
    <div className="sp field-site product-site ld">
      <PageView name="landing_view" />
      <SiteHeader tone="night" />
      <main>
        <section className="ld-hero" aria-labelledby="hero-title">
          <div className="ld-stage">
          {story && <HeroPlate city={story.hero.city} box={story.hero.box} rings={story.hero.rings} events={story.hero.events} />}
          <div className="ld-hero-copy">
            <h1 id="hero-title">
              Every stray animal in India.
              <em>Seen, tracked, cared&nbsp;for.</em>
            </h1>
            <p className="ld-hero-sub">One shared record connecting sightings, field work and outcomes.</p>
            {story && <HeroTally animals={story.totals.animals} cases={story.totals.cases} cities={story.totals.cities} />}
            <div className="ld-hero-actions">
              <Link href="/report" className="sys-btn is-flame is-lg">Report a sighting <ArrowUpRight size={18} /></Link>
              <Link href="/map" className="sys-link is-night">Open the live map <ArrowUpRight size={15} /></Link>
            </div>
          </div>
          </div>
        </section>

        {/* The hero's first scroll beat: the same data shapes visitors meet
            later as a profile and a case, brought into one record. It shares
            the register's ground so the resolved system becomes that next
            section instead of adding a new landing-page panel. */}
        {story && (
          <SharedSystem
            city={story.hero.city}
            animals={story.totals.animals}
            cases={story.totals.cases}
            cities={story.totals.cities}
            report={story.relay ? {
              condition: story.relay.condition,
              locality: story.relay.locality,
              straypawId: story.relay.straypawId,
            } : null}
          />
        )}

        {/* Right after the hero, the centre of the page: every animal has a
            card. It shows the hero's own count (one source); its own count
            is only a fallback for a visit where the story could not load. */}
        <Suspense fallback={<AnimalRegister data={EMPTY_REGISTER} total={0} />}>
          <LandingAnimalRegister plate={story ? { city: story.hero.city, box: story.hero.box, rings: story.hero.rings, events: story.hero.events } : null} />
        </Suspense>

        {/* 3. One report, three screens — the system, one record the whole way. */}
        {story?.relay && (
          <section className="ld-sec ld-sec-shell" aria-labelledby="ld-relay-title">
            <header className="sys-head">
              <h2 id="ld-relay-title">One report, <em>three screens.</em></h2>
              <p>A real request in {story.hero.city}: reported by a resident, worked by an NGO, visible to a municipality. One record the whole way.</p>
            </header>
            <Relay city={story.hero.city} desk={story.desk} report={story.relay} />
          </section>
        )}

        {/* 4. One request → field action → care → outcome — the proof. */}
        {story?.journey && (
          <CaseDive
            j={story.journey}
            city={story.hero.city}
            box={story.hero.box}
            rings={story.hero.rings}
            events={story.hero.events}
            note={story.record.medianFirstAction !== null ? `Among the ${fmt(story.record.requests)} recent requests sampled in ${story.hero.city}, records with a dated first action had a median response of ${story.record.medianFirstAction === 0 ? "the same day" : `${story.record.medianFirstAction} day${story.record.medianFirstAction === 1 ? "" : "s"}`}.` : undefined}
          />
        )}

        {/* 5. Resident / NGO / Municipality — who the record serves. */}
        <section className="ld-sec ld-sec-shell" aria-label="Who reads the record">
          <div className="ld-scale">
            <ol className="ld-levels">
              {LEVELS.map((l, i) => (
                <li key={l.level} style={{ ["--i" as string]: i }}>
                  <Link href={l.href}>
                    <ScaleGlyph level={l.level} />
                    <span className="ld-lv-text">
                      <small>{l.scale}</small>
                      <b>{l.who}</b>
                      <span>{l.does}</span>
                    </span>
                    <span className="ld-lv-go">{l.action} <ArrowUpRight size={15} aria-hidden /></span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 6. Final CTA. */}
        <section className="ld-close">
          <div className="ld-close-copy">
            <p className="sys-mono">The record starts on a street</p>
            <h2>Know a dog? <em>Report it.</em></h2>
          </div>
          <div className="ld-close-action">
            <p><b>A photo. A place. What you can see.</b><span>No account needed. Leave anything uncertain unknown.</span></p>
            <Link href="/report" className="sys-btn is-flame is-lg">Report a sighting <ArrowUpRight size={18} /></Link>
          </div>
        </section>
      </main>
      <footer className="ld-foot">
        <div className="ld-foot-top">
          <Link href="/" className="ld-foot-brand">StrayPaw<span>One shared record, from sighting to outcome.</span></Link>
          <FooterIndex />
        </div>
        <p className="ld-foot-base"><span>© {new Date().getFullYear()} StrayPaw</span><span>Built with care, in India.</span></p>
      </footer>
    </div>
  );
}
