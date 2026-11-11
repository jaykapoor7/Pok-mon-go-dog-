import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { STORIES, RELATIONSHIP_LABEL, fieldPartnerStrip } from "@/sp3/customers";
import { DEMO_SITE, LIVE_DEMO_PUBLIC, LIVE_DEMO_URL } from "@/lib/demo-site";
import { Relay } from "@/site6/Relay";
import { Roles } from "@/site6/Roles";
import { Switchboard } from "@/site6/Switchboard";
import { KajuScene } from "@/site6/KajuScene";
import { SiteMotion } from "@/site6/Motion";
import { CloseThread, HeroBand, HeroThread } from "@/site6/Thread";
import { HeroDemo } from "@/sp4/home/HeroDemo";
import { Blueprint } from "@/sp4/home/Blueprint";
import { FiveSteps } from "@/sp4/home/v7/FiveSteps";
import { Recurring } from "@/sp4/home/v7/Sections";
import { Reveal } from "@/sp4/home/v7/Extras";
import { LandingMotion } from "@/sp4/home/v7/Motion";
import { KajuPresence } from "@/kaju/Presence";
import "@/sp4/sp4.css";
import "@/sp4/home/v7/landing7.css";
import "@/sp4/home/v7/motion8.css";
import "@/sp4/home/home4.css";
import "@/sp4/home/landing.css";
import "@/site6/site6.css";

export const metadata = {
  title: "StrayPaw · One record for animal health and One Health programmes",
  description: "StrayPaw connects municipalities, NGOs, hospitals and laboratories on one record: ABC and vaccination, bite care and PEP tracking, laboratory results and programme coordination.",
};

/* ════════════════════════════════════════════════════════════════════
   Homepage (StrayPaw 6, visual pass). Few words; each scene shows the
   product doing one thing:
   1 the idea (one record travels through four institutions) ·
   2 who works with it · 3 the product at work (demo, use cases) ·
   4 what we offer (the switchboard) · 5 meet Kaju · 6 who it is for ·
   7 proof and what is not connected · 8 questions · 9 next step.
   ════════════════════════════════════════════════════════════════════ */

function Words({ text }: { text: string }) {
  return <span className="s6-words">{text.split(" ").map((w, i) => <Fragment key={i}><span style={{ ["--i" as string]: i }}>{w}</span>{" "}</Fragment>)}</span>;
}

const STATUS: [string, string, string, "green" | "amber" | "blue" | undefined][] = [
  ["NGO and municipal workflows", "ABC, vaccination, evidence, review, field mode", "Live", "green"],
  ["Programme layer", "Hospitals, laboratories, coordination; tested on staging", "In rollout", "blue"],
  ["AnimalID", "Photo suggestions; accuracy not yet validated", "In rollout", "blue"],
  ["Reminders", "Logged phone calls. SMS and WhatsApp not connected", "Calls only", "amber"],
  ["Vaccine availability", "What each facility confirms. No stock system connected", "Confirmed by people", "amber"],
  ["Ward maps", "Official ward boundaries loaded when a city supplies them", "Per city", "amber"],
];

const FAQ: [string, string][] = [
  ["Is this only for Bengaluru, or only for rabies?", "No. A programme is configured, not coded: its partners, areas, modules, vaccination target and settings are chosen at setup. A municipality running ABC alone and a state coordinating several cities use the same product."],
  ["Who can see patient information?", "Only staff at the facility that treats the person. A patient is identified by that facility's own register number; no name is stored. Other partners see counts, and counts below a threshold are hidden."],
  ["Does StrayPaw decide treatment?", "Never. A clinician records the exposure category they assessed, writes the regimen and sets each dose date. StrayPaw keeps the record, shows what is due and logs who did what."],
  ["Can an NGO start without a programme?", "Yes. An NGO registers itself, imports its register and runs its own work. If its city starts a programme later, the NGO joins it with its existing records and people."],
  ["What does Kaju do, exactly?", "Kaju reads the records you are allowed to see, finds gaps, and prepares work: a draft case from a field message, a missing-evidence list, the monthly package. It cites its sources and changes nothing until a person confirms. It has no access to human-health records."],
  ["How do we start?", "Book a demo, or try the guided demonstration with illustrative records. A pilot starts with one programme, its partners and a few areas."],
];

export default function Home() {
  const partners = fieldPartnerStrip();
  const results = STORIES.flatMap((s) => s.results.slice(0, 1).map((r) => ({ ...r, org: s.name, city: s.city, rel: RELATIONSHIP_LABEL[s.relationship], slug: s.slug }))).filter((r) => r.n > 0).slice(0, 2);
  const primary = DEMO_SITE ? { href: "/try?go=1", label: "Start the live demo" } : { href: "/demo", label: "Book a demo" };
  return (
    <div className="s6 s6-home">
      <PageView name="landing_view" />
      <SiteMotion />
      <SiteHeader />
      <main id="main">
        {/* 1 · hero */}
        <section className="s6-hero" aria-labelledby="s6-h1" data-spot>
          <HeroThread />
          <div className="s6-wrap">
            <div className="s6-hero-copy">
              <Link href={DEMO_SITE ? "/today" : "/platform"} className="s6-announce"><b>New</b><span>{DEMO_SITE ? "You are on the demonstration: every record is illustrative" : "Hospitals, laboratories and programme cells now work in StrayPaw"}</span><i aria-hidden><ArrowRight size={13} /></i></Link>
              <h1 id="s6-h1" className="s6-display"><Words text="One record for every animal," /><br /><span className="s6-grey"><Words text="bite, dose and sample." /></span></h1>
              <p className="s6-lede">The operating platform for animal health and One Health programmes.</p>
              <div className="s6-hero-cta">
                <Link href={primary.href} className="s6-btn is-primary">{primary.label}<ArrowRight size={16} className="go" aria-hidden /></Link>
                {DEMO_SITE ? <Link href="/today" className="s6-btn is-line">Choose a role</Link> : LIVE_DEMO_PUBLIC ? <a href={LIVE_DEMO_URL} className="s6-btn is-line">Try the live demo</a> : <Link href="#product" className="s6-btn is-line">See the product at work</Link>}
              </div>
              <p className="s6-hero-note">Built with field teams in Coimbatore and Chennai.</p>
            </div>
            <HeroBand />
            <div data-tilt><Relay /></div>
          </div>
        </section>

        {/* 2 · who already works with it */}
        <section className="s6-partners" aria-label="Field partners">
          <div className="s6-wrap s6-partners-in">
            <span>Working with</span>
            <ul>{partners.slice(0, 6).map((p) => <li key={p.name}>{p.name}<small>{p.city}</small></li>)}</ul>
            <Link href="/customers" className="s6-textlink" style={{ marginLeft: "auto", fontSize: 14 }}>How each one works with us<ArrowRight size={14} aria-hidden /></Link>
          </div>
        </section>

        {/* The product at work: the animated workspace, then the five use cases, each a full product screen. */}
        <section className="s6-sec" aria-labelledby="s6-product-h" id="product">
          <div className="s6-wrap">
            <div className="s6-head" data-reveal style={{ marginInline: "auto", textAlign: "center", justifyItems: "center" }}><span className="s6-kicker">The product at work</span><h2 id="s6-product-h" className="s6-h2">A coordinator&apos;s morning, <span className="s6-grey">start to finish.</span></h2></div>
          </div>
          <div className="s4 s4-page s6-home s7-home s6-legacy">
            <Reveal />
            <LandingMotion />
            <div className="s4-wrap s6-center">
              <div className="s6-canvas">
                <Blueprint tone="dark" />
                <div className="s4-hero-stage s6-stage">
                  <span className="s4-hero-perch" aria-hidden><KajuPresence sequence="perch" loop size={112} /></span>
                  <HeroDemo />
                </div>
              </div>
            </div>
            <FiveSteps />
            <Recurring />
          </div>
        </section>

        {/* 4 · what we offer: the switchboard */}
        <section className="s6-sec is-fill" id="offer" aria-labelledby="s6-offer-h">
          <div className="s6-wrap">
            <div className="s6-head" data-reveal><span className="s6-kicker">What we offer</span><h2 id="s6-offer-h" className="s6-h2">Switch on what your programme does. <span className="s6-grey">Leave the rest off.</span></h2></div>
            <div data-reveal><Switchboard /></div>
          </div>
        </section>

        {/* 5 · meet Kaju */}
        <section className="s6-sec" id="kaju" aria-labelledby="s6-kaju-h">
          <div className="s6-wrap s6-kaju">
            <div data-reveal>
              <span className="s6-kicker"><Sparkles size={14} aria-hidden style={{ marginLeft: -6 }} />Meet Kaju</span>
              <h2 id="s6-kaju-h" className="s6-h2" style={{ margin: "16px 0" }}>Kaju prepares. <span className="s6-grey">People approve.</span></h2>
              <p className="s6-lede">He finds what is missing and drafts the next piece of work. Nothing changes without a yes.</p>
              <div className="s6-traits"><span className="s6-chip" data-tone="blue">Cites every source</span><span className="s6-chip">Works inside your permissions</span><span className="s6-chip">No access to patient records</span></div>
              <Link href="/ai" className="s6-textlink" style={{ marginTop: 22 }}>Meet Kaju<ArrowRight size={15} aria-hidden /></Link>
            </div>
            <div data-reveal><KajuScene /></div>
          </div>
        </section>

        {/* 6 · who it is for */}
        <section className="s6-sec is-fill" id="roles" aria-labelledby="s6-roles-h">
          <div className="s6-wrap">
            <div className="s6-head" data-reveal><span className="s6-kicker">Who it&rsquo;s for</span><h2 id="s6-roles-h" className="s6-h2">One place. <span className="s6-grey">Every role sees its own work.</span></h2></div>
            <div data-reveal><Roles /></div>
          </div>
        </section>

        {/* 7 · proof, and what is not connected */}
        <section className="s6-sec" id="trust" aria-labelledby="s6-trust-h">
          <div className="s6-wrap">
            <div className="s6-head" data-reveal><span className="s6-kicker">Proof</span><h2 id="s6-trust-h" className="s6-h2">Honest about what is live.</h2></div>
            <div className="s6-proof">
              <div className="s6-proof-nums">
                {results.map((r) => <Link href={`/customers/${r.slug}`} key={r.org} data-reveal><span className="n"><span data-count={r.n}>{r.n.toLocaleString("en-IN")}</span></span><b style={{ color: "var(--ink)" }}>{r.label}</b><small>{r.org} · {r.city} · {r.rel}</small></Link>)}
                <p data-reveal><Link href="/security" className="s6-textlink">Security and data governance<ArrowRight size={15} aria-hidden /></Link></p>
              </div>
              <div className="s6-status" data-reveal aria-label="What is live and what is not connected">
                {STATUS.map(([a, b, c, tone]) => <div className="s6-status-row" key={a}><b>{a}</b><span>{b}</span><span className="s6-chip" data-tone={tone}>{c}</span></div>)}
              </div>
            </div>
          </div>
        </section>

        {/* 9 · questions */}
        <section className="s6-sec" id="questions" aria-labelledby="s6-faq-h">
          <div className="s6-wrap s6-split">
            <div className="s6-head" data-reveal><h2 id="s6-faq-h" className="s6-h2">Questions</h2><p className="s6-lede"><Link href="/contact" className="s6-textlink">Ask us anything else</Link></p></div>
            <div className="s6-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}<Plus size={20} aria-hidden /></summary><p>{a}</p></details>)}</div>
          </div>
        </section>

        {/* 10 · next step */}
        <section className="s6-sec is-tight" aria-label="Get started">
          <div className="s6-wrap">
            <div className="s6-close" data-reveal>
              <CloseThread />
              <h2 className="s6-h2">Start with one programme.</h2>
              <p className="s6-lede" style={{ color: "#b9c4d8" }}>We set it up with you. Your registers come with you.</p>
              <div className="s6-hero-cta" style={{ justifyContent: "flex-start" }}>
                <Link href={primary.href} className="s6-btn is-primary">{primary.label}<ArrowRight size={16} className="go" aria-hidden /></Link>
                <Link href="/pricing" className="s6-btn is-line">See pricing</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
