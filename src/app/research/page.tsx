import Link from "next/link";
import { ArrowRight, BookOpen, Database, FlaskConical, Scale } from "lucide-react";
import { PageHead, S4Page, SecHead, Tiles, TwoTone } from "@/sp4/site/kit";
import { ACCESS_LABEL, DATASETS, PROJECTS, STATUS_LABEL, type Status } from "@/sp4/research/catalogue";
import "@/sp4/home/home4.css";
import "@/sp4/research/research.css";

export const metadata = {
  title: "Research · StrayPaw",
  description: "StrayPaw Research: a dataset catalogue with provenance and limits, methods for animal-level programme records, research in progress and controlled access to partner data.",
};

export default function ResearchPage() {
  const count = (s: Status) => PROJECTS.filter((p) => p.status === s).length;
  return (
    <S4Page close={undefined}>
      <PageHead
        eyebrow="StrayPaw Research"
        title={<TwoTone a="Records you can check," b="data you can cite" />}
        lede="For universities, public-health researchers and data partners working on dog population management and rabies control in India. Every dataset here states its source, geography, time span, licence and what it cannot show. Partner programme data is released only with the owner's approval and an agreement."
        actions={<><Link href="/research/datasets" className="s4-btn is-primary">Browse datasets</Link><Link href="/research/access" className="s4-btn is-line">Request data access</Link></>}
      />

      <section className="s4-sec" aria-labelledby="rs-status">
        <div className="s4-wrap">
          <SecHead id="rs-status" title={<TwoTone a="Research," b="by status" />} lede="Published, in progress and proposed work are kept apart. A proposed study has no data behind it, and nothing in progress is presented as a finding." link={{ href: "/research/projects", label: "All projects" }} />
          <div className="rs-status">
            {(["published", "in_progress", "proposed"] as Status[]).map((s) => (
              <Link key={s} href={`/research/projects#${s}`} className="rs-stat"><span className={`rs-pill is-${s}`}>{STATUS_LABEL[s]}</span><b>{count(s)}</b><small>{s === "published" ? "No StrayPaw paper is published yet." : s === "in_progress" ? "Engineering evaluations and method notes." : "Planned studies, no data collected."}</small></Link>
            ))}
          </div>
        </div>
      </section>

      <section className="s4-sec" aria-labelledby="rs-cat">
        <div className="s4-wrap">
          <SecHead id="rs-cat" title={<TwoTone a="Dataset" b="catalogue" />} lede="Three access levels: open downloads StrayPaw has the right to publish, datasets you obtain from their original publisher, and restricted partner records." link={{ href: "/research/datasets", label: "Full catalogue" }} />
          <ul className="rs-list">
            {DATASETS.map((d) => <li key={d.id}><Link href={`/research/datasets#${d.id}`}><span><b>{d.title}</b><small>{d.holder} · {d.geography}</small></span><span className={`rs-pill is-${d.access}`}>{ACCESS_LABEL[d.access]}</span><ArrowRight size={15} aria-hidden /></Link></li>)}
          </ul>
        </div>
      </section>

      <section className="s4-sec" aria-labelledby="rs-method">
        <div className="s4-wrap">
          <SecHead id="rs-method" title={<TwoTone a="How we treat" b="every number" />} link={{ href: "/research-standards", label: "Research standards" }} />
          <Tiles items={[
            { icon: <Database size={20} />, title: "Recorded, not estimated", body: "A count is a count of records. It is never presented as a population estimate or as coverage." },
            { icon: <Scale size={20} />, title: "Source on every row", body: "Imported rows keep their file, batch and organisation; programme records keep evidence, sign-offs and audit history." },
            { icon: <FlaskConical size={20} />, title: "Research stays research", body: "Historical and research datasets never count as current operational work." },
            { icon: <BookOpen size={20} />, title: "Cited and licensed", body: "Third-party datasets are credited to their authors; StrayPaw does not redistribute what it has no right to." },
          ]} />
        </div>
      </section>

      <section className="s4-sec" aria-labelledby="rs-collab">
        <div className="s4-wrap rs-collab">
          <div>
            <h2 id="rs-collab" className="s4-h2">Collaborate with StrayPaw</h2>
            <p className="s4-body">Propose a study, ask about de-identified extracts, or work with us on evaluation methods. Requests for partner data need the data owner&rsquo;s approval and, for anything involving people, ethics approval.</p>
          </div>
          <div className="rs-collab-a"><Link href="/research/access" className="s4-btn is-primary">Start a request</Link><Link href="/learn" className="s4-link">Teaching materials are in Education <ArrowRight size={16} aria-hidden /></Link></div>
        </div>
      </section>
    </S4Page>
  );
}
