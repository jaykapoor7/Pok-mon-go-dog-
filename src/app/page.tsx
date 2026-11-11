import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight, ArrowUpRight, ClipboardCheck, Fingerprint, FlaskConical, GraduationCap, MapPinned, Plus, ShieldCheck, Sparkles, Stethoscope, Syringe } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { STORIES, RELATIONSHIP_LABEL, fieldPartnerStrip } from "@/sp3/customers";
import { DEMO_SITE, LIVE_DEMO_PUBLIC, LIVE_DEMO_URL } from "@/lib/demo-site";
import { Relay } from "@/site6/Relay";
import { Roles } from "@/site6/Roles";
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
   Homepage (StrayPaw 6), in the order a buyer asks questions:
   1 what is it (hero, the relay) · 2 who already works with it ·
   3 what does my role see · 4 how does work pass between institutions ·
   5 what is in it · 6 what does Kaju do · 7 can I trust it, and what is
   not connected · 8 results on record · 9 questions · 10 next step.
   ════════════════════════════════════════════════════════════════════ */

function Words({ text }: { text: string }) {
  return <span className="s6-words">{text.split(" ").map((w, i) => <Fragment key={i}><span style={{ ["--i" as string]: i }}>{w}</span>{" "}</Fragment>)}</span>;
}

const LOOP = [
  { t: "A bite is recorded where the person is treated", d: "A one-minute desk form at the hospital or health centre. The clinician records the category they assessed and the dates they set; StrayPaw records, it never decides.", who: ["Hospital", "Clinician", "Nurse"] },
  { t: "The area's field team is asked to find the animal", d: "A request goes to the NGO that covers that area, with the animal's description and place. Patient details never leave the facility.", who: ["NGO", "Field team"] },
  { t: "A sample reaches the laboratory with its custody intact", d: "Every hand the sample passes through is recorded. The laboratory reports the result with its method; a positive reaches the sender and the programme at once.", who: ["Laboratory", "NGO"] },
  { t: "The programme sees what needs a decision", d: "A confirmed case, a centre without vaccine, doses past their date, coverage below target: each alert names the record it came from and who has seen it.", who: ["Programme cell", "Municipal division"] },
  { t: "The work is reported once, for everyone", d: "The same record feeds the NGO's monthly claim, the municipal review, the programme report and the research extract, with small human counts hidden.", who: ["Municipal review", "Funders", "Researchers"] },
];

const CAPS = [
  { Icon: Syringe, t: "ABC and vaccination operations", d: "Capture, surgery, vaccination and release on one record per animal, with the evidence attached.", href: "/abc-operations" },
  { Icon: ClipboardCheck, t: "Verification and claims", d: "The municipal office reviews each submission animal by animal. Acceptance is recorded; it is not payment.", href: "/abc-operations#report" },
  { Icon: Stethoscope, t: "Bite care and PEP tracking", d: "A bite register per facility, doses due and overdue, reminder and completion calls, all under clinical control.", href: "/platform#bite-care" },
  { Icon: MapPinned, t: "Care network and referrals", d: "Where vaccine, immunoglobulin and wound washing are available, as each facility last confirmed, and where each refers.", href: "/platform#network" },
  { Icon: FlaskConical, t: "Laboratory surveillance", d: "Samples, chain of custody and results across dogs, cats, cattle and wildlife.", href: "/platform#laboratory" },
  { Icon: ShieldCheck, t: "Coverage and alerts", d: "Vaccination against the target by area, shown only where a population estimate exists.", href: "/platform#coverage" },
  { Icon: Fingerprint, t: "AnimalID", d: "Photo-based suggestions for whether an animal is already on your register. A person always decides.", href: "/platform#animalid" },
  { Icon: GraduationCap, t: "Training", d: "Sessions by audience and institution, and courses your team completes in the product.", href: "/learn" },
];

const STATUS: [string, string, string, "green" | "amber" | "blue" | undefined][] = [
  ["NGO and municipal workflows", "ABC, vaccination, evidence, municipal review, contracts, field mode", "Live", "green"],
  ["Programme layer", "Hospitals, laboratories, coordination, alerts and the care network; tested on our staging system", "In rollout", "blue"],
  ["AnimalID", "Photo suggestions inside identity review; accuracy is not yet validated on a labelled dataset", "In rollout", "blue"],
  ["Reminders", "Logged phone calls from the clinic. SMS and WhatsApp are not connected", "Calls only", "amber"],
  ["Vaccine availability", "What each facility confirms, with its date. No stock system is connected", "Confirmed by people", "amber"],
  ["Ward maps", "Places are mapped; official ward boundaries are loaded per city when supplied", "Per city", "amber"],
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
              <p className="s6-lede">StrayPaw is the operating platform for animal health and One Health programmes. Municipalities, NGOs, hospitals and laboratories each do their own work; the record connects it.</p>
              <div className="s6-hero-cta">
                <Link href={primary.href} className="s6-btn is-primary">{primary.label}<ArrowRight size={16} className="go" aria-hidden /></Link>
                {DEMO_SITE ? <Link href="/today" className="s6-btn is-line">Choose a role</Link> : LIVE_DEMO_PUBLIC ? <a href={LIVE_DEMO_URL} className="s6-btn is-line">Try the live demo</a> : <Link href="#product" className="s6-btn is-line">See the product at work</Link>}
              </div>
              <p className="s6-hero-note">Built with field teams in Coimbatore and Chennai. Designed around a city-wide rabies elimination programme.</p>
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

        {/* 3 · roles */}
        <section className="s6-sec" aria-labelledby="s6-roles-h">
          <div className="s6-wrap">
            <div className="s6-head" data-reveal><span className="s6-kicker">One product, every role</span><h2 id="s6-roles-h" className="s6-h2">Everyone opens the same place. <span className="s6-grey">Each sees their own work.</span></h2><p className="s6-lede">Today is the first screen for every role: what is waiting, what changed, and what to do next.</p></div>
            <div data-reveal><Roles /></div>
          </div>
        </section>

        {/* 4 · the loop */}
        <section className="s6-sec is-ink" id="loop" aria-labelledby="s6-loop-h">
          <div className="s6-wrap s6-split">
            <div className="s6-head" data-reveal><span className="s6-kicker" style={{ color: "#8fb1ff" }}>How work passes between institutions</span><h2 id="s6-loop-h" className="s6-h2">A bite is not one organisation&apos;s problem. <span style={{ color: "#7f8fae" }}>So it is not one organisation&apos;s record.</span></h2><p className="s6-lede" style={{ color: "#9fb0cc" }}>Five steps, five kinds of institution, one record. Each sees only what its role allows.</p></div>
            <ol className="s6-loop" data-progress>
              {LOOP.map((s, i) => (
                <li className="s6-step" key={s.t} data-step data-reveal>
                  <i aria-hidden>{i + 1}</i>
                  <div><h3 className="s6-h3">{s.t}</h3><p>{s.d}</p><div className="who">{s.who.map((w) => <span className="s6-chip" key={w}>{w}</span>)}</div></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 5 · what is in it */}
        <section className="s6-sec" aria-labelledby="s6-caps-h">
          <div className="s6-wrap">
            <div className="s6-head" data-reveal><span className="s6-kicker">What is in it</span><h2 id="s6-caps-h" className="s6-h2">Switch on what your programme does. <span className="s6-grey">Leave the rest off.</span></h2></div>
            <div className="s6-caps m-stagger">
              {CAPS.map((c) => <Link href={c.href} className="s6-cap" key={c.t} data-reveal><i aria-hidden><c.Icon size={18} /></i><div><b>{c.t}</b><p>{c.d}</p></div><ArrowUpRight size={18} aria-hidden /></Link>)}
            </div>
          </div>
        </section>

        {/* 6 · Kaju */}
        <section className="s6-sec is-fill" aria-labelledby="s6-kaju-h">
          <div className="s6-wrap s6-kaju">
            <div data-reveal>
              <span className="s6-kicker"><Sparkles size={14} aria-hidden style={{ marginLeft: -6 }} />Kaju</span>
              <h2 id="s6-kaju-h" className="s6-h2" style={{ margin: "16px 0" }}>Kaju prepares. <span className="s6-grey">People approve.</span></h2>
              <p className="s6-lede">Kaju reads the records you are allowed to see, finds what is missing and drafts the next piece of work. Every answer cites its sources. Nothing changes until a person confirms it, and the confirmation is on the audit trail.</p>
              <p style={{ marginTop: 16, fontSize: 15 }}>Kaju has no access to human-health records.</p>
              <Link href="/ai" className="s6-textlink" style={{ marginTop: 20 }}>What Kaju can do<ArrowRight size={15} aria-hidden /></Link>
            </div>
            <div className="s6-kaju-win" data-reveal aria-label="Illustration of a Kaju answer">
              <p className="s6-q">Which animals block November&apos;s package?</p>
              <div className="s6-a"><p><b>2 animals</b> cannot be submitted yet: both were released without a release photo. Everything else in the package has its evidence.</p><div className="s6-cite"><span className="s6-chip" data-tone="blue">Case ABC-2291</span><span className="s6-chip" data-tone="blue">Case ABC-2304</span><span className="s6-chip">Release evidence rule</span></div></div>
              <div className="s6-propose"><span><b>Remind the two field staff</b><br /><small style={{ color: "var(--mute)" }}>A note on each case, by name. Nothing is sent outside StrayPaw.</small></span><span className="s6-btn is-blue is-small" aria-hidden>Confirm</span></div>
              <small style={{ color: "var(--mute)" }}>Illustrative records</small>
            </div>
          </div>
        </section>

        {/* 7 · trust */}
        <section className="s6-sec" id="trust" aria-labelledby="s6-trust-h">
          <div className="s6-wrap">
            <div className="s6-head" data-reveal><span className="s6-kicker">Trust</span><h2 id="s6-trust-h" className="s6-h2">Built for institutions that answer for their records.</h2></div>
            <div className="s6-trust m-stagger">
              <div data-reveal><h3 className="s6-h3">Patient records stay at the facility</h3><p>Other partners see counts, never people. Counts below a threshold are hidden. Opening a record is logged.</p></div>
              <div data-reveal><h3 className="s6-h3">Clinical decisions belong to clinicians</h3><p>Categories, regimens and dose dates are recorded as the clinician set them. Nothing is calculated or suggested.</p></div>
              <div data-reveal><h3 className="s6-h3">Unknown is never shown as zero</h3><p>Coverage appears only against a population estimate with its method. Imported, verified and illustrative records are labelled.</p></div>
            </div>
            <div className="s6-status" data-reveal aria-label="What is live and what is not connected">
              {STATUS.map(([a, b, c, tone]) => <div className="s6-status-row" key={a}><b>{a}</b><span>{b}</span><span className="s6-chip" data-tone={tone}>{c}</span></div>)}
            </div>
            <p style={{ marginTop: 16 }} data-reveal><Link href="/security" className="s6-textlink">Security and data governance<ArrowRight size={15} aria-hidden /></Link></p>
          </div>
        </section>

        {/* 8 · results on record */}
        {results.length ? (
          <section className="s6-sec is-fill is-tight" aria-labelledby="s6-res-h">
            <div className="s6-wrap">
              <div className="s6-head" data-reveal><span className="s6-kicker">On the record</span><h2 id="s6-res-h" className="s6-h2">Figures from partner registers, with their source.</h2></div>
              <div className="s6-results m-stagger">
                {results.map((r) => <Link href={`/customers/${r.slug}`} className="s6-result" key={r.org} data-reveal><span className="s6-chip">{r.rel}</span><p className="big s6-num"><span data-count={r.n}>{r.n.toLocaleString("en-IN")}</span><small>{r.label}. {r.note}.</small></p><b style={{ color: "var(--ink)" }}>{r.org} · {r.city}</b></Link>)}
              </div>
            </div>
          </section>
        ) : null}

        {/* 9 · questions */}
        <section className="s6-sec" id="questions" aria-labelledby="s6-faq-h">
          <div className="s6-wrap s6-split">
            <div className="s6-head" data-reveal><h2 id="s6-faq-h" className="s6-h2">Questions</h2><p className="s6-lede">Short, direct answers. <Link href="/contact" className="s6-textlink">Ask us anything else</Link></p></div>
            <div className="s6-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}<Plus size={20} aria-hidden /></summary><p>{a}</p></details>)}</div>
          </div>
        </section>

        {/* 10 · next step */}
        <section className="s6-sec is-tight" aria-label="Get started">
          <div className="s6-wrap">
            <div className="s6-close" data-reveal>
              <CloseThread />
              <h2 className="s6-h2">Start with one programme and a few areas.</h2>
              <p className="s6-lede" style={{ color: "#b9c4d8" }}>We set it up with you: partners, areas, roles and the modules you need. Your existing registers come with you.</p>
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
