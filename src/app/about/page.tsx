import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getSupabase } from "@/lib/supabase";
import { getRegisterTotals } from "@/lib/register/totals";
import { PlaceGround } from "@/components/system/PlaceGround";
import { ChatVsRecord, CoveredAndNot, ThreeSheetsOneId } from "@/components/company/Diagrams";
import "@/components/site/site.css";
import "@/components/orgs/partners.css";
import "@/components/company/company.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "About StrayPaw",
  description: "StrayPaw is one shared record of India's street animals: what it is, why a shared record matters, the rules it holds to, where its records come from, who contributes, and who runs it.",
};

/* ════════════════════════════════════════════════════════════════════
   About, and the mission. The one page that says what StrayPaw is and
   how it is run: what it is, with the register's own figures; why a
   shared record matters; the rules the software holds to; where every
   record comes from and who owns it; the organisations on it; privacy;
   who is behind it. /mission and /what-we-do send their visitors here.
   Facts only: anything this page cannot state goes to
   contact.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");

/* The kinds of source, in the words the record uses. */
const SOURCE_KIND: Record<string, string> = {
  organisation_register: "Organisations' own registers",
  research_dataset: "Research datasets",
  municipal_dataset: "Municipal surveys",
  government_dataset: "Government census",
  public_api: "Public observation platforms",
  media_repository: "Open photo archives",
};

async function getSources() {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa.from("data_sources").select("source_type,organization_name,published_record_count");
  const by = new Map<string, { kind: string; sources: number; records: number; orgs: Set<string> }>();
  for (const r of (data ?? []) as { source_type: string; organization_name: string; published_record_count: number }[]) {
    const g = by.get(r.source_type) ?? { kind: SOURCE_KIND[r.source_type] ?? r.source_type, sources: 0, records: 0, orgs: new Set<string>() };
    g.sources++; g.records += r.published_record_count ?? 0; g.orgs.add(r.organization_name); by.set(r.source_type, g);
  }
  return [...by.values()].sort((a, b) => b.records - a.records).map((g) => ({ ...g, orgs: [...g.orgs].sort((a, b) => a.localeCompare(b)) }));
}

export default async function AboutPage() {
  const [sources, totals] = await Promise.all([
    getSources().catch(() => []),
    getRegisterTotals().catch(() => null),
  ]);
  const imported = sources.reduce((n, g) => n + g.records, 0);

  return (
    <div className="co ab">
      <SiteHeader tone="night" />
      <main>
        <section className="co-hero is-solo has-ground">
          <PlaceGround className="co-hero-ground" />
          <div className="co-hero-in">
            <div className="co-hero-copy">
              <p className="co-kicker">About StrayPaw</p>
              <h1>One shared record of India&apos;s street animals. <em>Kept by the people who see them.</em></h1>
              <p className="co-lede">Residents report what they see. Field teams work the cases. What was done stays with the animal, for the next person, the next team and the next funder.</p>
              <p className="co-acts">
                <Link href="/map" className="sys-btn is-flame">Open the live map <ArrowUpRight size={15} /></Link>
                <Link href="/contact?subject=About%20StrayPaw" className="co-link is-night">Talk to us <ArrowUpRight size={14} /></Link>
              </p>
            </div>
          </div>
        </section>

        <section className="co-sec" aria-labelledby="ab-why">
          <div className="co-sec-in is-stack">
            <header className="co-sec-head">
              <h2 id="ab-why">Why it has to be <em>one record.</em></h2>
              <p>The work already happens. What is missing is a record of it that outlives the phone it was typed on.</p>
            </header>
            <ol className="ab-why">
              <li><ChatVsRecord /><b>Help reaches the animal, not the chat</b><p>A chat message is gone in a day. A report on the record is still there when the next team looks.</p></li>
              <li><ThreeSheetsOneId /><b>One animal, one history</b><p>Rescue, care and sterilisation from different teams land on one StrayPaw ID, not three spreadsheets.</p></li>
              <li><CoveredAndNot /><b>Covered, and what is not</b><p>Unvisited wards are drawn as unvisited, so a gap is never mistaken for a quiet street.</p></li>
            </ol>
          </div>
        </section>

        <section className="co-sec is-shell" aria-labelledby="ab-rules">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="ab-rules">Six rules <em>the software keeps.</em></h2>
              <p>Each one is a decision built into how the record is drawn and counted.</p>
            </header>
            <ol className="ab-rules">
              <li><b>Unknown is not zero</b><p>A place with no records is “not recorded”, never “no animals”.</p></li>
              <li><b>“Not examined” is an answer</b><p>Sterilisation and vaccination have three states, not two.</p></li>
              <li><b>A rate names its base</b><p>Shares are shown against the animals checked, and against all on record.</p></li>
              <li><b>Someone owns every case</b><p>A report reaches a queue only when an organisation takes it on.</p></li>
              <li><b>Every figure names its source</b><p>Where a number does not exist, the page says so.</p></li>
              <li><b>Independent of the field</b><p>StrayPaw runs no programmes and competes for no grants. Free for verified organisations.</p></li>
            </ol>
          </div>
        </section>

        <section className="co-sec" aria-labelledby="ab-from">
          <div className="co-sec-in is-stack">
            <header className="co-sec-head">
              <h2 id="ab-from">Where the records <em>come from.</em></h2>
              <p>Live reports and imported history are labelled apart on every profile. Each organisation owns its records; imported sources keep their licence and credit.</p>
            </header>
            {totals && <p className="src-total"><b>{fmt(totals.animals)} animal records on the register</b> across {totals.cities} cities. This is StrayPaw&apos;s public headline count; imported source records below describe provenance, not a second animal total.</p>}
            {imported > 0 && (
              <figure className="src-bar">
                <div className="src-track" role="img" aria-label="Share of published imported records by kind of source">
                  {sources.filter((g) => g.records > 0).map((g, i) => <span key={g.kind} className={`is-${i % 5}`} style={{ flexGrow: g.records }} title={`${g.kind}: ${fmt(g.records)}`} />)}
                </div>
                <figcaption>{fmt(imported)} published source records imported from {sources.length} kinds of source, alongside residents’ live reports and partner NGOs’ field records.</figcaption>
              </figure>
            )}
            <ol className="src-list">
              <li><i className="is-live" /><span><b>Residents’ reports</b><small>Sightings from a phone. The animal is public; the reporter never is.</small></span><em>live</em></li>
              <li><i className="is-live" /><span><b>Partner NGOs’ field records</b><small>Cases, care and outcomes, private until the organisation publishes.</small></span><em>live</em></li>
              {sources.map((g, i) => (
                <li key={g.kind}>
                  <i className={g.records > 0 ? `is-${sources.filter((x) => x.records > 0).indexOf(g) % 5}` : "is-none"} />
                  <span><b>{g.kind}</b><small>{g.orgs.join(", ")}</small></span>
                  <em>{g.records > 0 ? fmt(g.records) : "—"}</em>
                </li>
              ))}
            </ol>
            <p className="co-more"><Link href="/evidence">How each source was checked <ArrowUpRight size={14} /></Link></p>
          </div>
        </section>

        <section className="co-close has-ground">
          <PlaceGround className="co-hero-ground" caption={null} />
          <div className="co-close-in">
            <div>
              <h2>Built and run in India <em>by Jay Kapoor.</em></h2>
              <p>Partnerships, press, procurement and governance questions get a reply from the person who builds it: <a href="mailto:hello@straypaw.org">hello@straypaw.org</a>. Reporters are never named, places are shown to about 0.7 km², and nothing tracks you across sites. <Link href="/data-governance">Data policy</Link>.</p>
            </div>
            <p className="co-acts">
              <Link href="/contact?subject=About%20StrayPaw" className="sys-btn is-flame">Contact StrayPaw <ArrowUpRight size={15} /></Link>
              <Link href="/evidence" className="co-link">Why this exists <ArrowUpRight size={14} /></Link>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
