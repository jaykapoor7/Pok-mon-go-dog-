import Link from "next/link";
import { notFound } from "next/navigation";
import { S4Page } from "@/sp4/site/kit";
import { KajuFace } from "@/kaju/Kaju";
import { TEAMS } from "@/sp4/site/res/content";
import { DemoBand, ResHero } from "@/sp4/site/res/ResKit";
import "@/sp4/site/res/res.css";

export function generateStaticParams() { return TEAMS.map((t) => ({ role: t.key })); }
export async function generateMetadata({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params; const t = TEAMS.find((x) => x.key === role);
  return t ? { title: `StrayPaw for ${t.label.toLowerCase()}`, description: t.lede } : {};
}

export default async function TeamPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params; const t = TEAMS.find((x) => x.key === role);
  if (!t) notFound();
  return (
    <S4Page className="r7" close={false}>
      <ResHero title={t.title} lede={t.lede}>
        <div className="s7-row" style={{ gap: 12 }}><Link href="/demo" className="r7-btn is-blue">Book a demo</Link><Link href="/platform" className="r7-btn is-ghost">See the platform</Link></div>
      </ResHero>
      <section className="r7-sec">
        <div className="s4-wrap">
          <div className="r7-sec-h"><h2>Built for {t.label.toLowerCase()}</h2></div>
          <div className="r7-team-pts">{t.points.map((p) => <article key={p.h}><h3>{p.h}</h3><p>{p.p}</p></article>)}</div>
        </div>
      </section>
      <section className="r7-sec" style={{ paddingTop: 0 }}>
        <div className="s4-wrap">
          <div className="r7-team-k">
            <span className="r7-k" aria-hidden><KajuFace size={60} /></span>
            <div><h2>What Kaju does for {t.label.toLowerCase()}</h2><ul>{t.kaju.map((k) => <li key={k}>{k}</li>)}</ul></div>
          </div>
        </div>
      </section>
      <section className="r7-sec is-alt">
        <div className="s4-wrap">
          <div className="r7-sec-h"><h2>Other teams on StrayPaw</h2></div>
          <div className="r7-others">{TEAMS.filter((x) => x.key !== t.key).map((x) => <Link key={x.key} href={`/teams/${x.key}`}>{x.label}</Link>)}</div>
        </div>
      </section>
      <DemoBand />
    </S4Page>
  );
}
