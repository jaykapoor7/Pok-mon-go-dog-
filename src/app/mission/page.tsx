import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { STATUS_META } from "@/lib/platform/coverage";
import "./mission.css";

export const metadata = {
  title: "Our mission, StrayPaw",
  description:
    "One shared record for every street animal, kept by the people already doing the work, street by street.",
};

/* What StrayPaw is for, and the rules the software holds to. Why it has to
   exist (what the public evidence does and does not say) is /evidence. */
export default function MissionPage() {
  return (
    <SitePage
      kicker="Our mission"
      title={
        <>
          One record for every street animal, <em>kept where the work happens.</em>
        </>
      }
      lede="Residents, feeders, field teams and municipal bodies already do this work. StrayPaw gives them one record to keep it in, street by street, so what was done is still known next year."
      width="wide"
    >
      <div className="mission">
        {/* ── The five rules ───────────────────────────────────────── */}
        <section aria-labelledby="mi-rules">
          <div className="mi-head">
            <h2 id="mi-rules">
              Five rules, and each one is <em>a decision in the software.</em>
            </h2>
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
                  <b>Source</b>
                  <span>
                    Named under every number. <u>Where none exists, the page says so.</u>
                  </span>
                </p>
              </div>
            </li>
          </ul>
        </section>

        {/* ── Where this goes ──────────────────────────────────────── */}
        <section aria-labelledby="mi-goes">
          <div className="mi-head">
            <h2 id="mi-goes">
              Three people should be able to <em>open the same page.</em>
            </h2>
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
          <Link href="/evidence">
            Why this exists <ArrowUpRight size={14} />
          </Link>
          <span className="mi-built">Built in India by Jay.</span>
        </p>
      </div>
    </SitePage>
  );
}
