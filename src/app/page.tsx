import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Check,
  Eye,
  ListChecks,
  Search,
  Wrench,
  Fingerprint,
  Map as MapIcon,
  Stethoscope,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PageView } from "@/components/analytics/PageView";
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
  title: "StrayPaw, a shared record for India's street animals",
  description:
    "Every street animal gets a permanent ID and a record that follows it. Residents, field teams and municipalities write to the same map, so coverage can be counted instead of estimated.",
};

/* Said plainly and early: what the thing actually consists of, before any
   narrative about why it matters. */
const PARTS = [
  {
    Icon: Fingerprint,
    title: "Identity",
    body: "A permanent ISO code per animal, readable by scanners clinics already own.",
  },
  {
    Icon: MapIcon,
    title: "Shared map",
    body: "Residents, field teams and municipalities all write to the same map.",
  },
  {
    Icon: Stethoscope,
    title: "Field workspace",
    body: "Cases, registry, medical logs and reporting. Free for verified NGOs.",
  },
  {
    Icon: BarChart3,
    title: "Measurement",
    body: "Coverage becomes a query instead of a survey.",
  },
];

const LOOP_STAGES = [
  {
    n: "01",
    Icon: Eye,
    label: "SEE",
    body: "A resident, a field team or a municipal sweep logs the animal.",
  },
  {
    n: "02",
    Icon: Fingerprint,
    label: "IDENTIFY",
    body: "It gets a permanent code, and a record that follows it.",
  },
  {
    n: "03",
    Icon: Search,
    label: "UNDERSTAND",
    body: "Sightings become studies. Studies reveal where the need is.",
  },
  {
    n: "04",
    Icon: Wrench,
    label: "ACT",
    body: "Sterilisation, vaccination or treatment, with a named owner.",
  },
  {
    n: "05",
    Icon: ListChecks,
    label: "TRACK",
    body: "Every action posts back to the record.",
  },
  {
    n: "06",
    Icon: BarChart3,
    label: "MEASURE",
    body: "Coverage becomes countable. Funding becomes accountable.",
  },
];

const AUDIENCES = [
  {
    tag: "NGOS / FIELD TEAMS",
    title: "Better tools.\nSame fieldwork.",
    body: "The study brief, the data tooling, and a durable record of work you already know how to do.",
    cta: "See the field workspace",
    href: "/partner",
  },
  {
    tag: "GOVERNMENT / ULBs",
    title: "Coverage that's\ncountable.",
    body: "Track programme reach and find gaps without waiting for an annual report.",
    cta: "Explore the evidence layer",
    href: "/gaps",
  },
  {
    tag: "FUNDERS / CSR",
    title: "Fund an outcome,\nnot a hope.",
    body: `An objective and a geography become a scoped study, a named partner and a finish line. ${inr(UNIT_COSTS.sterilisation.value)} per sterilisation, AWBI ceiling.`,
    cta: "Scope and cost a programme",
    href: "/what-would-it-take",
  },
];

export default function HomePage() {
  return (
    <div className="sp">
      <PageView name="landing_view" />
      <SiteHeader />

      <main>
        <Hero />

        {/* ── WHAT IT IS ───────────────────────────────────────────── */}
        <section className="sp-parts">
          <Reveal>
            <div className="sp-kicker">
              FOUR PARTS. <span>ONE SYSTEM.</span>
            </div>
          </Reveal>
          <div className="sp-parts-grid">
            {PARTS.map((p, i) => (
              <Reveal key={p.title} delay={i * 60}>
                <div className="sp-part">
                  <p.Icon size={22} strokeWidth={1.5} />
                  <b>{p.title}</b>
                  <p>{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── SYSTEM LOOP ───────────────────────────────────────── */}
        <section className="sp-loop" id="how">
          <Reveal>
            <div className="sp-kicker">
              HOW ONE SIGHTING GROWS.{" "}
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
                One animal, seen once, is an anecdote. The same animal seen
                again, by someone else, months later, is a measurement.
              </p>
            </Reveal>
          </div>
          <div className="sp-loop-stages">
            {LOOP_STAGES.map((s, i) => (
              <Reveal key={s.n} delay={i * 55}>
                <div className="sp-loop-stage">
                  <span className="sp-loop-head">
                    <s.Icon size={16} strokeWidth={1.6} />
                    <span className="sp-mono sp-loop-n">{s.n}</span>
                  </span>
                  <b className="sp-loop-label">{s.label}</b>
                  <p className="sp-loop-desc">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── CHIP + IDENTITY ─────────────────────────────────────── */}
        <ChipScroll />

        {/* ── WHAT IT ADDS UP TO ───────────────────────────────────────
            Deliberately placed here and not in the hero. The visitor should
            have followed one dog through one record before being asked to
            think about what a million of them amount to; led with, the same
            idea reads as a data-platform pitch about animals. */}
        <section className="sp-thesis">
          <Reveal>
            <div className="sp-kicker">WHAT IT ADDS UP TO</div>
          </Reveal>
          <div className="sp-thesis-grid">
            <Reveal delay={80}>
              <h2 className="sp-display sp-thesis-heading">
                Every encounter
                <br />
                <span>becomes data.</span>
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <div className="sp-thesis-body">
                <p>
                  Someone stops on a street they walk every day, looks at a dog
                  they have seen a hundred times, and writes down what they saw.
                  On its own that is one small act of attention.
                </p>
                <p>
                  Repeated across a lane, a ward, a city, it becomes a record of
                  the physical world that nobody was keeping, built by the
                  people who live in it, about the part of it they walk past.
                </p>
                <p className="sp-thesis-close">
                  We start with street animals because they are the part almost
                  nobody writes down.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

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
            {/* Every figure is a published number for Goa, and the arithmetic
                is the same calculation the costing tool runs. Labelled by its
                source rather than by what has not happened yet. */}
            <div className="sp-record-card">
              <div className="sp-record-top">
                <span>STRAYPAW / OUTCOME RECORD</span>
                <span>GOA / PUBLISHED FIGURES</span>
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
                    Goa is one of the few states publishing both a population
                    and a coverage figure. Reaching the threshold where
                    sterilisation suppresses growth is {num(GOA_ANIMALS)}{" "}
                    animals, this is the record that work closes with.
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
                <div className="sp-kicker light">WHERE TO GO NEXT</div>
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
