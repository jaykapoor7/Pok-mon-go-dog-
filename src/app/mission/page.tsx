import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { stateCoverage, STATUS_META } from "@/lib/platform/coverage";
import "./mission.css";

export const metadata = {
  title: "Our mission, StrayPaw",
  description:
    "India has no reliable count of its street animals, ward by ward. StrayPaw exists to build one, and to publish it with its method attached.",
};

export default function MissionPage() {
  /* The same classification the map's data-gap layer draws from, so this
     page cannot drift from what the rest of the site shows. */
  const states = stateCoverage();
  const order = { measured: 0, "population-only": 1, unmeasured: 2 } as const;
  const sorted = [...states].sort(
    (a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name)
  );
  const count = (s: keyof typeof order) => states.filter((x) => x.status === s).length;

  return (
    <SitePage
      kicker="Our mission"
      title={
        <>
          A national estimate <em>is not a map.</em>
        </>
      }
      lede="Most Indian states have a published street-dog population estimate. Two have a published sterilisation rate. None publishes either ward by ward, which is the only scale at which the work actually happens. StrayPaw exists to build that record for real places, one ward at a time, and to publish it with its method attached so anybody can argue with it."
      width="wide"
    >
      <div className="mission">
        {/* ── The gap, as it actually stands ───────────────────────── */}
        <section aria-labelledby="mi-gap">
          <div className="mi-head">
            <span className="mi-eyebrow">The record today</span>
            <h2 id="mi-gap">
              Twenty-eight states and Delhi. <em>Two have a coverage figure.</em>
            </h2>
            <p>
              Each one coloured by what has been published about it. Not by how
              much work is happening there: by whether a figure exists that
              somebody outside the programme could check. Almost every state has
              an estimate of how many street dogs it has. Almost none has a
              published answer to how many of them have been reached.
            </p>
          </div>

          <div className="mi-grid-wrap">
            <ul className="mi-grid">
              {sorted.map((s) => (
                <li key={s.code} className={s.status === "unmeasured" ? "is-unmeasured" : undefined}>
                  <i style={{ background: STATUS_META[s.status].colour }} aria-hidden />
                  <span title={`${s.name}: ${STATUS_META[s.status].label}`}>{s.name}</span>
                </li>
              ))}
            </ul>
            <ul className="mi-legend">
              {(["measured", "population-only", "unmeasured"] as const).map((k) => (
                <li key={k}>
                  <i style={{ background: STATUS_META[k].colour }} aria-hidden />
                  <b>{count(k)}</b> {STATUS_META[k].label.toLowerCase()}
                </li>
              ))}
            </ul>
            <p className="mi-note">
              Built from the published sources listed on{" "}
              <Link href="/sources">sources</Link>, and drawn from the same
              classification the map&apos;s coverage layer uses. A state moves
              colour when somebody publishes a figure for it, never when we
              estimate one.
            </p>
          </div>
        </section>

        {/* ── Why it is a measurement problem ──────────────────────── */}
        <section aria-labelledby="mi-measure">
          <div className="mi-head">
            <span className="mi-eyebrow">The problem</span>
            <h2 id="mi-measure">
              It is a measurement problem, <em>not an effort problem.</em>
            </h2>
            <p>
              The ABC (Dogs) Rules require every municipality to run a
              sterilisation programme. Rescues and municipal teams do that work,
              often for decades. What almost nobody has is a denominator: a count
              of the animals in an area, so a sterilisation figure can be a rate
              rather than a number of surgeries.
            </p>
            <p>
              Chennai is a fair example. Long-running ABC work by named
              organisations, widely cited coverage estimates, and no official
              ward-level figure published by the corporation. That is not a
              criticism of the people doing the work. It is a gap in the record,
              and the gap is what we are here for.
            </p>
          </div>

          <div className="mi-pair">
            <div className="mi-panel">
              <h3>What gets counted</h3>
              <p>
                Surgeries. A real number, kept carefully, reported upward, and on
                its own it cannot tell you whether a street is covered.
              </p>
              <svg viewBox="0 0 320 118" role="img" aria-label="Surgeries counted, divided by an unknown number of animals">
                <text x="160" y="34" textAnchor="middle" fontSize="15" fill="#0b1e3d" fontWeight="600">
                  surgeries this year
                </text>
                <line x1="40" y1="52" x2="280" y2="52" stroke="#0b1e3d" strokeWidth="1.5" />
                <rect x="40" y="66" width="240" height="34" fill="none" stroke="#c1391c" strokeWidth="1.5" strokeDasharray="5 4" rx="4" />
                <text x="160" y="88" textAnchor="middle" fontSize="14" fill="#c1391c" fontWeight="600">
                  animals in the ward
                </text>
                <text x="292" y="90" fontSize="20" fill="#c1391c" fontWeight="700">?</text>
              </svg>
            </div>
            <div className="mi-panel">
              <h3>What has to be counted</h3>
              <p>
                The animals themselves, inside a boundary somebody recognises.
                Then a surgery count becomes coverage, and coverage can be
                argued with, funded and checked next year.
              </p>
              <svg viewBox="0 0 320 118" role="img" aria-label="Individual animals recorded inside a ward boundary">
                <path
                  d="M18 96 L26 34 L120 20 L214 30 L302 22 L296 98 Z"
                  fill="#f6f1e9"
                  stroke="#2457ce"
                  strokeWidth="1.5"
                />
                {[
                  [56, 70], [92, 50], [128, 76], [160, 44], [196, 66],
                  [228, 82], [258, 52], [120, 60], [186, 88], [88, 86],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="5.5" fill={i % 3 === 0 ? "#f05b40" : "#2457ce"} />
                ))}
                <text x="30" y="112" fontSize="11" fill="#566579" letterSpacing="0.08em">
                  ONE WARD · EVERY ANIMAL ON THE RECORD
                </text>
              </svg>
            </div>
          </div>
        </section>

        {/* ── The five rules ───────────────────────────────────────── */}
        <section aria-labelledby="mi-rules">
          <div className="mi-head">
            <span className="mi-eyebrow">How we hold the line</span>
            <h2 id="mi-rules">
              Five rules, and each one is <em>a decision in the software.</em>
            </h2>
            <p>
              Not values on a wall. Every one of these is a place where the
              easier build was available and we did not take it, and the cost of
              that choice shows up underneath each rule.
            </p>
          </div>

          <ul className="mi-rules">
            <li>
              <h3>An area with no records is not an area with no animals.</h3>
              <p>
                It is an area nobody has surveyed. Those are opposite findings,
                and a map that shades them the same colour tells a funder an
                unvisited ward is a quiet one.
              </p>
              <div className="mi-show">
                <ul className="mi-swatches">
                  <li>
                    <i style={{ background: STATUS_META.measured.colour }} aria-hidden />
                    A published figure
                  </li>
                  <li>
                    <i style={{ background: STATUS_META["population-only"].colour }} aria-hidden />
                    Half a figure
                  </li>
                  <li>
                    <i style={{ background: "#c9ccd2" }} aria-hidden />
                    Nobody has looked, drawn outside the scale
                  </li>
                </ul>
              </div>
            </li>

            <li>
              <h3>A rate has to say what it is a rate of.</h3>
              <p>
                Every sterilisation percentage on this site is shown twice: of
                the animals somebody actually checked, and of every animal on
                record with the unchecked counted against.
              </p>
              <div className="mi-show">
                <div className="mi-ratio">
                  <div>
                    <span>Kinder</span>
                    <b>sterilised / checked</b>
                  </div>
                  <div>
                    <span>Honest</span>
                    <b>sterilised / all on record</b>
                  </div>
                </div>
              </div>
            </li>

            <li>
              <h3>&ldquo;Nobody checked&rdquo; is a real answer.</h3>
              <p>
                A yes-or-no field cannot say that nobody has looked, so it
                quietly files every unexamined animal alongside the confirmed
                ones. Ours has three states, and the third is the default.
              </p>
              <div className="mi-show">
                <div className="mi-chips">
                  <span>Sterilised</span>
                  <span>Not sterilised</span>
                  <span className="on">Nobody checked</span>
                </div>
              </div>
            </li>

            <li>
              <h3>Nothing reaches an organisation&apos;s dashboard on its own.</h3>
              <p>
                A volunteer&apos;s report waits until that organisation files it.
                A community sighting has to be claimed. Friction is the point:
                numbers nobody accepted responsibility for are numbers nobody can
                defend.
              </p>
              <div className="mi-show">
                <p className="mi-flow">
                  <em>Sighting</em>
                  <i>↓</i>
                  <s>waits</s>
                  <i>↓</i>
                  <em>Claimed by a team</em>
                  <i>↓</i>
                  <em>On the register</em>
                </p>
              </div>
            </li>

            <li>
              <h3>Every figure names its source.</h3>
              <p>
                Boundaries carry the dataset they came from and its licence.
                Costs cite the municipal tender or the notified ceiling. Where a
                number does not exist we say so rather than estimating one.
              </p>
              <div className="mi-show">
                <p className="mi-cite">
                  <b>45%</b>
                  <span>
                    Delhi ABC coverage, 2023.{" "}
                    <u>
                      2022-23 community-dog population survey cited in Delhi
                      rabies-elimination reporting.
                    </u>
                  </span>
                </p>
              </div>
            </li>
          </ul>
        </section>

        {/* ── What this is and is not ──────────────────────────────── */}
        <section aria-labelledby="mi-claims">
          <div className="mi-head">
            <span className="mi-eyebrow">Scope</span>
            <h2 id="mi-claims">
              What we claim, <em>and what we do not.</em>
            </h2>
          </div>

          <div className="mi-claims">
            <div className="is-yes">
              <h3>What our numbers are</h3>
              <ul>
                <li>Animals recorded in StrayPaw, in a place, on a date.</li>
                <li>
                  A count inside published municipal boundaries, so a ward, a
                  district and a state each have a number that came from
                  somewhere.
                </li>
                <li>
                  One animal followed across the years, rather than a new record
                  every time somebody new sees it.
                </li>
              </ul>
            </div>
            <div className="is-no">
              <h3>What they are not</h3>
              <ul>
                <li>
                  An estimated population. In most of the country the honest
                  figure today is zero surveyed, and we would rather show that
                  than a modelled number that answers a question nobody asked.
                </li>
                <li>
                  A rescue service. When an animal needs help the people who go
                  out are the organisations already doing it.
                </li>
                <li>
                  A ranking of anybody&apos;s effort. A blank state is a blank
                  record, not a lazy one.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Where this goes ──────────────────────────────────────── */}
        <section aria-labelledby="mi-goes">
          <div className="mi-head">
            <span className="mi-eyebrow">Where this goes</span>
            <h2 id="mi-goes">
              Three people should be able to <em>open the same page.</em>
            </h2>
            <p>
              None of this requires anything clever. It requires the records to
              be kept properly, in one place, by the people already doing the
              work, and published in a form somebody can argue with. That is the
              whole plan.
            </p>
          </div>

          <div className="mi-goes">
            <div>
              <b>A ward officer</b>
              <p>
                Opens their ward and sees what is known about it: how many
                animals are on the record, how many have been checked, and what
                has not been visited since.
              </p>
            </div>
            <div>
              <b>A corporation funding a programme</b>
              <p>
                Sees the same numbers the organisation sees, drawn against
                boundaries both of them recognise, so a review is about the work
                rather than about whose spreadsheet is right.
              </p>
            </div>
            <div>
              <b>A researcher</b>
              <p>
                Downloads the table, follows every figure to its source, and
                finds the arithmetic holds.
              </p>
            </div>
          </div>
        </section>

        <p className="mi-close">
          <Link href="/why-straypaw">
            The longer argument <ArrowUpRight size={14} />
          </Link>
          <Link href="/evidence">
            What is known and missing <ArrowUpRight size={14} />
          </Link>
          <Link href="/sources">
            Every figure we cite <ArrowUpRight size={14} />
          </Link>
          <span className="mi-built">Built in India by Jay.</span>
        </p>
      </div>
    </SitePage>
  );
}
