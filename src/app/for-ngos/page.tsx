import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DeskMock } from "@/components/landing/DeskMock";
import { CountFigures } from "@/components/company/CountFigures";
import { OrgMark } from "@/components/orgs/OrgMark";
import { getLandingStory } from "@/lib/landing/story";
import { getOperationalPartners, getPartnerDirectory } from "@/lib/partners";
import { getPublicOrgImpact } from "@/lib/org-public";
import "@/components/site/site.css";
import "@/components/landing/landing.css";
import "@/components/orgs/partners.css";
import "@/components/company/company.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "For NGOs, StrayPaw",
  description: "Cases, animals, care and reports for your field team on one record. Free for verified animal-welfare organisations; your records stay yours.",
};

/* ════════════════════════════════════════════════════════════════════
   For NGOs. What the workspace does, shown as the workspace itself (the
   field desk, replaying real events from the sample city), then what it
   holds, how to join, who is already on it with their own figures, and
   the terms in plain words. Every figure is live.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");

export default async function ForNgosPage() {
  const [story, partners, dir] = await Promise.all([
    getLandingStory().catch(() => null),
    getOperationalPartners().catch(() => []),
    getPartnerDirectory().catch(() => []),
  ]);
  const lead = partners[0] ?? null;
  const impact = lead ? await getPublicOrgImpact(lead.id).catch(() => null) : null;
  const ngos = dir.filter((o) => o.kind === "Field partner" || o.kind === "Partner NGO");

  const rows = [
    { t: "Cases", d: "Community reports and your own intakes become one queue: assigned, followed up, closed with an outcome.", proof: impact?.caseRecords ? { n: impact.caseRecords, l: "requests worked" } : null },
    { t: "Animals", d: "Every animal keeps one StrayPaw ID, with its photographs, place, cases and care attached to it.", proof: impact?.animalsRecorded ? { n: impact.animalsRecorded, l: "animals on record" } : null },
    { t: "Care and drives", d: "Treatment, vaccination and sterilisation drives recorded as they happen, and searchable later.", proof: impact?.sterilised ? { n: impact.sterilised, l: "sterilised, on record" } : null },
    { t: "Reports", d: "Map patterns, evidence workbooks and government-ready reports, from the records your team already keeps.", proof: impact?.resolvedCases ? { n: impact.resolvedCases, l: "closed after field work" } : null },
    { t: "Your spreadsheets", d: "Bring the registers you already use. Each sheet is mapped and checked before anything is added.", proof: null },
  ];

  return (
    <div className="co">
      <SiteHeader tone="night" />
      <main>
        <section className={`co-hero ${story?.desk ? "" : "is-solo"}`}>
          <div className="co-hero-in">
            <div className="co-hero-copy">
              <p className="co-kicker">For NGOs</p>
              <h1>Run your field work on one record. <em>Keep it&nbsp;yours.</em></h1>
              <p className="co-lede">Cases, animals, care and reports in one workspace, so the next person on your team knows what was done, and a funder can see it months later.</p>
              <p className="co-acts">
                <Link href="/partner-apply" className="sys-btn is-flame">Apply to partner <ArrowUpRight size={15} /></Link>
                <Link href="/join" className="co-link">I have a code <ArrowUpRight size={14} /></Link>
              </p>
            </div>
            {story?.desk && story.desk.live + story.desk.older > 0 && <DeskMock city={story.hero.city} desk={story.desk} />}
          </div>
        </section>

        <section className="co-sec" aria-labelledby="co-what">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="co-what">What the workspace <em>holds.</em></h2>
              <p>The parts of field work nobody funds and everybody needs, kept in one place.{lead ? ` Figures are ${lead.name}'s record today.` : ""}</p>
            </header>
            <ol className="co-rows">
              {rows.map((r, i) => (
                <li key={r.t}>
                  <span className="co-n">{String(i + 1).padStart(2, "0")}</span>
                  <span><b>{r.t}</b><p>{r.d}</p></span>
                  {r.proof ? <span className="co-proof"><strong>{fmt(r.proof.n)}</strong>{r.proof.l}</span> : <span />}
                </li>
              ))}
            </ol>
          </div>
        </section>

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

        {ngos.length > 0 && (
          <section className="co-sec" aria-labelledby="co-who">
            <div className="co-sec-in">
              <header className="co-sec-head">
                <h2 id="co-who">Already <em>on the record.</em></h2>
                {lead && impact && impact.animalsRecorded > 0 && (
                  <CountFigures figures={[
                    { value: impact.animalsRecorded, label: `animals on ${lead.name}'s record` },
                    ...(impact.resolvedCases ? [{ value: impact.resolvedCases, label: "closed after field work" }] : []),
                  ]} />
                )}
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

        <section className="co-sec is-shell" aria-labelledby="co-terms">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="co-terms">The terms, <em>plainly.</em></h2>
            </header>
            <ul className="co-terms">
              <li><b>Free</b><p>Verified animal-welfare organisations use the workspace at no cost.</p></li>
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
