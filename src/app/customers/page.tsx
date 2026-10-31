import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { RELATIONSHIP_LABEL, STORIES, fieldPartnerStrip } from "@/sp3/customers";
import { PageHead, S4Page, SecHead, TwoTone } from "@/sp4/site/kit";
import { Grain } from "@/sp4/site/Grain";
import { Rise } from "@/sp4/site/Rise";
import "@/sp4/home/home4.css";

export const metadata = { title: "Customers · StrayPaw", description: "The organisations whose records are on StrayPaw, what they use it for, and what we have and have not measured." };

export default function CustomersPage() {
  const all = fieldPartnerStrip();
  return (
    <S4Page close={undefined}>
      <PageHead title={<TwoTone a="Built with the teams" b="doing the work" />} lede="Our first partners brought years of field records onto StrayPaw. Each story says what was imported, what is used day to day, and what has not been measured yet." />

      <section className="s4-wrap" style={{ paddingTop: 72 }}>
        <div className="s4-nums" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
          <Rise><b>1</b><small>operational partner using<br />a workspace day to day</small></Rise>
          <Rise delay={60}><b>{all.length}</b><small>confirmed field partners,<br />each labelled below</small></Rise>
          <Rise delay={120}><b>0</b><small>municipal deployments live.<br />The first pilot is being scoped.</small></Rise>
        </div>
      </section>

      <section className="s4-sec" aria-labelledby="cs-stories">
        <div className="s4-wrap">
          <h2 id="cs-stories" className="s4-h2" style={{ marginBottom: 48 }}><TwoTone a="Customer" b="stories" /></h2>
          <div style={{ display: "grid", gap: 12 }}>
            {STORIES.map((s, n) => (
              <Rise key={s.slug} className="s4-story" style={{ gridTemplateColumns: "minmax(0,1.05fr) minmax(0,1.26fr)" }}>
                <div className="s4-story-card" style={{ minHeight: 380 }}>
                  <span className="s4-story-logo">{s.logo && <img src={s.logo} alt="" />}{s.name}</span>
                  <p>{s.summary}</p>
                  <div><small>{s.city} · {RELATIONSHIP_LABEL[s.relationship]}</small><Link href={`/customers/${s.slug}`} className="s4-link" style={{ marginTop: 16 }}>Read case study <ArrowRight size={16} aria-hidden /></Link></div>
                </div>
                <Grain v={n + 2} id={`cs-${n}`} className="s4-story-figs" style={{ borderRadius: 16, display: "grid", placeItems: "center", padding: 28 }}>
                  <div className="s4-ui s4-ui-pad" style={{ width: "min(460px, 100%)", display: "grid", gap: 14 }}>
                    {s.results.map((r) => <div key={r.label} style={{ display: "grid", gap: 2 }}><b style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.04em" }}>{r.n.toLocaleString("en-IN")}</b><span style={{ fontSize: 14 }}>{r.label}</span><small className="s4-ui-sub">{r.note}</small></div>)}
                    <small className="s4-ui-sub" style={{ borderTop: "1px solid var(--s4-line)", paddingTop: 10 }}>Imported historical register · time saved not yet measured</small>
                  </div>
                </Grain>
              </Rise>
            ))}
          </div>
        </div>
      </section>

      <section className="s4-sec" aria-labelledby="cs-all">
        <div className="s4-wrap">
          <SecHead id="cs-all" title={<TwoTone a="Every partner," b="labelled honestly" />} lede="A listing is not a deployment. Operational partners use a workspace; field partners' records are on StrayPaw with credit." />
          <div className="s4-wall">
            {all.map((p) => {
              const s = STORIES.find((x) => x.name === p.name);
              const inner = <>{s && <span className="s4-cs">Case study <ArrowUpRight size={11} /></span>}<span><b>{p.name}</b><small><MapPin size={10} style={{ verticalAlign: -1 }} /> {p.city} · {RELATIONSHIP_LABEL[p.relationship].split(" · ")[0]}</small></span></>;
              return s ? <Link key={p.name} href={`/customers/${s.slug}`}>{inner}</Link> : <div key={p.name}>{inner}</div>;
            })}
          </div>
        </div>
      </section>
    </S4Page>
  );
}
