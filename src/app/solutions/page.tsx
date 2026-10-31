import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PLATFORM, SOLUTIONS } from "@/sp3/site/nav-data";
import { PageHead, S4Page, SecHead, TwoTone } from "@/sp4/site/kit";
import { Rise } from "@/sp4/site/Rise";
import "@/sp4/home/home4.css";

export const metadata = { title: "Solutions · StrayPaw", description: "StrayPaw for ABC operators and NGOs, ABC/ARV programmes, rescue and care, government oversight and community groups." };

export default function SolutionsPage() {
  return (
    <S4Page close={undefined}>
      <PageHead title={<TwoTone a="One operating record," b="for everyone in the programme" />} lede="StrayPaw starts with the funded ABC operator. Rescue, care, community reports and government review run on the same records." />
      <section className="s4-sec" aria-labelledby="sol-list">
        <div className="s4-wrap">
          <h2 id="sol-list" className="s4-h2" style={{ marginBottom: 40 }}>Solutions</h2>
          <div className="s4-tiles">
            {SOLUTIONS.map((s, i) => (
              <Rise key={s.href} delay={(i % 3) * 60}>
                <Link href={s.href} className="s4-tile" style={{ height: "100%" }}>
                  <span className={`s4-ico c-${s.tone ?? "blue"}`} style={{ width: 44, height: 44, borderRadius: 10, marginBottom: 18 }} aria-hidden>{s.icon}</span>
                  <h3>{s.label}</h3><p>{s.hint}</p><span className="s4-link is-sm">Explore <ArrowRight size={14} aria-hidden /></span>
                </Link>
              </Rise>
            ))}
          </div>
        </div>
      </section>
      <section className="s4-sec" aria-labelledby="sol-pf">
        <div className="s4-wrap">
          <SecHead id="sol-pf" title={<TwoTone a="What every solution" b="is built on" />} />
          <div style={{ borderTop: "1px solid var(--s4-line)" }}>
            {PLATFORM.map((m) => (
              <Link key={m.href} href={m.href} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 24, alignItems: "center", padding: "22px 0", borderBottom: "1px solid var(--s4-line)" }}>
                <div><b style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.02em" }}>{m.label}</b><p className="s4-body" style={{ marginTop: 4 }}>{m.hint}</p></div>
                <ArrowRight size={20} aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </S4Page>
  );
}
