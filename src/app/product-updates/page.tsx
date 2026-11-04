import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { S4Page } from "@/sp4/site/kit";
import { UPDATES, dateLabel } from "@/sp4/site/res/content";
import { DemoBand, ResHero } from "@/sp4/site/res/ResKit";
import "@/sp4/site/res/res.css";

export const metadata = { title: "Product updates · StrayPaw", description: "Every StrayPaw release in one place: what shipped, when, and what it changes for your team." };

export default function UpdatesPage() {
  return (
    <S4Page className="r7" close={false}>
      <ResHero title="Every release, in one place." lede="We ship most weeks. Most of it starts as feedback from field teams, vets and offices.">
        <div className="s7-row" style={{ gap: 12 }}><Link href="/roadmap" className="r7-btn is-blue">See the roadmap <ArrowRight size={16} aria-hidden /></Link></div>
      </ResHero>
      <section className="r7-sec">
        <div className="s4-wrap">
          <div className="r7-sec-h"><h2>The latest from the platform</h2></div>
          <ol className="r7-latest">{UPDATES.slice(0, 5).map((u) => <li key={u.title}><small>{u.area} · {dateLabel(u.date)}</small><b>{u.title}</b><p>{u.body}</p></li>)}</ol>
        </div>
      </section>
      <section className="r7-sec is-alt">
        <div className="s4-wrap">
          <div className="r7-sec-h"><h2>All recent product updates</h2><Link href="/blog?kind=Product%20updates">Release notes on the blog <ArrowRight size={16} aria-hidden /></Link></div>
          <ol className="r7-log">{UPDATES.map((u) => <li key={u.title}><time dateTime={u.date}>{dateLabel(u.date)}</time><em>{u.area}</em><div><b>{u.title}</b><p>{u.body}</p></div></li>)}</ol>
        </div>
      </section>
      <DemoBand />
    </S4Page>
  );
}
