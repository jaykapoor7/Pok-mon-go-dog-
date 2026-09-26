import Link from "next/link";
import { DM_Sans, Newsreader } from "next/font/google";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { FooterIndex } from "@/components/site/FooterIndex";
import { ScaleGlyph } from "@/components/landing/ScaleGlyph";
import { HeroPlate } from "@/components/landing/HeroPlate";
import { CaseDive } from "@/components/landing/CaseDive";
import { HeroTally } from "@/components/landing/HeroTally";
import { PhotoRegister } from "@/components/landing/PhotoRegister";
import { Relay } from "@/components/landing/Relay";
import { getLandingStory, getPhotoRegister } from "@/lib/landing/story";
import "@/components/site/site.css";
import "@/components/site/field-site.css";
import "@/components/landing/landing.css";

export const dynamic = "force-dynamic";
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

/* The landing's headlines only, in each face's variable cut with its
   optical-size axis: at 40 to 96px the browser draws DM Sans and Newsreader
   from their display masters, finer and more tightly fitted than the text
   cuts the rest of the site uses. Loaded here so no other page pays for it. */
const displaySans = DM_Sans({ subsets: ["latin"], axes: ["opsz"], variable: "--font-sans-display", display: "swap" });
const displaySerif = Newsreader({ subsets: ["latin"], style: ["italic"], axes: ["opsz"], variable: "--font-serif-display", display: "swap" });

/* Who reads the record: resident, NGO, municipality. One reader group and
   one thing to do at each, under the three screens. Everyone else it
   serves is in the footer's index. */
const LEVELS = [
  { level: "street", scale: "Resident", who: "Residents and feeders", does: "Report an animal, follow what happens to it, keep the patch you feed.", action: "Report an animal", href: "/report" },
  { level: "field", scale: "NGO", who: "Rescue organisations", does: "Run cases, drives and care from one queue, on records you control.", action: "For NGOs", href: "/for-ngos" },
  { level: "city", scale: "Municipality", who: "Municipalities and funders", does: "See which wards are covered, and check outcomes against the record.", action: "View municipal coverage", href: "/for-governments" },
] as const;

export default async function HomePage() {
  const [story, photos] = await Promise.all([getLandingStory(), getPhotoRegister(24)]);

  return (
    <div className={`sp field-site product-site ld ${displaySans.variable} ${displaySerif.variable}`}>
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

        <section className="ld-sec ld-sec-shell" aria-labelledby={story?.relay ? "ld-relay-title" : undefined} aria-label={story?.relay ? undefined : "Who reads the record"}>
          {story?.relay && story.desk.live + story.desk.older > 0 && (
            <>
              <header className="sys-head">
                <h2 id="ld-relay-title">One report, <em>three screens.</em></h2>
                <p>A real request in {story.hero.city}: reported by a resident, worked by an NGO, visible to a municipality. One record the whole way.</p>
              </header>
              <Relay city={story.hero.city} desk={story.desk} report={story.relay} />
            </>
          )}
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

        {story?.journey && (
          <CaseDive
            j={story.journey}
            city={story.hero.city}
            box={story.hero.box}
            rings={story.hero.rings}
            events={story.hero.events}
            note={story.record.medianFirstAction !== null ? `Across ${story.hero.city}'s ${fmt(story.record.requests)} requests, half had a field team on them ${story.record.medianFirstAction === 0 ? "the same day" : `within ${story.record.medianFirstAction} day${story.record.medianFirstAction === 1 ? "" : "s"}`}.` : undefined}
          />
        )}

        <section className="ld-sec ld-sec-bone ld-sec-tight" aria-label="Photographed onto the record">
          <PhotoRegister rows={photos.rows} />
        </section>

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
