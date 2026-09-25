import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TrustStrip } from "@/components/site/TrustStrip";
import { HeroPlate } from "@/components/landing/HeroPlate";
import { RequestFlow } from "@/components/landing/RequestFlow";
import { ScaleTriptych } from "@/components/landing/ScaleTriptych";
import { TheUnknown } from "@/components/landing/TheUnknown";
import { PhotoRegister } from "@/components/landing/PhotoRegister";
import { DeskMock } from "@/components/landing/DeskMock";
import { getLandingStory, getPhotoRegister } from "@/lib/landing/story";
import "@/components/site/site.css";
import "@/components/site/field-site.css";
import "@/components/landing/landing.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "StrayPaw, every street animal on the record",
  description: "A shared map and operational record for India's street animals. One sighting becomes coordinated action and better local evidence.",
};

/* ════════════════════════════════════════════════════════════════════
   The landing page: the register, at three scales.

   Not a headline and a screenshot. The page is the record itself, read
   aloud: a sample city filling in with every field record it holds, the
   route every request for help actually took, one street and one locality
   and one city drawn in the same cells, every request as a square, and —
   at its real size — how much of all this nobody has written down yet.

   Every figure and shape is computed on the server from the live register
   (lib/landing/story.ts). The sample city is labelled as the sample on
   every plate: StrayPaw is not that city.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");

export default async function HomePage() {
  const [story, photos] = await Promise.all([getLandingStory(), getPhotoRegister(24)]);
  const t = story?.totals;

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
            <div className="ld-hero-actions">
              <Link href="/report" className="sys-btn is-flame is-lg">Report a sighting <ArrowUpRight size={18} /></Link>
              <Link href="/map" className="sys-link is-night">Open the live map <ArrowUpRight size={15} /></Link>
            </div>
          </div>
          </div>
        </section>

        {story && (
          <>
            <section className="ld-sec ld-sec-bone" aria-labelledby="ld-line-title">
              <header className="sys-head">
                <h2 id="ld-line-title">Where {fmt(story.flow.requests)} requests for help <em>went.</em></h2>
              </header>
              <RequestFlow requests={story.flow.requests} status={story.flow.status} reasons={story.flow.reasons} noActionTotal={story.flow.noActionTotal} />
            </section>

            {story.ladder && (
              <section className="ld-sec ld-sec-shell" aria-labelledby="ld-scale-title">
                <header className="sys-head">
                  <h2 id="ld-scale-title">One place, <em>three distances.</em></h2>
                  <p>Recorded animals, not population.</p>
                </header>
                <ScaleTriptych city={story.hero.city} ladder={story.ladder} />
              </section>
            )}

            <section className="ld-sec ld-sec-night" aria-labelledby="ld-unknown-title">
              <div className="ld-unknown">
                <header className="sys-head is-night">
                  <h2 id="ld-unknown-title">Most of what matters <em>is not written down yet.</em></h2>
                  <p>The hatched part is not zero. It is unknown.</p>
                </header>
                <TheUnknown total={story.knowledge.total} ster={story.knowledge.ster} vacc={story.knowledge.vacc} photo={{ yes: story.knowledge.photo.yes, unknown: story.knowledge.photo.unknown }} />
              </div>
            </section>
          </>
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
              <ol className="ld-who-ladder">
                <li>
                  <span className="sys-eyebrow">On the street</span>
                  <div>
                    <Link href="/report"><b>Neighbours</b><ArrowUpRight size={16} /></Link>
                    <Link href="/feeder"><b>Feeders</b><ArrowUpRight size={16} /></Link>
                    <Link href="/education"><b>Educators</b><ArrowUpRight size={16} /></Link>
                  </div>
                </li>
                <li>
                  <span className="sys-eyebrow">In the field</span>
                  <div>
                    <Link href="/for-ngos"><b>Rescue organisations</b><ArrowUpRight size={16} /></Link>
                    <Link href="/partner-apply"><b>Field teams</b><ArrowUpRight size={16} /></Link>
                  </div>
                </li>
                <li>
                  <span className="sys-eyebrow">Across a city</span>
                  <div>
                    <Link href="/for-governments"><b>Municipalities</b><ArrowUpRight size={16} /></Link>
                    <Link href="/for-funders"><b>Funders</b><ArrowUpRight size={16} /></Link>
                    <Link href="/research-standards"><b>Researchers</b><ArrowUpRight size={16} /></Link>
                  </div>
                </li>
              </ol>
            </div>
            {story?.desk && story.desk.live + story.desk.older > 0 && <DeskMock city={story.hero.city} desk={story.desk} />}
          </div>
        </section>

        <TrustStrip total={t?.animals ?? 0} />

        <section className="ld-close">
          <h2>Know an animal <em>on your street?</em></h2>
          <Link href="/report" className="sys-btn is-flame is-lg">Report a sighting <ArrowUpRight size={18} /></Link>
        </section>
      </main>
      <footer className="field-footer"><Link href="/" className="field-footer-brand">StrayPaw<span>One sighting. A shared record.</span></Link><nav aria-label="Footer"><Link href="/mission">Mission</Link><Link href="/for-ngos">For NGOs</Link><Link href="/evidence">Evidence</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link></nav><span>Built with care, in India.<br />© {new Date().getFullYear()} StrayPaw</span></footer>
    </div>
  );
}
