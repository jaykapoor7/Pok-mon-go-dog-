"use client";

import { useEffect, useRef, useState } from "react";
import { useCount } from "@/components/landing/useCount";

/* Figures on a night ground, counted up from zero the first time they are
   on screen, as the landing's tally does; shown as they are under reduced
   motion. Each keeps its final width so nothing shifts while it counts. */

const fmt = (n: number) => n.toLocaleString("en-IN");

function One({ value, label, run, hot }: { value: number; label: string; run: boolean; hot?: boolean }) {
  const v = useCount(value, run, 1600);
  return (
    <div className={hot ? "is-hot" : undefined}>
      <dd style={{ minWidth: `${fmt(value).length * 0.62}em` }}>{fmt(v)}</dd>
      <dt>{label}</dt>
    </div>
  );
}

export function CountFigures({ figures }: { figures: { value: number; label: string; hot?: boolean }[] }) {
  const el = useRef<HTMLDListElement>(null);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = el.current; if (!node) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return <dl className="co-figs" ref={el}>{figures.map((f) => <One key={f.label} {...f} run={run} />)}</dl>;
}
