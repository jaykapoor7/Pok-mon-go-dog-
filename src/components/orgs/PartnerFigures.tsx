"use client";

import { useEffect, useRef, useState } from "react";
import { useCount } from "@/components/landing/useCount";

/* A partner's public figures, counted up from zero the first time they are
   on screen; shown as they are under reduced motion. */

const fmt = (n: number) => n.toLocaleString("en-IN");

function Figure({ value, label, run }: { value: number; label: string; run: boolean }) {
  const v = useCount(value, run, 1400);
  return (
    <div className="pp-fig">
      <dd style={{ minWidth: `${fmt(value).length * 0.6}em` }}>{fmt(v)}</dd>
      <dt>{label}</dt>
    </div>
  );
}

export function PartnerFigures({ figures }: { figures: { value: number; label: string }[] }) {
  const el = useRef<HTMLDListElement>(null);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = el.current; if (!node) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return (
    <dl className="pp-figs" ref={el}>
      {figures.map((f) => <Figure key={f.label} value={f.value} label={f.label} run={run} />)}
    </dl>
  );
}
