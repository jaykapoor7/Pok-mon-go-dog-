"use client";

/* A report becomes a record.

   Real reports from the public record cycle through the three stages the
   register actually performs: the report arrives, it is matched to an
   animal's permanent record, and the coverage of that part of the city
   moves. It explains the system rather than decorating the page. */

import { useEffect, useState } from "react";

export type MItem = { id: string; img: string; zone: string; at: string; record: string; status: string; hex: string };
export type MHex = { key: string; points: string };

export function Machine({ items, hexes }: { items: MItem[]; hexes: MHex[] }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState(0);
  const [rows, setRows] = useState<MItem[]>(items.slice(1, 5));
  const [lit, setLit] = useState<Set<string>>(new Set(items.slice(1, 5).map((x) => x.hex)));
  const it = items[i % items.length];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setPhase(4); return; }
    const t = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => { setPhase(3); setRows((r) => [it, ...r].slice(0, 5)); }, 2200),
      setTimeout(() => { setPhase(4); setLit((s) => new Set(s).add(it.hex)); }, 2800),
      setTimeout(() => { setPhase(0); setI((n) => n + 1); }, 5200),
    ];
    return () => t.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  return (
    <div className="ci-machine" aria-live="polite">
      <span className="lbl"><span>How a report becomes a record · live from the public register</span><span className="mono">{String((i % items.length) + 1).padStart(2, "0")}/{String(items.length).padStart(2, "0")}</span></span>
      <div className={`ci-slip${phase >= 1 ? " stamped" : ""}`} key={it.id} style={{ opacity: phase === 0 ? 0.001 : 1, transform: phase === 0 ? "translateY(10px)" : "none" }}>
        <img src={it.img} alt={`Report photograph, ${it.zone}`} />
        <div>
          <span className="lbl">01 · Report received</span>
          <b>{it.zone}</b>
          <small>{it.at}</small>
          <small>Photo · location · {it.status === "injured" ? "reported injured" : "seen"}</small>
        </div>
        <span className="ci-stamp">MATCHED {it.record}</span>
      </div>
      <div className={`ci-arrow${phase >= 2 ? " go" : ""}`} aria-hidden><i /></div>
      <div className="ci-reg">
        <div className="ci-reg-h lbl"><span>02 · Record</span><span>Locality</span><span>Filed</span><span>Status</span></div>
        {rows.map((r, n) => (
          <div key={`${r.id}-${n}`} className={`ci-reg-r${n === 0 && phase >= 3 && r.id === it.id ? " new" : ""}`}>
            <span className="mono">{r.record}</span><span>{r.zone}</span><span className="mono">{r.at.slice(0, 6)}</span><span className="lbl" style={{ color: r.status === "injured" ? "#c2391c" : "#1a3f99" }}>{r.status === "injured" ? "Injured" : "Seen"}</span>
          </div>
        ))}
      </div>
      <div className="ci-arrow go" aria-hidden style={{ opacity: phase >= 4 ? 1 : 0.3 }}><i style={{ transform: phase >= 4 ? "scaleX(1)" : "scaleX(0)" }} /></div>
      <figure className="ci-hexes">
        <svg viewBox="0 0 200 200" role="img" aria-label="Coverage of Delhi by hexagon">
          {hexes.map((h) => <polygon key={h.key} points={h.points} fill={h.key === it.hex && phase >= 4 ? "#2457ce" : lit.has(h.key) ? "#a9c0ee" : "#dfe3ea"} stroke="#efefeb" strokeWidth={1} />)}
        </svg>
        <figcaption className="lbl">03 · Coverage, Delhi</figcaption>
      </figure>
    </div>
  );
}
