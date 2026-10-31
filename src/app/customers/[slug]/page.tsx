import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import { RELATIONSHIP_LABEL, STORIES, storyBySlug } from "@/sp3/customers";
import { S4Page, TwoTone } from "@/sp4/site/kit";
import { Grain } from "@/sp4/site/Grain";
import "@/sp4/home/home4.css";

export function generateStaticParams() { return STORIES.map((s) => ({ slug: s.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const s = storyBySlug((await params).slug);
  return s ? { title: `${s.name} · Customer story · StrayPaw`, description: s.summary } : {};
}

const month = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }) : "—");

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = storyBySlug((await params).slug);
  if (!s) notFound();
  return (
    <S4Page close={undefined}>
      <article>
        <header className="s4-wrap s4-head">
          <Link href="/customers" className="s4-link is-sm" style={{ color: "var(--s4-grey)" }}><ArrowLeft size={14} aria-hidden /> Customers</Link>
          <span className="s4-tag" style={{ height: 28, fontSize: 13 }}>{s.city} · {RELATIONSHIP_LABEL[s.relationship]}</span>
          <h1 className="s4-h1" style={{ maxWidth: 940 }}>{s.name}</h1>
          <p className="s4-lede">{s.summary}</p>
        </header>
        <section className="s4-wrap" style={{ paddingTop: 64 }}>
          <Grain v={2} id="st-hero" style={{ borderRadius: 16, padding: "56px 32px", display: "grid", placeItems: "center" }}>
            <div className="s4-ui s4-ui-pad" style={{ width: "min(880px,100%)", display: "grid", gridTemplateColumns: `repeat(${s.results.length}, minmax(0,1fr))`, gap: 24 }}>
              {s.results.map((r) => <div key={r.label} style={{ display: "grid", gap: 4 }}><b style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.045em" }}>{r.n.toLocaleString("en-IN")}</b><span style={{ fontSize: 14.5 }}>{r.label}</span><small className="s4-ui-sub">{r.note}</small></div>)}
            </div>
          </Grain>
        </section>
        <section className="s4-sec">
          <div className="s4-wrap s4-docs" style={{ paddingTop: 0 }}>
            <aside style={{ display: "grid", gap: 18, alignContent: "start" }}>
              {s.logo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.logo} alt={`${s.name} logo`} width={112} height={104} style={{ borderRadius: 12, background: "#fff", boxShadow: "0 0 0 1px var(--s4-line)" }} />}
              <div style={{ display: "grid", gap: 8 }}><b style={{ fontSize: 14, fontWeight: 500 }}>Workflows used</b>{s.workflows.map((w) => <Link key={w.href} href={w.href} className="s4-link is-sm">{w.label} <ArrowRight size={13} aria-hidden /></Link>)}</div>
            </aside>
            <div style={{ display: "grid", gap: 48, maxWidth: 760 }}>
              <div style={{ display: "grid", gap: 14 }}><h2 className="s4-h3" style={{ fontSize: 30 }}>The problem</h2><p className="s4-lede" style={{ fontSize: 18 }}>{s.problem}</p></div>
              <div style={{ display: "grid", gap: 14 }}><h2 className="s4-h3" style={{ fontSize: 30 }}>How StrayPaw is used</h2>
                <ul style={{ display: "grid", gap: 12 }}>{s.how.map((h) => <li key={h} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 12, fontSize: 17, lineHeight: 1.5, color: "var(--s4-ink-2)" }}><Check size={18} style={{ marginTop: 3, color: "var(--s4-blue)" }} aria-hidden />{h}</li>)}</ul></div>
              <div style={{ display: "grid", gap: 14 }}><h2 className="s4-h3" style={{ fontSize: 30 }}>Programmes on the record</h2>
                <div style={{ overflowX: "auto", borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--s4-line)" }}>
                  <table className="s4u-table" style={{ fontSize: 14.5 }}><thead><tr><th scope="col">Programme</th><th scope="col">Period</th><th scope="col">Recorded</th></tr></thead>
                    <tbody>{s.programmes.map((p) => <tr key={p.id}><td style={{ whiteSpace: "normal" }}><Link href={`/city/programmes/${p.id}`}>{p.name}</Link></td><td>{month(p.starts_on)} – {month(p.ends_on)}</td><td>{(p.animals_recorded ?? 0).toLocaleString("en-IN")} animals</td></tr>)}</tbody></table>
                </div></div>
              <div style={{ display: "grid", gap: 12 }}><h2 className="s4-h3" style={{ fontSize: 30 }}>Limitations</h2>
                {s.limits.map((l) => <p key={l} className="s4-note"><Info size={18} aria-hidden /><span>{l}</span></p>)}</div>
              <p className="s4-small">No testimonial is shown: we publish quotes only after the organisation approves the wording.</p>
            </div>
          </div>
        </section>
      </article>
    </S4Page>
  );
}
