import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { S4Page } from "@/sp4/site/kit";
import { SESSIONS } from "@/sp4/site/res/content";
import { CoverArt, DemoBand, ResHero } from "@/sp4/site/res/ResKit";
import "@/sp4/site/res/res.css";

export const metadata = { title: "Events & webinars · StrayPaw", description: "Live sessions and workshops for programme leads, coordinators, municipal reviewers and schools." };

const TONES = ["split", "blue", "navy", "tint"] as const;

export default function EventsPage() {
  return (
    <S4Page className="r7" close={false}>
      <ResHero title="Live sessions with practitioners." lede="Short, practical sessions for programme teams, municipal reviewers and schools. They run on request while our first dated series is scheduled." />
      <section className="r7-sec" style={{ paddingBottom: 0 }}>
        <div className="s4-wrap"><div className="r7-sec-h"><h2>Sessions you can book</h2></div></div>
      </section>
      <div className="s4-wrap">
        <div className="r7-sessions" style={{ paddingTop: 0 }}>
          {SESSIONS.map((s, i) => (
            <article key={s.title} className="r7-session">
              <CoverArt c={{ tone: TONES[i % TONES.length], label: s.kind, word: "" }} />
              <div className="r7-session-b">
                <p className="r7-meta">{s.kind} · {s.length}</p>
                <h3>{s.title}</h3>
                <p><b>For:</b> {s.who}</p>
                <p>{s.body}</p>
                <Link href={s.cta.href}>{s.cta.label} <ArrowRight size={15} aria-hidden /></Link>
              </div>
            </article>
          ))}
        </div>
      </div>
      <DemoBand title="Meet us in person." sub="We visit programmes and municipal offices across India. Tell us where you are." />
    </S4Page>
  );
}
