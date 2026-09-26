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
import { DeskMock } from "@/components/landing/DeskMock";
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
   aloud: a sample city filling in with every field record it holds, the
   route every request for help actually took, and the animals
   photographed onto it. What is still unknown is told on /evidence.

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

/* Who reads the record, from one street up to a whole city: three levels,
   one reader group and one thing to do at each. Everyone else it serves is
   in the footer's index. */
const LEVELS = [
  { level: "street", scale: "One street", who: "Residents and feeders", does: "Report an animal, follow what happens to it, keep the patch you feed.", action: "Report an animal", href: "/report" },
  { level: "field", scale: "One locality", who: "Rescue organisations", does: "Run cases, drives and care from one queue, on records you control.", action: "For NGOs", href: "/for-ngos" },
  { level: "city", scale: "One city", who: "Municipalities and funders", does: "See which wards are covered, and check outcomes against the record.", action: "Read a city", href: "/insights" },
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

        {story?.journey && (
          <CaseDive
            j={story.journey}
            city={story.hero.city}
            box={story.hero.box}
            rings={story.hero.rings}
            note={story.record.medianFirstAction !== null ? `Across ${story.hero.city}'s ${fmt(story.record.requests)} requests, half had a field team on them ${story.record.medianFirstAction === 0 ? "the same day" : `within ${story.record.medianFirstAction} day${story.record.medianFirstAction === 1 ? "" : "s"}`}.` : undefined}
          />
        )}

        <section className="ld-sec ld-sec-bone ld-sec-tight" aria-label="Photographed animals">
          <PhotoRegister rows={photos.rows} total={photos.total} />
        </section>

        <section className="ld-sec ld-sec-shell" aria-labelledby="ld-who-title">
          <div className="ld-who">
            <div className="ld-who-text">
              <header className="sys-head">
                <h2 id="ld-who-title">One record, <em>read at every level.</em></h2>
              </header>
              <ul className="ld-levels">
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
              </ul>
            </div>
            {story?.desk && story.desk.live + story.desk.older > 0 && <DeskMock city={story.hero.city} desk={story.desk} />}
          </div>
        </section>

        <section className="ld-close">
          <h2>Know an animal <em>on your street?</em></h2>
          <Link href="/report" className="sys-btn is-flame is-lg">Report a sighting <ArrowUpRight size={18} /></Link>
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
