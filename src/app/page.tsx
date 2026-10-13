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
import { getAnimalRegister, getLandingStory } from "@/lib/landing/story";
import { CareStory } from "@/components/landing/CareStory";
import { LandingMotion } from "@/components/landing/LandingMotion";
import "@/components/site/site.css";
import "@/components/site/field-site.css";
import "@/components/landing/landing.css";

export const revalidate = 300;
export const metadata = {
  title: "StrayPaw. Every street animal on the record.",
  description: "One record for every sighting, case and outcome.",
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
  { level: "street", scale: "Resident", who: "Residents and feeders", does: "Report what you see. Follow what happens.", action: "Report now", href: "/report" },
  { level: "field", scale: "NGO", who: "Rescue organisations", does: "Run cases, field work and care in one place.", action: "For NGOs", href: "/for-ngos" },
  { level: "city", scale: "Municipality", who: "Municipalities and funders", does: "See coverage, gaps and outcomes.", action: "View coverage", href: "/for-governments" },
] as const;

const EMPTY_REGISTER = { total: 0, cards: [] };

async function LandingAnimalRegister({ plate }: { plate: RegisterPlateData | null }) {
  const register = await getAnimalRegister().catch(() => EMPTY_REGISTER);
  return <AnimalRegister data={register} total={register.total} plate={plate} />;
}

export default async function HomePage() {
  /* The landing's narrative, hero plate, three-screen relay and one-request
     walkthrough, is computed from one sample city and cached (lib/landing/
     story.ts). It is bounded by design and never reads the register; if it
     is unavailable the page still renders every section that does not need
     it. The animal register is streamed separately in its own Suspense. */
  const story = await getLandingStory().catch(() => null);
  return (
    <div className="sp field-site product-site ld">
      <PageView name="landing_view" />
      <LandingMotion />
      <SiteHeader tone="night" />
      <main>
        <section className="ld-hero" aria-labelledby="hero-title">
          <div className="ld-stage">
          {story && <HeroPlate city={story.hero.city} box={story.hero.box} rings={story.hero.rings} events={story.hero.events} />}
          <div className="ld-hero-copy">
            <h1 id="hero-title">
              Every stray animal in India.
              <em>Seen. Tracked. Cared&nbsp;for.</em>
            </h1>
            <p className="ld-hero-sub">One shared record for every sighting, case and outcome.</p>
            {story && <HeroTally animals={story.totals.animals} cases={story.totals.cases} cities={story.totals.cities} />}
            <div className="ld-hero-actions">
              <Link href="/report" className="sys-btn is-flame is-lg">Report a sighting <ArrowUpRight size={18} /></Link>
              <Link href="/map" className="sys-link is-night">Open the live map <ArrowUpRight size={15} /></Link>
            </div>
          </div>
          </div>
        </section>

        {/* Right after the hero, the centre of the page: every animal has a
            card. It shows the hero's own count (one source); its own count
            is only a fallback for a visit where the story could not load. */}
        <Suspense fallback={<AnimalRegister data={EMPTY_REGISTER} total={0} />}>
          <LandingAnimalRegister plate={story ? { city: story.hero.city, box: story.hero.box, rings: story.hero.rings, events: story.hero.events } : null} />
        </Suspense>

        {/* 3. One report, three screens. One record throughout. */}
        {story?.relay && (
          <section className="ld-sec ld-sec-shell" aria-labelledby="ld-relay-title">
            <header className="sys-head" data-ld-reveal="head">
              <h2 id="ld-relay-title">One report. <em>Three views.</em></h2>
              <p>Resident. Rescue team. City. The same record throughout.</p>
            </header>
            <Relay city={story.hero.city} desk={story.desk} report={story.relay} />
          </section>
        )}

        {/* 4. One request, from field action to outcome. */}
        {story?.journey && (
          <CaseDive
            j={story.journey}
            city={story.hero.city}
            box={story.hero.box}
            rings={story.hero.rings}
            events={story.hero.events}
            note={story.record.medianFirstAction !== null ? `Across ${fmt(story.record.requests)} recent requests in ${story.hero.city}, the median wait to a dated first action was ${story.record.medianFirstAction === 0 ? "under a day" : `${story.record.medianFirstAction} day${story.record.medianFirstAction === 1 ? "" : "s"}`}. Not every request was accepted.` : undefined}
          />
        )}

        {/* WhatsApp is the live access layer for the same record. */}
        <CareStory />

        {/* 5. One record for residents, NGOs and municipalities. */}
        <section className="ld-sec ld-sec-shell ld-audience" aria-labelledby="ld-audience-title">
          <div className="ld-scale">
            <header className="sys-head" data-ld-reveal="head">
              <p className="ld-section-kicker sys-mono">One record</p>
              <h2 id="ld-audience-title">Every street. <em>Every scale.</em></h2>
            </header>
            <ol className="ld-levels">
              {LEVELS.map((l, i) => (
                <li key={l.level} data-ld-reveal="item" style={{ ["--i" as string]: i }}>
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
            <p className="sys-mono">Start with what you see</p>
            <h2>See a dog? <em>Report it.</em></h2>
          </div>
          <div className="ld-close-action">
            <p><b>A photo. A place. What you see.</b><span>No account. No guesswork.</span></p>
            <Link href="/report" className="sys-btn is-flame is-lg">Report a sighting <ArrowUpRight size={18} /></Link>
          </div>
        </section>
      </main>
      <footer className="ld-foot">
        <div className="ld-foot-top">
          <Link href="/" className="ld-foot-brand">StrayPaw<span>From sighting to outcome. One shared record.</span></Link>
          <FooterIndex />
        </div>
        <p className="ld-foot-base"><span>© {new Date().getFullYear()} StrayPaw</span><span>Built with care, in India.</span></p>
      </footer>
    </div>
  );
}
