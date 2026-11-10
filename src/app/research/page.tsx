import Link from "next/link";
import { ArrowRight, BookOpen, Database, FlaskConical, Scale } from "lucide-react";
import { S4Page, TwoTone } from "@/sp4/site/kit";
import { ACCESS_LABEL, DATASETS, PROJECTS, STATUS_LABEL, type Status } from "@/sp4/research/catalogue";
import "@/sp4/home/home4.css";
import "@/sp4/research/research.css";

export const metadata = {
  title: "Research · StrayPaw",
  description: "StrayPaw Research: a dataset catalogue with provenance and limits, methods for animal-level programme records, research in progress and controlled access to partner data.",
};

export default function ResearchPage() {
  const count = (s: Status) => PROJECTS.filter((p) => p.status === s).length;
  const byAccess = (["open", "request", "restricted"] as const).map((k) => ({ k, n: DATASETS.filter((d) => d.access === k).length })).filter((x) => x.n > 0);
  return (
    <S4Page close={undefined}>
      <section className="rs-top">
        <div className="s4-wrap rs-top-in">
          <div className="rs-top-main">
            <p className="rs-eyebrow">StrayPaw Research</p>
            <h1 className="rs-h1"><TwoTone a="Records you can check," b="data you can cite" /></h1>
            <p className="rs-lede">For researchers working on dog populations and rabies in India. Every dataset states its source, licence and limits.</p>
            <div className="rs-actions"><Link href="/research/datasets" className="s4-btn is-primary">Browse datasets</Link><Link href="/research/workbench" className="s4-btn is-line">Open the workbench</Link><Link href="/research/access" className="s4-btn is-line">Request data access</Link><a href="https://kapoorjay.com/research-models/index.html" className="s4-btn is-line">Try the research models</a></div>
          </div>
          <aside className="rs-glance" aria-label="Catalogue at a glance">
            <p className="rs-glance-h">Catalogue at a glance</p>
            <dl>
              <div><dt>Datasets</dt><dd>{DATASETS.length}</dd></div>
              {byAccess.map((x) => <div key={x.k}><dt><span className={`rs-pill is-${x.k}`}>{ACCESS_LABEL[x.k]}</span></dt><dd>{x.n}</dd></div>)}
            </dl>
            <p className="rs-glance-h">Research by status</p>
            <ul className="rs-glance-st">{(["published", "in_progress", "proposed"] as Status[]).map((st) => <li key={st}><Link href={`/research/projects#${st}`}><span className={`rs-pill is-${st}`}>{STATUS_LABEL[st]}</span><b>{count(st)}</b></Link></li>)}</ul>
            <p className="rs-glance-note">No StrayPaw paper is published yet. Proposed studies have no data behind them.</p>
          </aside>
        </div>
      </section>

      <section className="s4-sec rs-body" aria-labelledby="rs-cat">
        <div className="s4-wrap rs-cols">
          <div>
            <div className="rs-sec-h"><h2 id="rs-cat" className="rs-h2">Dataset catalogue</h2><Link href="/research/datasets" className="s4-link">Full catalogue <ArrowRight size={15} aria-hidden /></Link></div>
            <ul className="rs-list">
              {DATASETS.map((d) => <li key={d.id}><Link href={`/research/datasets#${d.id}`}><span><b>{d.title}</b><small>{d.holder} · {d.geography}</small></span><span className={`rs-pill is-${d.access}`}>{ACCESS_LABEL[d.access]}</span><ArrowRight size={15} aria-hidden /></Link></li>)}
            </ul>
          </div>
          <aside aria-labelledby="rs-method">
            <div className="rs-sec-h"><h2 id="rs-method" className="rs-h2">How every number is treated</h2></div>
            <ul className="rs-rules">
              <li><Database size={16} aria-hidden /><span><b>Recorded, not estimated.</b> A count is a count of records, never a population estimate or coverage.</span></li>
              <li><Scale size={16} aria-hidden /><span><b>Source on every row.</b> Imported rows keep their file and organisation; programme records keep evidence and sign-offs.</span></li>
              <li><FlaskConical size={16} aria-hidden /><span><b>Research stays research.</b> Historical datasets never count as current work.</span></li>
              <li><BookOpen size={16} aria-hidden /><span><b>Cited and licensed.</b> Third-party data is credited; nothing is redistributed without the right to.</span></li>
            </ul>
            <Link href="/research-standards" className="s4-link">Research standards <ArrowRight size={15} aria-hidden /></Link>
          </aside>
        </div>
      </section>

      <section className="s4-sec rs-body" aria-labelledby="rs-collab">
        <div className="s4-wrap rs-collab">
          <div>
            <h2 id="rs-collab" className="rs-h2">Collaborate with StrayPaw</h2>
            <p className="s4-body">Propose a study, ask about de-identified extracts, or work with us on evaluation methods. Partner data needs the owner&rsquo;s approval and, for anything involving people, ethics approval.</p>
          </div>
          <div className="rs-collab-a"><Link href="/research/access" className="s4-btn is-primary">Start a request</Link><Link href="/learn" className="s4-link">Teaching materials are in Education <ArrowRight size={16} aria-hidden /></Link></div>
        </div>
      </section>
    </S4Page>
  );
}
