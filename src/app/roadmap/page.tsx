import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { S4Page } from "@/sp4/site/kit";
import { ROADMAP } from "@/sp4/site/res/content";
import { DemoBand, ResHero } from "@/sp4/site/res/ResKit";
import "@/sp4/site/res/res.css";

export const metadata = { title: "Roadmap, StrayPaw", description: "What StrayPaw has shipped and what comes next: Kaju, ABC operations, government, a national register, research and education." };

export default function RoadmapPage() {
  return (
    <S4Page className="r7" close={false}>
      <ResHero title={<>StrayPaw roadmap<br />& releases</>} lede="What has shipped and what comes next, up to one national record of India's street animals." art={false} />
      <div className="s4-wrap r7-road">
        {ROADMAP.map((a) => (
          <section key={a.key} className="r7-area" aria-labelledby={`rm-${a.key}`}>
            <div>
              <h2 id={`rm-${a.key}`}>{a.title}</h2>
              <p>{a.lede}</p>
              {a.href && <Link href={a.href}>Learn more <ArrowRight size={15} aria-hidden /></Link>}
            </div>
            <div>
              <div className="r7-road-tabs"><span>Shipped</span><span className="is-up">Upcoming</span></div>
              <ul className="r7-items">{a.items.map((x) => (
                <li key={x.name} className={`is-${x.status}`}><i aria-hidden>{x.status === "shipped" ? <Check size={14} /> : "→"}</i><span>{x.name}{x.note && <small> · {x.note}</small>}<span className="sr-only"> ({x.status})</span></span></li>
              ))}</ul>
            </div>
          </section>
        ))}
      </div>
      <DemoBand title="See what's next, live." sub="We walk partners through what is shipping and what we are building with them." />
    </S4Page>
  );
}
