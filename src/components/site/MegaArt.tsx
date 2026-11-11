import Link from "next/link";
import { ArrowRight } from "lucide-react";

/* A small drawing in a menu, so the panel shows its idea as well as listing
   links. The lines draw and the points arrive when the panel opens; under
   reduced motion the finished drawing is simply there. Decorative. */

const ROLES: [number, number, string][] = [[40, 30, "#f0674c"], [40, 92, "#2b8a5f"], [220, 30, "#8f7cf0"], [220, 92, "#e9963a"], [130, 12, "#6d8ff0"]];
const PINS: [number, number, string][] = [[36, 44, "#6d8ff0"], [84, 86, "#48b07a"], [128, 34, "#6d8ff0"], [176, 70, "#e9963a"], [222, 30, "#48b07a"], [204, 100, "#6d8ff0"]];

export function MegaArt({ kind }: { kind: "roles" | "map" }) {
  const roles = kind === "roles";
  return (
    <Link href={roles ? "/platform#one-health" : "/explore"} className="s4-mega-art">
      <span className="s4-mega-agents-h">{roles ? "One record, every institution" : "Open to everyone"}</span>
      <svg viewBox="0 0 260 122" aria-hidden="true" focusable="false">
        {roles ? (
          <>
            {ROLES.map(([x, y], i) => <path key={i} className="s4-art-line" pathLength={1} d={`M130 64L${x} ${y}`} style={{ ["--i" as string]: i }} />)}
            <rect x="100" y="44" width="60" height="40" rx="9" fill="#fff" /><path d="M112 58h36M112 68h22" stroke="#2457ce" strokeWidth="3" strokeLinecap="round" fill="none" />
            {ROLES.map(([x, y, c], i) => <g key={i} transform={`translate(${x} ${y})`}><g className="s4-art-node" style={{ ["--i" as string]: i }}><circle r="11" fill={c} /><circle r="3.6" cy="-2.4" fill="#fff" /><path d="M-5.4 6.2a5.4 5.4 0 0 1 10.8 0" fill="#fff" /></g></g>)}
          </>
        ) : (
          <>
            <g stroke="rgba(255,255,255,.12)" fill="none">{[52, 104, 156, 208].map((x) => <path key={x} d={`M${x} 0v122`} />)}{[40, 80].map((y) => <path key={y} d={`M0 ${y}h260`} />)}</g>
            <path className="s4-art-line is-river" pathLength={1} d="M-8 96C50 70 96 108 150 84S226 44 270 62" />
            {PINS.map(([x, y, c], i) => <g key={i} transform={`translate(${x} ${y})`}><g className="s4-art-node" style={{ ["--i" as string]: i }}><circle r="11" fill={c} opacity=".25" /><circle r="5" fill={c} stroke="#fff" strokeWidth="1.8" /></g></g>)}
          </>
        )}
      </svg>
      <span className="s4-mega-art-go">{roles ? "See how it connects" : "Open the public map"} <ArrowRight size={14} aria-hidden /></span>
    </Link>
  );
}
