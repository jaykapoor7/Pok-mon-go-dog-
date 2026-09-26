import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getSupabase } from "@/lib/supabase";
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
   who is behind it. /mission, /journey and /what-we-do send their
   visitors here. Facts only: anything this page cannot state goes to
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
  return [...by.values()].sort((a, b) => b.records - a.records).map((g) => ({ ...g, orgs: [...g.orgs] }));
}

export default async function AboutPage() {
  const sources = await getSources().catch(() => []);

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
            </div>
          </div>
        </section>

        <section className="co-sec" aria-labelledby="ab-why">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="ab-why">Why the record <em>has to be shared.</em></h2>
              <p>The work already happens. What is missing is a record of it that outlives the phone it was typed on.</p>
            </header>
            <ol className="co-rows">
              <li><span className="co-n">01</span><span><b>Help reaches the animal, not the chat</b><p>A report in a WhatsApp group is gone in a day. A report on the record is still there when the next team looks, with what was already done.</p></span><span /></li>
              <li><span className="co-n">02</span><span><b>One animal, one history</b><p>Rescue, care and sterilisation logged by different people land on one StrayPaw ID, instead of three spreadsheets that never meet.</p></span><span /></li>
              <li><span className="co-n">03</span><span><b>A municipality can see what is covered</b><p>Wards with records and wards nobody has visited are drawn differently, so an unvisited ward is never mistaken for a quiet one.</p></span><span /></li>
            </ol>
          </div>
        </section>

        <section className="co-sec is-shell" aria-labelledby="ab-rules">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="ab-rules">Operating principles, <em>each one a decision in the software.</em></h2>
            </header>
            <ul className="co-terms">
              <li><b>Unknown is not zero</b><p>A place with no records is drawn as not recorded, never as a place without animals or without need.</p></li>
              <li><b>&ldquo;Nobody checked&rdquo; is a real answer</b><p>Sterilisation and vaccination have three states, and &ldquo;not examined&rdquo; is the default until someone looks.</p></li>
              <li><b>A rate says what it is a rate of</b><p>A share is shown against the animals actually checked, and against everything on record.</p></li>
              <li><b>Nothing reaches a team&apos;s queue on its own</b><p>A community report waits until an organisation takes it on. Figures nobody took responsibility for cannot be defended.</p></li>
              <li><b>Every figure names its source</b><p>Where a number does not exist, the page says so rather than estimating one.</p></li>
              <li><b>Independent of the field work</b><p>StrayPaw runs no programmes, does no rescues and does not compete for grants. Verified organisations use it free.</p></li>
            </ul>
          </div>
        </section>

        <section className="co-sec" aria-labelledby="ab-from">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="ab-from">Where every record <em>comes from.</em></h2>
              <p>Live reports and imported history are kept apart and labelled on every profile. Each organisation owns its records; imported sources keep their licence and their credit.</p>
            </header>
            <div>
              <ol className="co-rows">
                <li><span className="co-n">A</span><span><b>Residents&apos; reports</b><p>Sightings sent from a phone. The animal is public; the person who reported it never is.</p></span><span /></li>
                <li><span className="co-n">B</span><span><b>Partner NGOs&apos; field records</b><p>Cases, care and outcomes kept in the Field Workspace. Private to the organisation until it chooses to publish.</p></span><span /></li>
                {sources.map((g, i) => (
                  <li key={g.kind}>
                    <span className="co-n">{String.fromCharCode(67 + i)}</span>
                    <span><b>{g.kind}</b><p>{g.orgs.slice(0, 4).join(", ")}{g.orgs.length > 4 ? ` and ${g.orgs.length - 4} more` : ""}. Imported with licence and source recorded.</p></span>
                    {g.records > 0 ? <span className="co-proof"><strong>{fmt(g.records)}</strong>published records</span> : <span />}
                  </li>
                ))}
              </ol>
              <p className="co-more"><Link href="/evidence">How each source was checked <ArrowUpRight size={14} /></Link></p>
            </div>
          </div>
        </section>

        <section className="co-sec" aria-labelledby="ab-priv">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="ab-priv">Privacy and <em>governance.</em></h2>
            </header>
            <ul className="co-terms">
              <li><b>Reporters are never named</b><p>The names and contact details of people who report, and of caretakers in imported registers, are never published.</p></li>
              <li><b>Places, not addresses</b><p>Animals are shown to a small area of about 0.7 km², never an exact pin. Imported records are placed no finer than their source allows.</p></li>
              <li><b>No third-party tracking</b><p>No advertising or cross-site tracking runs on this site.</p></li>
              <li><b>Removal on request</b><p>How long records are kept, and how to have something removed, is on <Link href="/data-governance">data governance</Link>.</p></li>
            </ul>
          </div>
        </section>

        <section className="co-close">
          <div className="co-close-in">
            <div>
              <h2>Built and run in India <em>by Jay.</em></h2>
              <p>Partnerships, press, procurement, registration and governance questions: write in and you will get a reply from the person who builds it.</p>
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
