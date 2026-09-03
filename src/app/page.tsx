import { Fragment } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { MapConsole } from "@/components/site/MapConsole";
import { Reveal } from "@/components/site/Reveal";
import {
  Constellation,
  CoverageGap,
  DogGlyph,
  GridPlane,
  OutcomeSeal,
  RadarPulse,
  RouteThread,
  StudySchematic,
  TopoLines,
} from "@/components/site/vectors";
import {
  DELHI_ABC_COVERAGE,
  DELHI_POPULATION,
  UNIT_COSTS,
  inr,
  num,
} from "@/lib/platform/network";
import "@/components/site/site.css";

export const metadata = {
  title: "StrayPaw — Make care measurable",
  description:
    "The infrastructure connecting funding, evidence and action across India's street-animal ecosystem. Companies fund the questions. NGOs find the answers on the ground.",
};

/* The core network: every record keeps its provenance. Each stage carries a
   drawn mark rather than a stock icon — the animal, the sweep that finds it,
   the study it feeds, the outcome that closes it. */
const NETWORK = [
  { n: "01", Art: DogGlyph, title: "Animal", sub: "the original signal" },
  { n: "02", Art: RadarPulse, title: "Location", sub: "where it happened" },
  { n: "03", Art: StudySchematic, title: "Study", sub: "what we learn" },
  { n: "04", Art: OutcomeSeal, title: "Outcome", sub: "what changed" },
];

/* The commercial wedge, in three moves. */
const FLOW = [
  {
    n: "01",
    icon: "₹",
    tag: "CSR",
    title: "Fund a study",
    body: "A company defines an impact objective and a geography. StrayPaw turns that question into a scoped, costed study with a named partner.",
  },
  {
    n: "02",
    icon: "◎",
    tag: "DATA",
    title: "Collect evidence",
    body: "Partner NGOs run the fieldwork. Our study layer structures what they gather — observations, records, coverage, ground truth.",
  },
  {
    n: "03",
    icon: "→",
    tag: "ACTION",
    title: "Fund the response",
    body: "The evidence points to a specific intervention, with an owner, a budget, milestones, and a measurable finish line.",
  },
];

export default function HomePage() {
  return (
    <div className="sp">
      <SiteHeader />

      <main>
        <Hero />

        {/* ── THESIS ─────────────────────────────────────────────── */}
        <section className="sp-thesis" id="why">
          <TopoLines className="sp-topo" />
          <Reveal>
            <div className="sp-kicker">
              THE GAP IS NOT INTENT. <span>IT&apos;S COORDINATION.</span>
            </div>
          </Reveal>
          <div className="sp-thesis-grid">
            <Reveal>
              <h2 className="sp-display">
                Fund the <em>question</em>.
                <br />
                Measure the <em>answer</em>.
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <div className="sp-thesis-body">
                <p>
                  Companies have CSR budgets. NGOs have local knowledge. Government
                  has scale. What is missing is the shared evidence layer between
                  them.
                </p>
                <p>
                  StrayPaw turns a vague ambition — &ldquo;help more animals in
                  Delhi&rdquo; — into a study, a partner, a budget, an intervention,
                  and a record of what changed.
                </p>
                <a href="#companies" className="sp-link">
                  The CSR initiative, end to end <ChevronRight size={16} />
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── NETWORK ────────────────────────────────────────────── */}
        <section className="sp-network" id="network">
          <div className="sp-network-head">
            <Reveal>
              <div>
                <div className="sp-kicker light">A LIVING DATA LAYER</div>
                <h2 className="sp-display" style={{ marginTop: 18 }}>
                  One animal.
                  <br />
                  <span>One system.</span>
                </h2>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <p>
                Every signal is connected to a place, a study, an organisation, a
                need, a fund, and an outcome. Nothing disappears into a PDF.
              </p>
            </Reveal>
          </div>

          <div className="sp-network-line">
            {NETWORK.map(({ n, Art, title, sub }, i) => (
              <Fragment key={n}>
                <Reveal delay={i * 90}>
                  <div className={`sp-node ${i === 0 ? "active" : ""}`}>
                    <span className="sp-node-index">{n}</span>
                    <Art className="sp-node-art" size={92} />
                    <b>{title}</b>
                    <small>{sub}</small>
                  </div>
                </Reveal>
                {i < NETWORK.length - 1 && <span className="sp-connector" />}
              </Fragment>
            ))}
          </div>

          <div className="sp-network-caption sp-mono">
            <span>THE CORE NETWORK / RECORDS NEVER LOSE THEIR PROVENANCE</span>
            <span>→</span>
          </div>

          <GridPlane className="sp-plane" />
        </section>

        {/* ── EVIDENCE GAPS ──────────────────────────────────────── */}
        <section className="sp-gaps">
          <RouteThread className="sp-divider" />
          <Reveal>
            <div className="sp-kicker" style={{ marginTop: 40 }}>
              WHAT IS KNOWN. <span>AND WHAT IS NOT.</span>
            </div>
          </Reveal>
          <div className="sp-gaps-grid">
            <Reveal>
              <figure className="sp-gap-card">
                <Constellation className="sp-gap-art" size={132} />
                <figcaption>
                  <h3>Evidence</h3>
                  <p>
                    Observations that corroborate become a record: a place, a
                    count, a condition, a date, an organisation that can act on
                    it.
                  </p>
                </figcaption>
              </figure>
            </Reveal>
            <Reveal delay={120}>
              <figure className="sp-gap-card gap">
                <CoverageGap className="sp-gap-art" size={132} />
                <figcaption>
                  <h3>Gaps</h3>
                  <p>
                    The absence is data too. A district with no sterilisation
                    record is not a district without need — it is a district
                    nobody has surveyed.
                  </p>
                </figcaption>
              </figure>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p className="sp-gaps-note">
              StrayPaw treats the second as a product surface, not a footnote.
              Gaps are where studies get scoped and funding gets pointed.
            </p>
          </Reveal>
        </section>

        {/* ── LIVING MAP ─────────────────────────────────────────── */}
        <section className="sp-mapsec" id="map">
          <div className="sp-map-intro">
            <Reveal>
              <div>
                <div className="sp-kicker">EXPLORE THE EVIDENCE LAYER</div>
                <h2 className="sp-display" style={{ marginTop: 18 }}>
                  The map is not
                  <br />
                  <span>the product.</span>
                </h2>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <p>
                It is the interface for asking a better question. Zoom from a city to
                a cluster. See what is known, what is missing, and who can execute.
              </p>
            </Reveal>
          </div>
          <Reveal>
            <MapConsole />
          </Reveal>
        </section>

        {/* ── COMPANIES ──────────────────────────────────────────── */}
        <section className="sp-companies" id="companies">
          <div className="sp-company-lead">
            <Reveal>
              <div>
                <div className="sp-kicker">FOR CSR TEAMS WITH A HIGHER BAR</div>
                <h2 className="sp-display">
                  Don&apos;t just fund
                  <br />
                  an NGO.
                </h2>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div>
                <p>
                  Fund an evidence-backed intervention — and know what happened
                  after.
                </p>
                <Link href="/partner-apply" className="sp-btn sp-btn-primary">
                  Start a CSR initiative <ArrowUpRight size={16} />
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="sp-flow">
            {FLOW.map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div className="sp-flow-item">
                  <div className="sp-flow-num">{s.n}</div>
                  <div className="sp-flow-icon">{s.icon}</div>
                  <div className="sp-flow-copy">
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                  <div className="sp-flow-tag">{s.tag}</div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="sp-proof">
              <div className="sp-proof-num">{inr(UNIT_COSTS.sterilisation.value)}</div>
              <div>
                <span>PER STERILISATION</span>
                <p>
                  AWBI-notified ceiling, ABC (Dogs) Rules{" "}
                  {UNIT_COSTS.sterilisation.year}
                </p>
              </div>
              <div className="sp-proof-div" />
              <div className="sp-proof-num">
                {Math.round(DELHI_ABC_COVERAGE.value * 100)}%
              </div>
              <div>
                <span>OF DELHI STERILISED</span>
                <p>
                  across ~{num(DELHI_POPULATION.value)} community dogs
                  ({DELHI_ABC_COVERAGE.year} survey)
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── OUTCOME RECORD ─────────────────────────────────────── */}
        <section className="sp-record">
          <Reveal>
            <div className="sp-record-quote">
              &ldquo;Every funded action
              <br />
              <span>gets a clear record.</span>&rdquo;
            </div>
          </Reveal>
          <Reveal delay={120}>
            {/* Deliberately shows the empty register rather than a sample
                record. A funder has to be able to trust that every row here
                happened; a plausible example would destroy that. */}
            <div className="sp-record-card">
              <div className="sp-record-top">
                <span>STRAYPAW / OUTCOME REGISTER</span>
                <span>0 RECORDS</span>
              </div>
              <div className="sp-record-main">
                <div className="sp-seal empty">
                  <Check size={22} />
                  <span>
                    AWAITING
                    <br />
                    FIRST
                  </span>
                </div>
                <div>
                  <h3>Nothing has closed yet.</h3>
                  <p>
                    No study has been commissioned, so no intervention has run
                    and no outcome exists. This register stays empty until one
                    does — we don&apos;t seed it with examples.
                  </p>
                </div>
              </div>
              <div className="sp-record-metrics">
                {[
                  ["Geography", "where it happened"],
                  ["Reach", "animals treated, not targeted"],
                  ["Funding", "amount and funder"],
                  ["Verification", "who checked, and when"],
                ].map(([f, d]) => (
                  <div key={f}>
                    <b className="field">{f}</b>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
              <div className="sp-record-foot">
                <span>EVERY CLOSED RECORD WILL CARRY ALL FOUR</span>
                <Link href="/outcomes" className="sp-record-link">
                  SEE THE FORMAT <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── PARTNERS ───────────────────────────────────────────── */}
        <section className="sp-partners" id="partners">
          <Reveal>
            <div className="sp-kicker">FOR THE PEOPLE DOING FIELDWORK</div>
          </Reveal>
          <div className="sp-partners-grid">
            <Reveal>
              <h2 className="sp-display">
                Local knowledge
                <br />
                <em>is the edge.</em>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <div>
                <p>
                  StrayPaw does not replace NGOs. We give them the study brief, the
                  data tools, the project context, and a durable record of the work
                  they already know how to do.
                </p>
                <Link href="/partner" className="sp-link">
                  See the NGO workspace <ChevronRight size={16} />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────── */}
        <footer className="sp-footer">
          <div className="sp-footer-grid">
            <Reveal>
              <div>
                <div className="sp-kicker light">THE INFRASTRUCTURE LAYER</div>
                <h2 className="sp-display">
                  Start with one animal.
                  <br />
                  <span>Reveal the system.</span>
                </h2>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="sp-footer-actions">
                <Link href="/partner-apply" className="sp-btn sp-btn-primary">
                  Fund a study <ArrowUpRight size={16} />
                </Link>
                <Link href="/map" className="sp-btn sp-btn-outline-light">
                  Explore the network <ArrowUpRight size={16} />
                </Link>
              </div>
            </Reveal>
          </div>
          <div className="sp-footer-bottom sp-mono">
            <span>STRAYPAW © 2026</span>
            <span style={{ display: "flex", gap: 18 }}>
              <Link href="/about">ABOUT</Link>
              <Link href="/privacy">PRIVACY</Link>
              <Link href="/terms">TERMS</Link>
              <Link href="/contact">CONTACT</Link>
            </span>
            <span>BUILT IN INDIA / FOR EVERYWHERE</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
