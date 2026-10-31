import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, Info } from "lucide-react";
import { CtaBand, PageHead, S3Page, SecHead, StoryCard } from "@/sp3/site/Sections";

export type SolutionSpec = {
  eyebrow: string;
  title: ReactNode;
  lede: ReactNode;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  visual: ReactNode;
  problem: { title: string; body: ReactNode; points: string[] };
  steps: { t: string; d: string }[];
  features: { icon: ReactNode; t: string; d: string; href?: string }[];
  pricing?: ReactNode;
  notes?: ReactNode[];
  story?: string;
  cta: { title: ReactNode; lede?: ReactNode; primary?: { href: string; label: string }; secondary?: { href: string; label: string } };
};

export function SolutionPage({ s }: { s: SolutionSpec }) {
  return (
    <S3Page cta={false}>
      <PageHead eyebrow={s.eyebrow} title={s.title} lede={s.lede}>
        <div className="s3-actions"><Link href={s.primary.href} className="s3-btn is-primary">{s.primary.label} <ArrowRight size={16} /></Link>{s.secondary && <Link href={s.secondary.href} className="s3-btn is-line">{s.secondary.label}</Link>}</div>
      </PageHead>
      <section className="s3-wrap" style={{ paddingBottom: 40 }}>{s.visual}</section>

      <section className="s3-sec">
        <div className="s3-wrap" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 56 }} data-stack>
          <div style={{ display: "grid", gap: 16, alignContent: "start" }}><span className="s3-eyebrow">The problem</span><h2 className="s3-h2">{s.problem.title}</h2></div>
          <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
            <p className="s3-lede">{s.problem.body}</p>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>{s.problem.points.map((p) => <li key={p} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10, fontSize: 15.5, color: "var(--s3-ink-2)" }}><Check size={17} style={{ marginTop: 3, color: "var(--s3-blue)" }} />{p}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="s3-sec is-line">
        <div className="s3-wrap">
          <SecHead eyebrow="Workflow" title="How the work moves." />
          <ol className="s3-steps">{s.steps.map((st, i) => <li key={st.t}><i>{i + 1}</i><b>{st.t}</b><p>{st.d}</p></li>)}</ol>
        </div>
      </section>

      <section className="s3-sec is-line">
        <div className="s3-wrap">
          <SecHead eyebrow="Capabilities" title="What you get." />
          <div className="s3-grid-3">{s.features.map((f) => {
            const body = <><span className="s3-ico" aria-hidden>{f.icon}</span><h3>{f.t}</h3><p>{f.d}</p>{f.href && <span className="s3-link" style={{ fontSize: 14 }}>Learn more <ArrowRight size={13} /></span>}</>;
            return f.href ? <Link key={f.t} href={f.href} className="s3-card s3-feature">{body}</Link> : <div key={f.t} className="s3-card s3-feature">{body}</div>;
          })}</div>
          {s.pricing && <div className="s3-card" style={{ marginTop: 20, padding: 26, display: "grid", gap: 8 }}><b style={{ fontSize: 16 }}>Commercial terms</b><div className="s3-body">{s.pricing}</div></div>}
        </div>
      </section>

      {s.story && <section className="s3-sec is-line"><div className="s3-wrap"><SecHead eyebrow="Customer story" title="In practice." /><StoryCard slug={s.story} /></div></section>}

      {s.notes && s.notes.length > 0 && (
        <section className="s3-sec is-tight is-line"><div className="s3-wrap" style={{ display: "grid", gap: 10 }}>
          <b style={{ fontSize: 15 }}>What to know</b>
          {s.notes.map((n, i) => <p key={i} className="s3-note is-info"><Info size={16} /><span>{n}</span></p>)}
        </div></section>
      )}

      <CtaBand title={s.cta.title} lede={s.cta.lede} primary={s.cta.primary} secondary={s.cta.secondary} />
    </S3Page>
  );
}
