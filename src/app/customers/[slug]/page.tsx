import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import { RELATIONSHIP_LABEL, STORIES, storyBySlug } from "@/sp3/customers";
import { CtaBand, S3Page } from "@/sp3/site/Sections";

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
    <S3Page cta={false}>
      <article>
        <header className="s3-wrap s3-page-head">
          <Link href="/customers" className="s3-link" style={{ fontSize: 14 }}><ArrowLeft size={14} /> Customers</Link>
          <span className="s3-chip" style={{ width: "fit-content" }}>{s.city} · {RELATIONSHIP_LABEL[s.relationship]}</span>
          <h1 className="s3-h1">{s.name}</h1>
          <p className="s3-lede">{s.summary}</p>
        </header>
        <section className="s3-wrap"><div className="s3-stats">{s.results.map((r) => <div key={r.label}><b className="s3-num">{r.n.toLocaleString("en-IN")}</b><span>{r.label}</span><small>{r.note}</small></div>)}</div></section>
        <section className="s3-sec"><div className="s3-wrap" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 56 }} data-stack>
          <aside style={{ display: "grid", gap: 18, alignContent: "start" }}>
            {s.logo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.logo} alt={`${s.name} logo`} width={120} height={112} style={{ borderRadius: 12, boxShadow: "var(--s3-sh-1)" }} />}
            <div className="s3-small" style={{ color: "var(--s3-mute)", display: "grid", gap: 6 }}><b style={{ color: "var(--s3-ink)" }}>Workflows used</b>{s.workflows.map((w) => <Link key={w.href} href={w.href} className="s3-link" style={{ fontSize: 14 }}>{w.label}</Link>)}</div>
          </aside>
          <div style={{ display: "grid", gap: 40, maxWidth: 720 }}>
            <div style={{ display: "grid", gap: 12 }}><h2 className="s3-h3">The problem</h2><p className="s3-body" style={{ fontSize: 17 }}>{s.problem}</p></div>
            <div style={{ display: "grid", gap: 12 }}><h2 className="s3-h3">How StrayPaw is used</h2><ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>{s.how.map((h) => <li key={h} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10, fontSize: 16 }}><Check size={17} style={{ marginTop: 3, color: "var(--s3-blue)" }} />{h}</li>)}</ul></div>
            <div style={{ display: "grid", gap: 12 }}><h2 className="s3-h3">Programmes on the record</h2>
              <div className="s3-card" style={{ overflowX: "auto" }}><table className="s3-table" style={{ fontSize: 14 }}><thead><tr><th scope="col">Programme</th><th scope="col">Period</th><th scope="col">Recorded</th></tr></thead><tbody>
                {s.programmes.map((p) => <tr key={p.id}><td style={{ whiteSpace: "normal" }}><Link className="s3-link" style={{ fontSize: 14 }} href={`/city/programmes/${p.id}`}>{p.name}</Link></td><td>{month(p.starts_on)} – {month(p.ends_on)}</td><td style={{ whiteSpace: "normal" }}>{p.public_summary}</td></tr>)}
              </tbody></table></div>
            </div>
            <div style={{ display: "grid", gap: 12 }}><h2 className="s3-h3">Limitations</h2>{s.limits.map((l) => <p key={l} className="s3-note is-info"><Info size={16} /><span>{l}</span></p>)}</div>
            <p className="s3-small">No testimonial is shown: we publish quotes only after the organisation approves the wording.</p>
          </div>
        </div></section>
      </article>
      <CtaBand title="Want results like these on your own register?" primary={{ href: "/partner-apply", label: "Apply for a workspace" }} secondary={{ href: "/customers", label: "More stories" }} />
      <p className="s3-wrap" style={{ paddingBottom: 32 }}><Link className="s3-link" href="/for-governments">For municipalities <ArrowRight size={14} /></Link></p>
    </S3Page>
  );
}
