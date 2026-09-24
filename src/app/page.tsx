import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TrustStrip } from "@/components/site/TrustStrip";
import { HeroPlate } from "@/components/landing/HeroPlate";
import { IndiaInset } from "@/components/landing/IndiaInset";
import { RequestFlow } from "@/components/landing/RequestFlow";
import { ScaleTriptych } from "@/components/landing/ScaleTriptych";
import { EveryRequest } from "@/components/landing/EveryRequest";
import { TheUnknown } from "@/components/landing/TheUnknown";
import { PhotoRegister } from "@/components/landing/PhotoRegister";
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
      <SiteHeader />
      <main>
        <section className="ld-hero" aria-labelledby="hero-title">
          <div className="ld-stage">
          {story && <HeroPlate city={story.hero.city} box={story.hero.box} rings={story.hero.rings} events={story.hero.events} />}
          <div className="ld-hero-copy">
            <p className="sys-eyebrow is-night">The shared record for India&apos;s street animals</p>
            <h1 id="hero-title">
              Every stray animal in India.
              <em>Seen, tracked, cared&nbsp;for.</em>
            </h1>
            <div className="ld-hero-actions">
              <Link href="/report" className="sys-btn is-flame is-lg">Report a sighting <ArrowUpRight size={18} /></Link>
              <Link href="/map" className="sys-link is-night">Open the live map <ArrowUpRight size={15} /></Link>
            </div>
            {t && (
              <p className="ld-hero-tally sys-mono">
                <b>{fmt(t.animals)}</b> animals · <b>{fmt(t.cases)}</b> cases · <b>{fmt(t.sightings)}</b> resident reports · <b>{t.cities}</b> cities
              </p>
            )}
          </div>
          </div>
          {story && (
            <div className="ld-hero-foot">
              <IndiaInset cities={story.india} sample={story.hero.city} pinky={story.pinky} photoCount={photos.total} />
              <p className="ld-hero-note">
                <span className="sys-eyebrow is-night">About this plate</span>
                The city behind the headline is <b>{story.hero.city}</b>, drawn from one partner&apos;s rescue register — the
                densest record StrayPaw holds today, and a <b>sample</b>, not the product&apos;s limit. The same record is kept
                for every animal reported anywhere in India.
              </p>
            </div>
          )}
        </section>

        {story && (
          <>
            <section className="ld-sec ld-sec-bone" aria-labelledby="ld-line-title">
              <header className="sys-head">
                <p className="sys-eyebrow">Report → Record → Case → Outcome</p>
                <h2 id="ld-line-title">Where {fmt(story.flow.requests)} requests for help <em>actually&nbsp;went.</em></h2>
                <p>
                  Every call for help on the register, followed to its end. Work usually starts fast — half of all requests
                  had a rescue plan within {story.flow.firstAction.median === 0 ? "the same day" : `${story.flow.firstAction.median} day${story.flow.firstAction.median === 1 ? "" : "s"}`}.
                  What breaks the line is rarely willingness. It is the animal nobody can find again.
                </p>
              </header>
              <RequestFlow requests={story.flow.requests} status={story.flow.status} reasons={story.flow.reasons} noActionTotal={story.flow.noActionTotal} />
            </section>

            {story.ladder && (
              <section className="ld-sec ld-sec-shell" aria-labelledby="ld-scale-title">
                <header className="sys-head">
                  <p className="sys-eyebrow">Street → locality → city</p>
                  <h2 id="ld-scale-title">One place, <em>three distances.</em></h2>
                  <p>
                    Every record belongs to a cell of about three quarters of a square kilometre, the same cells at every
                    scale — so a street, a locality and a whole city can be compared without redrawing a boundary.
                  </p>
                </header>
                <ScaleTriptych city={story.hero.city} ladder={story.ladder} />
              </section>
            )}

            <section className="ld-sec ld-sec-bone" aria-labelledby="ld-every-title">
              <div className="ld-every">
                <header className="sys-head">
                  <p className="sys-eyebrow">What rescuers actually record</p>
                  <h2 id="ld-every-title">Every request, <em>a square.</em></h2>
                  <p>
                    Grouped by what was wrong, coloured by what became of it. Road accidents are the largest single reason
                    anyone calls. Where the condition was never written down, the row says so — it is not folded into
                    &ldquo;other&rdquo;.
                  </p>
                </header>
                <EveryRequest rows={story.conditions} />
              </div>
            </section>

            <section className="ld-sec ld-sec-night" aria-labelledby="ld-unknown-title">
              <div className="ld-unknown">
                <header className="sys-head is-night">
                  <p className="sys-eyebrow is-night">Recorded is not the same as real</p>
                  <h2 id="ld-unknown-title">Most of what matters <em>is not written down yet.</em></h2>
                  <p>
                    Of {fmt(story.knowledge.total)} animals on the register, sterilisation status is known for{" "}
                    {fmt(story.knowledge.ster.yes + story.knowledge.ster.no)}. The hatched part of each bar is not zero — it is
                    unknown. A place with few records is a place nobody has mapped, not a place without dogs.
                  </p>
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
            <header className="sys-head">
              <p className="sys-eyebrow">Resident → organisation → institution</p>
              <h2 id="ld-who-title">One record, <em>read at every level.</em></h2>
            </header>
            <ol className="ld-who-ladder">
              <li>
                <span className="sys-eyebrow">On the street</span>
                <Link href="/report"><b>Neighbour</b><span>Report an animal you pass. A photo and a place is enough; follow what happens to it.</span><ArrowUpRight size={18} /></Link>
                <Link href="/feeder"><b>Feeder</b><span>Keep your feeding zones, your route and the animals you know in one place.</span><ArrowUpRight size={18} /></Link>
                <Link href="/education"><b>Educator</b><span>Teaching material, used with the animals on your own street.</span><ArrowUpRight size={18} /></Link>
              </li>
              <li>
                <span className="sys-eyebrow">In the field</span>
                <Link href="/partner-apply"><b>Organisation</b><span>Turn incoming reports into tracked field work, with a full history for every animal.</span><ArrowUpRight size={18} /></Link>
                <Link href="/for-ngos"><b>Field teams</b><span>A triage queue, a map of open work, and the record your workbook already keeps.</span><ArrowUpRight size={18} /></Link>
              </li>
              <li>
                <span className="sys-eyebrow">Across a city</span>
                <Link href="/for-governments"><b>Municipal bodies</b><span>Coverage you can audit, cell by cell, with the unknown drawn rather than hidden.</span><ArrowUpRight size={18} /></Link>
                <Link href="/for-funders"><b>Funders</b><span>Scope and cost a programme against what the register actually shows.</span><ArrowUpRight size={18} /></Link>
                <Link href="/research-standards"><b>Researchers</b><span>How the record is kept, and what it can and cannot support.</span><ArrowUpRight size={18} /></Link>
              </li>
            </ol>
          </div>
        </section>

        <TrustStrip total={t?.animals ?? 0} />

        <section className="ld-close">
          <p className="sys-eyebrow is-night">Start with one animal</p>
          <h2>Know an animal <em>on your street?</em></h2>
          <Link href="/report" className="sys-btn is-flame is-lg">Report a sighting <ArrowUpRight size={18} /></Link>
        </section>
      </main>
      <footer className="field-footer"><Link href="/" className="field-footer-brand">StrayPaw<span>One sighting. A shared record.</span></Link><nav aria-label="Footer"><Link href="/mission">Mission</Link><Link href="/for-ngos">For NGOs</Link><Link href="/evidence">Evidence</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link></nav><span>Built with care, in India.<br />© {new Date().getFullYear()} StrayPaw</span></footer>
    </div>
  );
}
