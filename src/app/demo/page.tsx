import { Suspense, type ReactNode } from "react";
import { CalendarCheck, FileSearch, Users } from "lucide-react";
import { DemoForm } from "@/sp3/site/DemoForm";
import { S4Page } from "@/sp4/site/kit";

export const metadata = { title: "Book a demo · StrayPaw", description: "See StrayPaw on an ABC programme like yours, or scope a pilot on one programme." };

const POINTS: [ReactNode, string, string][] = [
  [<FileSearch key="a" size={18} />, "Your workflow, not a script", "We walk through capture, treatment, evidence, review and the report package using a programme like yours."],
  [<Users key="b" size={18} />, "Bring the people who do the work", "Your coordinator, a vet and someone from the field team get the most out of it."],
  [<CalendarCheck key="c" size={18} />, "Nothing starts without agreement", "A pilot is scoped in writing first: wards, team, registers to import and what success means."],
];

export default function DemoPage() {
  return (
    <S4Page close={false}>
      <section className="s4-wrap" style={{ display: "grid", gridTemplateColumns: "minmax(0,0.9fr) minmax(0,1.1fr)", gap: 64, alignItems: "start", padding: "112px var(--s4-gut) 128px" }} data-s4-stack>
        <div style={{ display: "grid", gap: 24 }}>
          <h1 className="s4-h1"><span className="s4-tt"><span>See StrayPaw on</span><span>a programme like yours</span></span></h1>
          <p className="s4-lede">A 30-minute walkthrough with the team that builds it, on the operator workspace, StrayPaw AI and the report package a reviewing office receives.</p>
          <ul style={{ display: "grid", gap: 22, marginTop: 12 }}>
            {POINTS.map(([i, t, d]) => (
              <li key={t} style={{ display: "grid", gridTemplateColumns: "40px 1fr", gap: 14 }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--s4-tile)", color: "var(--s4-blue)" }}>{i}</span>
                <span><b style={{ display: "block", fontSize: 17, fontWeight: 500, letterSpacing: "-0.02em" }}>{t}</b><span className="s4-body">{d}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <Suspense fallback={<div className="s4-form" style={{ minHeight: 560 }} />}><DemoForm /></Suspense>
      </section>
    </S4Page>
  );
}
