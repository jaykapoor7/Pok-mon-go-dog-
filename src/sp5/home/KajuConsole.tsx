"use client";

/* Kaju, as one object instead of three cards: three things it does on the
   left, the product screen for the chosen one on the right. It advances by
   itself until a person chooses, pauses while hovered or focused, and does
   not advance at all under reduced motion. */

import { useEffect, useState, type ReactNode } from "react";
import { Live } from "@/sp4/site/Live";

export type ConsoleItem = { title: string; body: string; ui: ReactNode };
const BEAT = 5200;

export function KajuConsole({ items }: { items: ConsoleItem[] }) {
  const [on, setOn] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (!auto || hold || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setOn((v) => (v + 1) % items.length), BEAT);
    return () => window.clearInterval(id);
  }, [auto, hold, items.length]);
  return (
    <div className={`s8-con${auto && !hold ? " is-auto" : ""}`} onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      <div className="s8-con-list" role="tablist" aria-label="What Kaju does" aria-orientation="vertical">
        {items.map((it, i) => (
          <button key={it.title} type="button" role="tab" id={`s8-con-t${i}`} aria-selected={on === i} aria-controls="s8-con-panel" className={on === i ? "is-on" : undefined} onClick={() => { setOn(i); setAuto(false); }}>
            <span className="s8-con-n" aria-hidden>{i + 1}</span>
            <span><b>{it.title}</b><small>{it.body}</small></span>
            {on === i && <i className="s8-con-bar" aria-hidden style={{ animationDuration: `${BEAT}ms` }} />}
          </button>
        ))}
      </div>
      <div className="s8-con-stage" role="tabpanel" id="s8-con-panel" aria-labelledby={`s8-con-t${on}`}>
        <div key={on} className="s8-con-ui"><Live>{items[on].ui}</Live></div>
        <p className="s8-note">Product demo · illustrative records</p>
      </div>
    </div>
  );
}
