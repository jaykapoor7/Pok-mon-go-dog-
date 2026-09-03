import { Fragment } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  FileText,
  Fingerprint,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { MapConsole } from "@/components/site/MapConsole";
import { Reveal } from "@/components/site/Reveal";
import "@/components/site/site.css";

export const metadata = {
  title: "StrayPaw — Make care measurable",
  description:
    "The infrastructure connecting funding, evidence and action across India's street-animal ecosystem. Companies fund the questions. NGOs find the answers on the ground.",
};

/* The core network: every record keeps its provenance. */
const NETWORK = [
  { n: "01", Icon: Fingerprint, title: "Animal", sub: "the original signal" },
  { n: "02", Icon: MapPin, title: "Location", sub: "where it happened" },
  { n: "03", Icon: FileText, title: "Study", sub: "what we learn" },
  { n: "04", Icon: ShieldCheck, title: "Outcome", sub: "what changed" },
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
            {NETWORK.map(({ n, Icon, title, sub }, i) => (
              <Fragment key={n}>
                <Reveal delay={i * 90}>
                  <div className={`sp-node ${i === 0 ? "active" : ""}`}>
                    <span className="sp-node-index">{n}</span>
                    <Icon size={22} />
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
              <div className="sp-proof-num">₹12.8L</div>
              <div>
                <span>ONE INITIATIVE / DELHI NCR</span>
                <p>budget assigned across study + response</p>
              </div>
              <div className="sp-proof-div" />
              <div className="sp-proof-num">100%</div>
              <div>
                <span>MONEY → RECORD</span>
                <p>every funded action retained in the evidence layer</p>
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
            <div className="sp-record-card">
              <div className="sp-record-top">
                <span>STRAYPAW / OUTCOME RECORD</span>
                <span>SP-OUT-024</span>
              </div>
              <div className="sp-record-main">
                <div className="sp-seal">
                  <Check size={22} />
                  <span>
                    VERIFIED
                    <br />
                    OUTCOME
                  </span>
                </div>
                <div>
                  <h3>Rohini sterilisation cluster</h3>
                  <p>
                    Study signal → partner NGO → funded intervention → post-field
                    verification.
                  </p>
                </div>
              </div>
              <div className="sp-record-metrics">
                <div>
                  <b>24</b>
                  <span>animals reached</span>
                </div>
                <div>
                  <b>₹3.4L</b>
                  <span>allocated</span>
                </div>
                <div>
                  <b>86%</b>
                  <span>confidence</span>
                </div>
                <div>
                  <b>12.08.26</b>
                  <span>closed</span>
                </div>
              </div>
              <div className="sp-record-foot">
                <span>METHOD / FIELD + PHOTO + NGO LOG + GEO</span>
                <span>
                  VIEW PROVENANCE <ArrowUpRight size={13} />
                </span>
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
