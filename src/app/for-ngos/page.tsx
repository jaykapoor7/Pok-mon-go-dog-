Warning: truncated output (original token count: 2909)
Total output lines: 215

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
  const ngos = dir.filter((o) => o.kind === "Field partner" || o.kind === "Partner NGO");

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
        <section className="co-hero is-solo">
          <div className="co-hero-in">
            <div className="co-hero-copy">
              <p className="co-kicker">Field Workspace · for NGOs</p>
              <h1>Run your field work on one record. <em>Keep it&nbsp;yours.</em></h1>
              <p className="co-lede">Cases, animals, care, reports and imports in the Field Workspace, so the next person on your team knows what was done, and a funder can see it months later.</p>
              <p className="co-acts">
                <Link href="/partner-apply" className="sys-btn is-flame">Apply to partner <ArrowUpRight size={15} /></Link>
                <Link href="/join" className="co-link">I have a code <ArrowUpRight size={14} /></Link>
              </p>
            </div>
          </div>
        </section>

        {story && (
          <section className="co-sec is-shell" aria-labelledby="co-workspace">
            <div className="co-sec-in">
              <header className="co-sec-head">
                <h2 id="co-workspace">The Field Workspace, <em>in motion.</em></h2>
                <p>A working view of what a partner team opens: live cases, urgent follow-ups and the local map.</p>…909 tokens truncated…rrowUpRight size={13} /></em>
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
            <div className="co-sec-in">
              <header className="co-sec-head">
                <h2 id="co-who">Partner NGOs, <em>on the record.</em></h2>
                <p>Organisations keep their own public identity and records. Open one to see its published coverage and work.</p>
              </header>
              <div>
                <ul className="co-orgs">
                  {ngos.map((o) => (
                    <li key={o.id}>
                      <Link href={`/org/${o.slug}`}>
                        <OrgMark name={o.name} logoUrl={o.logoUrl} size={40} />
                        <span><b>{o.name}</b><small>{[o.city, o.state].filter(Boolean).join(", ")}</small></span>
                        <span className="co-orgs-n">{o.kind}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="co-more"><Link href="/orgs">All partner NGOs <ArrowUpRight size={14} /></Link></p>
              </div>
            </div>
          </section>
        )}

        <section className="co-sec is-shell" aria-labelledby="co-how">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="co-how">Joining takes <em>three steps.</em></h2>
              <p>Free for verified animal-welfare organisations.</p>
            </header>
            <ol className="co-steps">
              <li><b>Apply</b><p>Tell us who you are and the area you cover.</p></li>
              <li><b>Get your code</b><p>Once verified, your team lead gets an access code and adds the rest of the team.</p></li>
              <li><b>Bring your records</b><p>Upload the spreadsheets and registers you already keep; they are mapped before anything is added.</p></li>
            </ol>
          </div>
        </section>

        <section className="co-sec" aria-labelledby="co-terms">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="co-terms">The terms, <em>plainly.</em></h2>
            </header>
            <ul className="co-terms">
              <li><b>Free</b><p>Verified animal-welfare organisations use the Field Workspace at no cost.</p></li>
              <li><b>Private to your team</b><p>Your workspace is visible only to your verified members.</p></li>
              <li><b>You decide what is public</b><p>The public sees only what your organisation chooses to publish.</p></li>
              <li><b>Reporters stay private</b><p>The names and contacts of people who report are never published.</p></li>
              <li><b>We do no field work</b><p>StrayPaw does not run programmes or compete for your grants.</p></li>
              <li><b>Your records leave with you</b><p>Export your cases, animals and care whenever you need them.</p></li>
            </ul>
          </div>
        </section>

        <section className="co-close">
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
