"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, FileSpreadsheet } from "lucide-react";

/* Customer results, on the reference's mechanism: one featured story card
   and tiles beside it; choosing a tile brings its story forward. Only real
   partners; no quotes until a partner approves one in writing. */
export type StoryLite = { slug: string; name: string; city: string; logo?: string; line: string; note: string; registers: [string, string][] };

export function Stories({ stories }: { stories: StoryLite[] }) {
  const [i, setI] = useState(0);
  const s = stories[i];
  return (
    <div className="s4-story">
      <div key={s.slug} className="s4-story-card s4d-fade">
        <span className="s4-story-logo">{s.logo ? <img src={s.logo} alt="" /> : <span className="s4-story-mono" aria-hidden>{s.name.split(" ").filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("")}</span>}{s.name}</span>
        <p>{s.line}</p>
        <div><small>{s.note}</small>
          <Link href={`/customers/${s.slug}`} className="s4-link" style={{ marginTop: 18 }}>Read case study <ArrowRight size={16} aria-hidden /></Link></div>
      </div>
      {stories.map((x, k) => (
        <button key={x.slug} type="button" className={`s4-story-pick t-${k % 2 ? "teal" : "blue"}${k === i ? " is-on" : ""}`} aria-pressed={k === i} onClick={() => setI(k)}>
          <span className="s4-ui s4-ui-pad s4-reg">
            <span className="s4u-sq c-blue" aria-hidden><FileSpreadsheet size={11} /></span>
            <b>{x.name}</b><small>{x.city}</small>
            {x.registers.map(([a, b]) => <small key={a}>{a} · {b}</small>)}
            <span className="s4-tag">Historical imported record</span>
          </span>
        </button>
      ))}
      <Link href="/demo" className="s4-story-pick is-next">
        <span className="s4-ui s4-ui-pad s4-reg"><b>Your programme</b><small>Bring your registers and see them on one record.</small><span className="s4-tag is-blue">Book a demo</span></span>
      </Link>
    </div>
  );
}
