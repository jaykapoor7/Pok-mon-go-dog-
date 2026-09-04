import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { ChipScroll } from "@/components/site/ChipScroll";
import { Reveal } from "@/components/site/Reveal";
import {
  UNIT_COSTS,
  COVERAGE_TARGET,
  inr,
  num,
} from "@/lib/platform/network";

/* Goa is one of the few states publishing both a population and an ABC
   coverage figure, which is what makes a fully-sourced worked example
   possible at all. Both numbers come from datasets.ts. */
const GOA_POPULATION = 85_000;
const GOA_COVERAGE = 0.6;
const GOA_ANIMALS = Math.round(
  GOA_POPULATION * (COVERAGE_TARGET.value - GOA_COVERAGE)
);
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
    cta: "Scope and cost a programme",
    href: "/what-would-it-take",
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
              <span>gets a clear record.&rdquo;</span>
            </div>
          </Reveal>
          <Reveal delay={120}>
            {/* A worked example rather than an invented one: every figure is
                a real published number for Goa, and the arithmetic is the
                same calculation the costing tool runs. It shows the shape a
                closed record takes without claiming a programme happened. */}
            <div className="sp-record-card">
              <div className="sp-record-top">
                <span>STRAYPAW / OUTCOME RECORD</span>
                <span>WORKED EXAMPLE</span>
              </div>
              <div className="sp-record-main">
                <div className="sp-seal">
                  <Check size={22} />
                  <span>
                    FORMAT
                    <br />
                    v1
                  </span>
                </div>
                <div>
                  <h3>Goa to the {Math.round(COVERAGE_TARGET.value * 100)}% threshold.</h3>
                  <p>
                    Goa publishes both a population and a coverage figure — one
                    of the few states that does. Closing the gap to the
                    threshold at which sterilisation actually suppresses
                    population growth is {num(GOA_ANIMALS)} animals, and this is
                    the record that work would close with.
                  </p>
                </div>
              </div>
              <div className="sp-record-metrics">
                <div>
                  <b className="field">Geography</b>
                  <span>Goa · 85,000 community dogs (2025 est.)</span>
                </div>
                <div>
                  <b className="field">Reach</b>
                  <span>
                    {num(GOA_ANIMALS)} animals · {Math.round(GOA_COVERAGE * 100)}% →{" "}
                    {Math.round(COVERAGE_TARGET.value * 100)}%
                  </span>
                </div>
                <div>
                  <b className="field">Funding</b>
                  <span>
                    {inr(GOA_ANIMALS * UNIT_COSTS.sterilisation.value)} at{" "}
                    {inr(UNIT_COSTS.sterilisation.value)}/animal
                  </span>
                </div>
                <div>
                  <b className="field">Verification</b>
                  <span>Coverage re-measured against the 2024 baseline</span>
                </div>
              </div>
              <div className="sp-record-foot">
                <span>
                  EVERY FIGURE SOURCED · AWBI CEILING {UNIT_COSTS.sterilisation.year} ·
                  GOA ABC PROGRAMME 2024
                </span>
                <Link href="/what-would-it-take" className="sp-record-link">
                  COST YOUR OWN <ArrowUpRight size={13} />
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
                <Link href="/what-would-it-take" className="sp-btn sp-btn-primary">
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
