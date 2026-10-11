import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { OrgMark } from "@/components/orgs/OrgMark";
import { getPartnerDirectory } from "@/lib/partners";
import { getKindHour } from "@/lib/kind-hour";
import { getLandingStory } from "@/lib/landing/story";
import { DeskMock } from "@/components/landing/DeskMock";
import "@/components/site/site.css";
import "@/components/landing/landing.css";
import "@/components/orgs/partners.css";
import "@/components/company/company.css";
import "@/components/company/careos.css";
import { PlaceGround } from "@/components/system/PlaceGround";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "StrayPaw CareOS for NGOs",
  description: "CareOS runs community-dog care from the first WhatsApp message to the outcome: one inbox, owned cases, treatment and follow-ups recorded once, and an animal history that continues across teams. Free for verified NGOs; WhatsApp intake in pilot.",
  alternates: { canonical: "/for-ngos" },
};

/* ════════════════════════════════════════════════════════════════════
   StrayPaw CareOS, for NGOs. The service, not the dataset: one case walked
   end to end (each step marked Live or Pilot, never implying more), the
   continuity of care that is the point of it, the workspace an NGO gets,
   how their existing records come in, and the founding-NGO pilot.

   Honesty rules: WhatsApp intake and reporter updates are in pilot (the
   backend is built separately; see docs/CAREOS-INTEGRATION.md). The case
   artefacts are labelled illustrative. Every live figure is read live.
   ════════════════════════════════════════════════════════════════════ */

type Stage = { n: string; t: string; d: string; state: "live" | "pilot"; note?: string; art: ReactNode };

const STAGES: Stage[] = [
  {
    n: "01", t: "A message arrives", state: "pilot",
    d: "A resident sends a photo and a location on WhatsApp. It lands in your Care Inbox: the photo blurred if it may show an injury, the place, and the message translated if it was not in English.",
    art: (
      <div className="cw-art cw-chat" aria-hidden>
        <span className="cw-bubble"><span className="cw-ph" />Dog limping near the temple gate, back left leg. Been here two days.</span>
        <span className="cw-meta">Photo · location shared · 08:42</span>
      </div>
    ),
  },
  {
    n: "02", t: "Someone owns it", state: "live",
    d: "One tap claims it, sets the urgency and opens a case, or attaches it to a case already open for that animal. Everyone on the team sees who owns what.",
    art: (
      <div className="cw-art cw-row" aria-hidden>
        <b>Limping, back left leg</b>
        <span>Near the temple gate</span>
        <span className="cw-pills"><em className="is-hot">Urgent</em><em>Owner · Priya</em></span>
      </div>
    ),
  },
  {
    n: "03", t: "The animal is already known", state: "live",
    d: "The case lands on the animal's StrayPaw record: earlier reports, its sterilisation, the last vaccination and who treated it before, even when that was another organisation.",
    art: (
      <div className="cw-art cw-id" aria-hidden>
        <span className="cw-tag">K43FQP</span>
        <b>Female · medium</b>
        <ol>
          <li><i className="is-care" />Sterilised · earlier, another NGO</li>
          <li><i className="is-care" />Rabies vaccine · last year</li>
          <li><i className="is-hot" />Limping · today</li>
        </ol>
      </div>
    ),
  },
  {
    n: "04", t: "Treatment, recorded once", state: "live",
    d: "Diagnosis, medicines, procedures and before-and-after photos go in as care entries. They become the animal's history, not a chat thread that scrolls away.",
    art: (
      <div className="cw-art cw-care" aria-hidden>
        <span><i className="is-care" /><b>Wound cleaned and dressed</b></span>
        <span className="cw-sub">Antibiotics, five days · photo before and after</span>
      </div>
    ),
  },
  {
    n: "05", t: "Follow-ups don't slip", state: "live", note: "Reporter update: pilot",
    d: "Rechecks are scheduled on the case, and overdue ones rise to the top of the queue. In the pilot, the person who reported it can get a short WhatsApp update when the animal is treated.",
    art: (
      <div className="cw-art cw-due" aria-hidden>
        <span><em>Recheck</em><b>due in 3 days</b></span>
        <span className="is-late"><em>Overdue</em><b>2 follow-ups</b></span>
      </div>
    ),
  },
  {
    n: "06", t: "An outcome, and the report", state: "live",
    d: "Close with an outcome and a reason. Monthly reports, programme totals and funder evidence come from the same records, with where each fact came from.",
    art: (
      <div className="cw-art cw-out" aria-hidden>
        <span className="cw-closed">Closed · treated and released</span>
        <span className="cw-sub">Monthly report · cases, care, outcomes · export</span>
      </div>
    ),
  },
];

const MODULES: { t: string; d: string; href: string; state: "live" | "pilot" }[] = [
  { t: "Care Inbox", d: "Everything that needs a decision: resident reports today, WhatsApp messages in the pilot.", href: "/partner/incoming", state: "live" },
  { t: "Active cases", d: "Owned, prioritised, critical first. Assign, update, close with a reason.", href: "/partner/cases", state: "live" },
  { t: "Follow-ups", d: "Rechecks and post-operative checks with due dates; overdue rises to the top.", href: "/partner/operations", state: "live" },
  { t: "Animal records", d: "One StrayPaw ID per animal, with its place, cases, care and outcomes.", href: "/partner/animals", state: "live" },
  { t: "Field operations", d: "Drives, vet camps and volunteers, with the areas you cover on the map.", href: "/partner/field", state: "live" },
  { t: "Reports", d: "Monthly and programme reports, evidence workbooks and exports.", href: "/partner/reports", state: "live" },
];

const State = ({ s, note }: { s: "live" | "pilot"; note?: string }) => (
  <span className={`cw-state is-${s}`}>{s === "live" ? "Live" : "Pilot"}{note ? <small>{note}</small> : null}</span>
);

export default async function ForNgosPage() {
  const [dir, kh, story] = await Promise.all([
    getPartnerDirectory().catch(() => []),
    getKindHour().catch(() => null),
    getLandingStory().catch(() => null),
  ]);
  const ex = kh?.example ?? null;
  const ngos = dir.filter((o) => o.kind === "Field partner" || o.kind === "Listed NGO");

  return (
    <div className="co ngo careos">
      <SiteHeader tone="night" />
      <main>
        <section className="co-hero has-ground ngo-hero">
          <PlaceGround className="co-hero-ground" caption={null} city={story?.hero.city} />
          <div className="co-hero-in">
            <div className="co-hero-copy">
              <p className="co-kicker">StrayPaw CareOS · for NGOs</p>
              <h1>From the first WhatsApp message to the outcome. <em>One continuing record.</em></h1>
              <p className="co-lede">CareOS is the operating system for community-dog care. Reports come in, your team owns each case, treatment and follow-ups are recorded once, and every animal keeps its history, across your team and the next organisation that meets it.</p>
              <p className="co-acts">
                <Link href="/partner-apply" className="sys-btn is-flame">Join the founding pilot <ArrowUpRight size={15} /></Link>
                <Link href="/join" className="co-link is-night">I have a code <ArrowUpRight size={14} /></Link>
              </p>
              <p className="cw-honest">WhatsApp intake is in pilot with founding NGOs. The rest of the workflow below is live today, and free for verified organisations.</p>
            </div>
            {story && (
              <div className="ngo-hero-desk">
                <DeskMock city={story.hero.city} desk={story.desk} />
                <p className="ngo-hero-cap">The workspace, shown with a published {story.hero.city} record sample. <Link href="/partner">Open it <ArrowUpRight size={13} /></Link></p>
              </div>
            )}
          </div>
        </section>

        <section className="co-sec" aria-labelledby="cw-flow">
          <div className="co-sec-in is-stack">
            <header className="co-sec-head">
              <h2 id="cw-flow">One case, <em>end to end.</em></h2>
              <p>How a single case moves through CareOS. Nothing is typed twice, and nothing lives only in someone&apos;s phone. <span className="cw-ill">Example case, illustrative.</span></p>
            </header>
            <ol className="cw-flow" aria-label="Six steps of one case" tabIndex={0}>
              {STAGES.map((s) => (
                <li key={s.n}>
                  <div className="cw-head"><span className="co-n">{s.n}</span><State s={s.state} /></div>
                  <b className="cw-t">{s.t}{s.note && <small className="cw-note">{s.note}</small>}</b>
                  {s.art}
                  <p>{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="co-sec is-shell" aria-labelledby="cw-cont">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="cw-cont">Care that outlasts <em>one team and one phone.</em></h2>
              <p>A street dog meets many people over its life. Rescue reporting is one moment; what matters is that the next person knows what was done. CareOS keeps one identity and one history, while each organisation&apos;s own notes stay private until it chooses to share them.</p>
            </header>
            <div className="cw-life" role="img" aria-label="One animal's history passing through a resident, two NGOs, a feeder and a municipal programme">
              <ol>
                <li><span className="cw-who">A resident</span><b>Reports it</b><small>WhatsApp or the web</small></li>
                <li><span className="cw-who">NGO one</span><b>Treats it</b><small>Case, care, follow-up</small></li>
                <li><span className="cw-who">A feeder</span><b>Checks in</b><small>Seen, eating, walking</small></li>
                <li><span className="cw-who">NGO two, months later</span><b>Sterilises it</b><small>Sees the earlier care first</small></li>
                <li><span className="cw-who">A municipal programme</span><b>Counts it once</b><small>Not twice, not as new</small></li>
              </ol>
              <p className="cw-life-k">How it works, not a recorded animal. Private notes stay with the organisation that wrote them; identity, place and published care continue.</p>
            </div>
          </div>
        </section>

        <section className="co-sec" aria-labelledby="cw-ws">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="cw-ws">The workspace <em>your team uses.</em></h2>
              <p>Built for staff in the field and at the desk: fast case actions, clear ownership, nothing hidden behind menus.</p>
            </header>
            <ul className="cw-mods">
              {MODULES.map((m) => (
                <li key={m.t}>
                  <Link href={m.href}>
                    <b>{m.t}</b>
                    <span>{m.d}</span>
                    <State s={m.state} />
                    <ArrowUpRight size={15} aria-hidden className="cw-go" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="co-sec is-shell" aria-labelledby="co-merge">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="co-merge">Onboarding: <em>bring what you already keep.</em></h2>
              <p>Your field work is already written down: in WhatsApp groups, spreadsheets and paper. Each source is mapped onto the same animal, with the line it came from kept beside it. Names and numbers of the people who called stay out.</p>
            </header>
            <div className="co-merge">
              <ol className="co-merge-in" aria-label="Where field records are kept today">
                <li className="co-slip is-chat">
                  <small>A WhatsApp message</small>
                  <span className="co-slip-photo" aria-hidden />
                  <span className="co-slip-f"><i>What is wrong</i><i>Where</i><i>When</i></span>
                </li>
                <li className="co-slip is-sheet">
                  <small>A spreadsheet row{ex ? " · Kind Hour register, line KH-RR-001" : ""}</small>
                  {ex ? (
                    <table>
                      <thead><tr><th>Date</th><th>Address</th><th>Dog</th><th>Name</th><th>OPD</th><th>Caretaker</th></tr></thead>
                      <tbody><tr><td data-k="Date">25/1/2024</td><td data-k="Address">rajendra</td><td data-k="Dog">white and brown</td><td data-k="Name">chachi</td><td data-k="OPD">yes</td><td data-k="Caretaker" className="is-held">withheld</td></tr></tbody>
                    </table>
                  ) : <span className="co-slip-f"><i>Date</i><i>Locality</i><i>Animal</i><i>Status</i></span>}
                </li>
                <li className="co-slip is-paper">
                  <small>A paper or vet record</small>
                  <span className="co-slip-f"><i>Procedure</i><i>Date</i><i>Vet</i><i>Follow-up</i></span>
                </li>
              </ol>
              <div className="co-merge-out">
                <p className="co-merge-k sys-mono">One animal record</p>
                {ex ? (
                  <Link href={`/dog/${ex.id}`} className="co-record">
                    <span className="co-record-id">{ex.straypawId}</span>
                    <b>{ex.name}</b>
                    <span>{[ex.zone, ex.city].filter(Boolean).join(" · ")}</span>
                    <dl>
                      <div><dt>Case</dt><dd>{ex.cases}</dd></div>
                      <div><dt>Care</dt><dd>{ex.care}</dd></div>
                      <div><dt>Recorded by</dt><dd>The Kind Hour Foundation</dd></div>
                    </dl>
                    <em>Imported history, not a live report <ArrowUpRight size={13} /></em>
                  </Link>
                ) : (
                  <p className="co-record is-empty">Every source line lands on one StrayPaw ID: the animal&apos;s place, cases, care and outcome, with where each fact came from.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="co-sec" id="pilot" aria-labelledby="cw-pilot">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="cw-pilot">The founding-NGO <em>pilot.</em></h2>
              <p>A small group of animal-welfare organisations running CareOS on real cases while WhatsApp intake opens. Free for verified organisations.</p>
            </header>
            <div className="cw-pilot">
              <div>
                <p className="cw-pilot-k">What you get</p>
                <ul>
                  <li>The full workspace for your team, from the first day</li>
                  <li>Your existing registers imported and checked with you</li>
                  <li>WhatsApp intake switched on for your team as the pilot opens in your area</li>
                  <li>A direct line to the people building it; your workflow shapes what ships next</li>
                </ul>
              </div>
              <div>
                <p className="cw-pilot-k">What we ask</p>
                <ul>
                  <li>Use it for real cases, not a demo</li>
                  <li>Tell us what slows your team down</li>
                  <li>Let us name you as a founding NGO, only if you are happy to</li>
                </ul>
              </div>
              <ol className="co-steps cw-steps">
                <li><b>Apply</b><p>Who you are and the area you cover.</p></li>
                <li><b>Onboard</b><p>Verification and an onboarding call; your team lead gets a code.</p></li>
                <li><b>Run real cases</b><p>Import your registers and work the first cases with us.</p></li>
              </ol>
              <ul className="ngo-terms">
                <li><b>Private to your team</b> until you publish.</li>
                <li><b>Reporters stay private</b>, always.</li>
                <li><b>Your records leave with you</b>: export any time.</li>
                <li><b>We do no field work</b> and compete for no grants.</li>
              </ul>
            </div>
          </div>
        </section>

        {ngos.length > 0 && (
          <section className="co-sec is-shell" aria-labelledby="co-who">
            <div className="co-sec-in is-stack">
              <header className="co-sec-head">
                <h2 id="co-who">NGOs <em>on StrayPaw.</em></h2>
              </header>
              <ul className="ngo-marks">
                {ngos.slice(0, 10).map((o) => (
                  <li key={o.id}><Link href={`/org/${o.slug}`}><OrgMark name={o.name} logoUrl={o.logoUrl} size={34} /><span><b>{o.name}</b><small>{[o.city, o.state].filter(Boolean).join(", ")}</small></span></Link></li>
                ))}
              </ul>
              <p className="co-more"><Link href="/orgs">Partners, NGOs and data sources <ArrowUpRight size={14} /></Link></p>
            </div>
          </section>
        )}

        <section className="co-close has-ground">
          <PlaceGround className="co-hero-ground" caption={null} city={story?.hero.city} />
          <div className="co-close-in">
            <div>
              <h2>Run your care work on CareOS. <em>Keep it yours.</em></h2>
              <p>Apply once; your team lead gets a code and adds the rest of the team.</p>
            </div>
            <p className="co-acts">
              <Link href="/partner-apply" className="sys-btn is-flame">Join the founding pilot <ArrowUpRight size={15} /></Link>
              <Link href="/contact?subject=CareOS%20pilot" className="co-link">Talk to us first <ArrowUpRight size={14} /></Link>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
