"use client";

/* ════════════════════════════════════════════════════════════════════
   Act I · the scraps. How rescue work arrives today: a WhatsApp message,
   a missed call, a photo, a pin, a spreadsheet nobody owns. They drift
   at different depths around the real StrayPaw workspace and lean with
   the pointer. Scrolling (the scene's --p) pulls each one into the app,
   in turn, like a thread drawing scraps into a quilt; the workspace
   flattens and comes forward with the city's real open requests.
   Photos and localities are real public records; the message texts are
   examples of what arrives, not real reports.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, type ReactNode } from "react";
import { Camera, FileSpreadsheet, MapPin, MessageCircle, Mic, PhoneMissed } from "lucide-react";
import { Thread } from "./Thread";

export type Scrap =
  | { k: "msg"; t: string } | { k: "photo"; src: string; id: string } | { k: "pin"; t: string }
  | { k: "voice"; t: string } | { k: "sheet"; t: string } | { k: "call"; t: string };

/* Deterministic places around the workspace: [x%, y%, depth, tilt]. */
const SPOTS: [number, number, number, number][] = [
  [12, 13, 0.9, -6], [34, 11, 0.4, 4], [56, 15, 0.15, 2], [76, 12, 0.7, 7], [91, 22, 0.3, -5], [66, 34, 0.8, 3],
  [89, 45, 0.5, -8], [70, 60, 0.9, 5], [90, 74, 0.35, -4], [64, 87, 0.6, 6], [38, 91, 0.25, -3], [12, 89, 0.5, 9],
];

/* The thread's route: in from the left edge, round every scrap in turn, and into the workspace.
   A Catmull-Rom curve through the points, written as cubic Béziers. */
const ROUTE: [number, number][] = [[-4, 20], ...SPOTS.map(([x, y]) => [x, y] as [number, number]), [50, 58]];
const THREAD = ROUTE.reduce((d, p, i, a) => {
  if (i === 0) return `M${p[0]},${p[1]}`;
  const p0 = a[i - 2] ?? a[i - 1], p1 = a[i - 1], p3 = a[i + 1] ?? p;
  const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6], c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6];
  return `${d} C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p[0]},${p[1]}`;
}, "");

export function Scraps({ scraps, children }: { scraps: Scrap[]; children: ReactNode }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const n = el.current; if (!n || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => { n.style.setProperty("--px", ((e.clientX / innerWidth) - 0.5).toFixed(3)); n.style.setProperty("--py", ((e.clientY / innerHeight) - 0.5).toFixed(3)); };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return (
    <div className="ks" ref={el}>
      <div className="ks-field" aria-hidden>
        <Thread d={THREAD} id="open" className="ks-thread" />
        {scraps.slice(0, SPOTS.length).map((s, i) => {
          const [x, y, z, r] = SPOTS[i];
          return (
            <div key={i} className={`ks-scrap is-${s.k}`} style={{ ["--x" as string]: x, ["--y" as string]: y, ["--z" as string]: z, ["--r" as string]: `${r}deg`, ["--i" as string]: i }}>
              {s.k === "msg" && <><MessageCircle size={14} /><span>{s.t}</span></>}
              {s.k === "photo" && <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={s.src} alt="" loading="lazy" referrerPolicy="no-referrer" /><small><Camera size={11} /> {s.id}</small></>}
              {s.k === "pin" && <><MapPin size={14} /><span>{s.t}</span></>}
              {s.k === "voice" && <><Mic size={14} /><i className="ks-wave" /><span>{s.t}</span></>}
              {s.k === "sheet" && <><FileSpreadsheet size={14} /><span>{s.t}</span></>}
              {s.k === "call" && <><PhoneMissed size={14} /><span>{s.t}</span></>}
            </div>
          );
        })}
      </div>
      <div className="ks-core">{children}</div>
    </div>
  );
}
