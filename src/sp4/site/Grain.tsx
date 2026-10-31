import type { CSSProperties, ReactNode } from "react";

/* ════════════════════════════════════════════════════════════════════
   Panel behind every product fragment on the site.

   Plain, flat StrayPaw colour: no photographs, no texture. Each variant
   is a quiet tint of the brand palette (blue, sand, teal, slate), so a
   page of tiles alternates calmly and the product UI on top stays the
   thing you look at. `dark` is the night ink panel used in dark bands.
   The component keeps its old name and props so every page picks this
   up without an edit.
   ════════════════════════════════════════════════════════════════════ */

const TONES = ["blue", "sand", "teal", "slate", "blue", "sand"] as const;

export function Grain({ v = 0, id, dark = false, className = "", style, children }: { v?: number; id?: string; dark?: boolean; className?: string; style?: CSSProperties; children?: ReactNode }) {
  void id;
  const tone = dark ? "night" : TONES[((v % TONES.length) + TONES.length) % TONES.length];
  return <div className={`s4-grain t-${tone} ${className}`.trim()} style={style}>{children}</div>;
}
