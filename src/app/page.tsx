import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { ChipScroll } from "@/components/site/ChipScroll";
import { Reveal } from "@/components/site/Reveal";
import {
  UNIT_COSTS,
  inr,
} from "@/lib/platform/network";
import "@/components/site/site.css";

export const metadata = {
  title: "StrayPaw — Infrastructure for street-animal management",
  description:
    "StrayPaw builds the infrastructure layer that makes community-animal populations identifiable, observable, and actionable. Every animal an identity. Every intervention an outcome.",
};

const LOOP_STAGES = [
  {
    n: "01",
    label: "SEE",
    body: "Community reporters, field teams, and municipal sweeps create the first signal.",
  },
  {
    n: "02",
    label: "IDENTIFY",
    body: "Each animal gets a persistent identity — chip, record, and location history.",
  },
  {
    n: "03",
    label: "UNDERSTAND",
    body: "Sightings become studies. Studies reveal coverage, need, and opportunity.",
  },
  {
    n: "04",
    label: "ACT",
    body: "Prioritised interventions — sterilisation, vaccination, treatment — with a named owner.",
  },
  {
    n: "05",
    label: "TRACK",
    body: "Every action posts to the animal's record. No work disappears into a PDF.",
  },
  {
    n: "06",
    label: "MEASURE",
    body: "Outcomes close the loop. Coverage countable. Funding accountable.",
  },
];

const AUDIENCES = [
  {
    tag: "NGOS / FIELD TEAMS",
    title: "Better tools.\nSame fieldwork.",
    body: "StrayPaw gives field organisations the study brief, data tooling, and a durable record of work they already know how to do. Every ABC run, every vaccination — logged and connected.",
    cta: "See the field workspace",
    href: "/partner",
  },
  {
    tag: "GOVERNMENT / ULBs",
    title: "Coverage that's\ncountable.",
    body: "Commission population surveys, track sterilisation programme reach, and identify gaps — without waiting for an annual report. The data is live.",
    cta: "Explore the evidence layer",
    href: "/gaps",
  },
  {
    tag: "FUNDERS / CSR",
    title: "Fund an outcome,\nnot a hope.",
    body: `Define an impact objective and a geography. StrayPaw turns it into a scoped study, a named NGO partner, a budget, and a measurable finish line. Unit cost: ${inr(UNIT_COSTS.sterilisation.value)} per sterilisation (AWBI ceiling, ${UNIT_COSTS.sterilisation.year}).`,
    cta: "Start a programme",
    href: "/partner-apply",
  },
];

export default function HomePage() {
  return (
    <div className="sp">
      <SiteHeader />

      <main>
        <Hero />

        {/* ── SYSTEM LOOP ───────────────────────────────────────── */}
        <section className="sp-loop" id="how">
          <Reveal>
            <div className="sp-kicker">
              THE INFRASTRUCTURE LOOP.{" "}
              <span>SEE → IDENTIFY → ACT → MEASURE → REPEAT.</span>
            </div>
          </Reveal>
          <div className="sp-loop-grid">
            <Reveal>
              <h2 className="sp-display sp-loop-heading">
                Give every animal
                <br />
                <span>an identity.</span>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="sp-loop-body">
                StrayPaw builds the shared infrastructure that connects
                funding, evidence, and action across India&rsquo;s
                street-animal ecosystem. Not a reporting app. Not a charity
                platform. An operating layer that makes populations
                identifiable, observable, and manageable.
              </p>
            </Reveal>
          </div>
          <div className="sp-loop-stages">
            {LOOP_STAGES.map((s, i) => (
              <Reveal key={s.n} delay={i * 55}>
                <div className="sp-loop-stage">
                  <span className="sp-mono sp-loop-n">{s.n}</span>
                  <b className="sp-loop-label">{s.label}</b>
                  <p className="sp-loop-desc">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── CHIP + IDENTITY ─────────────────────────────────────── */}
        <ChipScroll />

        {/* ── WHO IT'S FOR ────────────────────────────────────────── */}
        <section className="sp-for" id="for">
          <div className="sp-for-head">
            <Reveal>
              <div className="sp-kicker light">
                BUILT FOR THE WHOLE SYSTEM
              </div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="sp-display sp-for-heading">
                One platform.
                <br />
                <span>Three stakeholders.</span>
              </h2>
            </Reveal>
          </div>
          <div className="sp-for-grid">
            {AUDIENCES.map((a, i) => (
              <Reveal key={a.tag} delay={i * 80}>
                <div className="sp-for-card">
                  <div className="sp-for-tag">{a.tag}</div>
                  <h3 className="sp-for-title">
                    {a.title.split("\n").map((line, j) => (
                      <span key={j}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </h3>
                  <p className="sp-for-body">{a.body}</p>
                  <Link href={a.href} className="sp-for-link">
                    {a.cta} <ArrowUpRight size={12} />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── OUTCOME RECORD ──────────────────────────────────────── */}
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
                record. A funder has to trust that every row here happened;
                a plausible example would destroy that. */}
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

        {/* ── FOOTER ──────────────────────────────────────────────── */}
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
                  Fund a programme <ArrowUpRight size={16} />
                </Link>
                <Link href="/app" className="sp-btn sp-btn-outline-light">
                  Open the console <ArrowUpRight size={16} />
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
