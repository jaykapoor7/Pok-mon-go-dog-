"use client";

/* A product page's features as one showcase instead of a long stack: the
   feature list on the left (the open one shows its detail), its product
   screen on the right; on a phone the screen follows the list. Every
   feature is rendered on the server, so all copy stays on the page for
   search and links; a link to #feature opens it. */

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type FeatureItem = { id?: string; head: ReactNode; detail: ReactNode; art: ReactNode };

export function SplitTabs({ items, label }: { items: FeatureItem[]; label: string }) {
  const [on, setOn] = useState(0);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const up = () => setNarrow(mq.matches); up();
    mq.addEventListener("change", up);
    return () => mq.removeEventListener("change", up);
  }, []);
  useEffect(() => {
    const pick = () => {
      const h = window.location.hash.slice(1);
      const i = items.findIndex((x) => x.id === h);
      if (i >= 0) { setOn(i); document.getElementById("s4-feat")?.scrollIntoView({ block: "start" }); }
    };
    pick(); window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, [items]);
  return (
    <section className="s4-sec s4-feat" id="s4-feat" aria-label={label} style={{ scrollMarginTop: 80 }}>
      <div className="s4-wrap s4-feat-in">
        <ol className="s4-feat-list">
          {items.map((x, i) => (
            <li key={i} id={x.id} className={on === i ? "is-on" : undefined}>
              <h3 className="s4-feat-hd"><button type="button" aria-expanded={on === i} aria-controls={`s4-fd-${i}`} onClick={() => setOn(i)}>
                <span className="s4-feat-n" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                <span className="s4-feat-h">{x.head}</span>
                <ChevronDown size={18} className="s4-feat-chev" aria-hidden />
              </button></h3>
              <div id={`s4-fd-${i}`} className="s4-feat-detail" hidden={on !== i}>{x.detail}{narrow && on === i && <div className="s4-feat-art is-inline">{x.art}</div>}</div>
            </li>
          ))}
        </ol>
        {!narrow && <div className="s4-feat-stage">
          {items.map((x, i) => (
            <div key={i} className="s4-feat-art" hidden={on !== i}>{x.art}</div>
          ))}
        </div>}
      </div>
    </section>
  );
}
