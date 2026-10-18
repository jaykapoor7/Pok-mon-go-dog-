"use client";

/* The chapter rail: a column of dots at the edge, one per scene. The current one is lit and
   named; any of them takes you there. It hides on phones, where the page is read in one thumb. */

import { useEffect, useState } from "react";

export function Rail({ chapters }: { chapters: { id: string; label: string }[] }) {
  const [at, setAt] = useState(chapters[0]?.id ?? "");
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const mid = window.innerHeight * 0.5;
      let cur = chapters[0]?.id ?? "";
      for (const c of chapters) { const n = document.getElementById(c.id); if (n && n.getBoundingClientRect().top <= mid) cur = c.id; }
      setAt(cur);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, [chapters]);
  return (
    <nav className="b-rail" aria-label="Chapters">
      <ol>{chapters.map((c) => (
        <li key={c.id}><a href={`#${c.id}`} aria-current={at === c.id ? "true" : undefined}><i aria-hidden /><span>{c.label}</span></a></li>
      ))}</ol>
    </nav>
  );
}
