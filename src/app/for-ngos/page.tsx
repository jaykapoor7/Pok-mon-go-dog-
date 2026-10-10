import Link from "next/link";
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
import { PlaceGround } from "@/components/system/PlaceGround";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "For NGOs, StrayPaw",
  description: "The Field Workspace: cases, animals, care, reports and imports for your field team on one record. Free for verified animal-welfare organisations; your records stay yours.",
};

/* ════════════════════════════════════════════════════════════════════
   For NGOs. The Field Workspace, shown as itself (replaying real events
   from the sample city), then what it holds, how the records a team
   already keeps become one animal record (with a real imported line as
   the example), who is on it with their own figures, how to join, and the
   terms in plain words. Every figure is live.
   ════════════════════════════════════════════════════════════════════ */

export default async function ForNgosPage() {
  const [dir, kh, story] = await Promise.all([
    getPartnerDirectory().catch(() => []),
    getKindHour().catch(() => null),
    getLandingStory().catch(() => null),
  ]);
  const ex = kh?.example ?? null;
  const ngos = dir.filter((o) => o.kind === "Field partner" || o.kind === "Listed NGO");

  const rows = [
    { t: "Cases", d: "Community reports and your own intakes become one queue: assigned, followed up, closed with an outcome." },
    { t: "Animals", d: "Every animal keeps one StrayPaw ID, with its photographs, place, cases and care attached to it." },
    { t: "Care and programmes", d: "Treatment, vaccination and sterilisation, and the drives and programmes they belong to, recorded as they happen." },
    { t: "Reports", d: "Map patterns, evidence workbooks and government-ready reports, from the records your team already keeps." },
    { t: "Imports", d: "Bring the registers you already use. Each sheet is mapped and checked before anything is added." },
  ];

  return (
    <div className="co ngo">
      <SiteHeader tone="night" />
      <main>
        <section className="co-hero has-ground ngo-hero">
          <PlaceGround className="co-hero-ground" caption={null} city={story?.hero.city} />
          <div className="co-hero-in">
            <div className="co-hero-copy">
              <p className="co-kicker">Field Workspace · for NGOs</p>
              <h1>Run your field work on one record. <em>Keep it&nbsp;yours.</em></h1>
              <p className="co-lede">Cases, animals, care, reports and imports in one workspace, so the next person on your team knows what was done, and a funder can see it months later. Free for verified organisations.</p>
              <p className="co-acts">
                <Link href="/partner-apply" className="sys-btn is-flame">Apply to partner <ArrowUpRight size={15} /></Link>
                <Link href="/join" className="co-link is-night">I have a code <ArrowUpRight size={14} /></Link>
              </p>
            </div>
            {story && (
              <div className="ngo-hero-desk">
                <DeskMock city={story.hero.city} desk={story.desk} />
                <p className="ngo-hero-cap">The Field Workspace, shown with a published {story.hero.city} record sample. <Link href="/partner">Open it <ArrowUpRight size={13} /></Link></p>
              </div>
            )}
          </div>
        </section>

        <section className="co-sec" aria-labelledby="co-what">
          <div className="co-sec-in is-stack">
            <header className="co-sec-head">
              <h2 id="co-what">What the workspace <em>holds.</em></h2>
              <p>The parts of field work nobody funds and everybody needs, in one place.</p>
            </header>
            <ol className="ngo-holds">
              {rows.map((r, i) => (
                <li key={r.t}><span className="co-n">{String(i + 1).padStart(2, "0")}</span><b>{r.t}</b><p>{r.d}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="co-sec is-shell" aria-labelledby="co-merge">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="co-merge">WhatsApp, spreadsheets, paper. <em>One animal record.</em></h2>
              <p>Field work is already written down, in three places at once. Each source is mapped onto the same animal, with the line it came from kept beside it. Names and numbers of the people who called stay out.</p>
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

        {ngos.length > 0 && (
          <section className="co-sec" aria-labelledby="co-who">
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

        <section className="co-sec is-shell" aria-labelledby="co-how">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="co-how">Three steps, <em>plain terms.</em></h2>
              <p>Free for verified animal-welfare organisations.</p>
            </header>
            <div className="ngo-join">
              <ol className="co-steps">
                <li><b>Apply</b><p>Tell us who you are and the area you cover.</p></li>
                <li><b>Get your code</b><p>Once verified, your team lead gets a code and adds the team.</p></li>
                <li><b>Bring your records</b><p>Upload the registers you keep; each is mapped before anything is added.</p></li>
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

        <section className="co-close has-ground">
          <PlaceGround className="co-hero-ground" caption={null} city={story?.hero.city} />
          <div className="co-close-in">
            <div>
              <h2>Bring your field records. <em>Keep them yours.</em></h2>
              <p>Apply once; your team lead gets a code and adds the rest of the team.</p>
            </div>
            <p className="co-acts">
              <Link href="/partner-apply" className="sys-btn is-flame">Apply to partner <ArrowUpRight size={15} /></Link>
              <Link href="/contact?subject=For%20NGOs" className="co-link">Talk to us first <ArrowUpRight size={14} /></Link>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
