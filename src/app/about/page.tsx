import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CountFigures } from "@/components/company/CountFigures";
import { OrgMark } from "@/components/orgs/OrgMark";
import { getLandingStory } from "@/lib/landing/story";
import { getPartnerDirectory } from "@/lib/partners";
import "@/components/site/site.css";
import "@/components/orgs/partners.css";
import "@/components/company/company.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "About StrayPaw",
  description: "StrayPaw is one shared record of India's street animals: residents report, field teams work the cases, and what was done stays with the animal.",
};

/* ════════════════════════════════════════════════════════════════════
   About. What StrayPaw is, in one line, with the register's own figures
   counted up beside it; how it is run; who is on it; privacy in short.
   Facts only: anything this page cannot state goes to contact.
   ════════════════════════════════════════════════════════════════════ */

export default async function AboutPage() {
  const [story, dir] = await Promise.all([getLandingStory().catch(() => null), getPartnerDirectory().catch(() => [])]);
  const ngos = dir.filter((o) => o.kind === "Field partner" || o.kind === "Partner NGO");
  const t = story?.totals;

  return (
    <div className="co">
      <SiteHeader tone="night" />
      <main>
        <section className="co-hero is-solo">
          <div className="co-hero-in">
            <div className="co-hero-copy">
              <p className="co-kicker">About StrayPaw</p>
              <h1>One shared record of India&apos;s street animals. <em>Kept by the people who see them.</em></h1>
              <p className="co-lede">Residents report what they see. Field teams work the cases. What was done stays attached to the animal, so the next person, the next team and the next funder can see it.</p>
              {t && (
                <CountFigures figures={[
                  { value: t.animals, label: "animals on the record" },
                  { value: t.cases, label: "requests for help" },
                  { value: t.cities, label: "cities" },
                ]} />
              )}
            </div>
          </div>
        </section>

        <section className="co-sec" aria-labelledby="ab-run">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="ab-run">How it <em>is run.</em></h2>
              <p>The record serves the teams doing the work; it does not replace them.</p>
            </header>
            <ol className="co-rows">
              <li><span className="co-n">01</span><span><b>Independent</b><p>StrayPaw does no field work, runs no programmes and does not compete for grants.</p></span><span /></li>
              <li><span className="co-n">02</span><span><b>Free for organisations</b><p>Verified animal-welfare organisations use the workspace at no cost.</p></span><span /></li>
              <li><span className="co-n">03</span><span><b>Records stay with the team</b><p>Each organisation&apos;s workspace is private to its members; what it publishes is its choice.</p></span><span /></li>
              <li><span className="co-n">04</span><span><b>The animal is public, the person is not</b><p>An animal&apos;s record is open. Who reported it never is.</p></span><span /></li>
            </ol>
          </div>
        </section>

        {ngos.length > 0 && (
          <section className="co-sec is-shell" aria-labelledby="ab-who">
            <div className="co-sec-in">
              <header className="co-sec-head">
                <h2 id="ab-who">The teams <em>on the record.</em></h2>
                <p>Animal-welfare organisations keeping their field records here.</p>
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
                <p className="co-more"><Link href="/orgs">All partner NGOs and data sources <ArrowUpRight size={14} /></Link></p>
              </div>
            </div>
          </section>
        )}

        <section className="co-sec" aria-labelledby="ab-priv">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="ab-priv">Privacy, <em>in short.</em></h2>
            </header>
            <ul className="co-terms">
              <li><b>Reporters are never named</b><p>The names and contact details of people who report are never published.</p></li>
              <li><b>Places, not addresses</b><p>Animals are shown to a small area of about 0.7 km², never an exact pin.</p></li>
              <li><b>No third-party tracking</b><p>No advertising or cross-site tracking runs on this site.</p></li>
              <li><b>Removal on request</b><p>How long records are kept, and how to have something removed, is on <Link href="/data-governance">data governance</Link>.</p></li>
            </ul>
          </div>
        </section>

        <section className="co-close">
          <div className="co-close-in">
            <div>
              <h2>Partnerships, press, <em>procurement.</em></h2>
              <p>For registration and governance questions too, write to us.</p>
            </div>
            <p className="co-acts">
              <Link href="/contact?subject=About%20StrayPaw" className="sys-btn is-flame">Contact us <ArrowUpRight size={15} /></Link>
              <Link href="/mission" className="co-link">Our mission <ArrowUpRight size={14} /></Link>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
