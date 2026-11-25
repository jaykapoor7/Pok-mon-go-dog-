import React from "react";
import { C, INTER, SCRIPT, rise, scriptOf, useLayout } from "./theme";
import { wrap } from "./lib";

export type SubtitleCue = { a: number; b: number; speaker: string; text: string; gloss?: string; first: boolean; last: boolean };
type CaptionCue = { a: number; b: number; text: string; words?: boolean };

const pill = (u: number): React.CSSProperties => ({ background: "rgba(255,255,255,.94)", boxShadow: `0 0 0 1px ${C.hairline}, 0 ${6 * u}px ${18 * u}px ${-8 * u}px rgba(11,30,61,.16)` });

/** The strip under the window: a feature caption, or a line of conversation. Both stay inside the 5% safe margin. */
export function CaptionBand({ band, caption, subtitle, frame }: { band: { top: number; bottom: number }; caption?: CaptionCue; subtitle?: SubtitleCue; frame: number }) {
  const { V, u, width } = useLayout();
  const maxW = width * 0.9;
  /* Landscape: centred in the strip between the window and the safe margin. Vertical: hung just under the window. */
  const place: React.CSSProperties = V
    ? { position: "absolute", left: 0, right: 0, top: band.top + 44 * u, display: "flex", justifyContent: "center" }
    : { position: "absolute", left: 0, right: 0, top: band.top, height: band.bottom - band.top, display: "flex", justifyContent: "center", alignItems: "center" };
  if (subtitle) return <div style={V ? place : { ...place, alignItems: "flex-end" }}><SubtitleBlock s={subtitle} frame={frame} maxW={maxW} /></div>;
  if (!caption) return null;
  const o = Math.min(rise(frame, caption.a, 7), 1 - rise(frame, caption.b - 6, 6));
  const fs = (V ? 42 : 30) * u, lines = wrap(caption.text, V ? 30 : 42);
  let w = 0;
  return (
    <div style={place}>
      <div style={{ ...pill(u), maxWidth: maxW, padding: `${fs * 0.42}px ${fs * 0.85}px`, borderRadius: lines.length > 1 ? fs * 0.7 : 999, fontFamily: INTER, fontWeight: 600, fontSize: fs, lineHeight: 1.22, letterSpacing: "-0.018em", color: C.ink, textAlign: "center", opacity: o, transform: `translateY(${(1 - rise(frame, caption.a, 7)) * 10 * u}px)` }}>
        {lines.map((line, i) => (
          <div key={i} style={{ whiteSpace: "nowrap" }}>
            {caption.words ? line.split(" ").map((word, k) => { const p = rise(frame, caption.a + 2 + w++ * 2, 6); return <span key={k} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 0.3}em)`, marginRight: "0.26em" }}>{word}</span>; }) : line}
          </div>
        ))}
      </div>
    </div>
  );
}

const SPEAKER: Record<string, { label: string; color: string }> = { you: { label: "You", color: C.muted }, kaju: { label: "Kaju", color: C.blue } };

function SubtitleBlock({ s, frame, maxW }: { s: SubtitleCue; frame: number; maxW: number }) {
  const { V, u } = useLayout();
  const sc = scriptOf(s.text), type = SCRIPT[sc];
  const fs = (V ? 42 : 34) * u * type.scale, gs = (V ? 30 : 24) * u, ls = (V ? 22 : 18) * u;
  const who = SPEAKER[s.speaker] ?? { label: s.speaker, color: C.muted };
  /* The pill fades once per spoken line; inside it the chunks simply change. */
  const o = Math.min(s.first ? rise(frame, s.a, 6) : 1, s.last ? 1 - rise(frame, s.b, 6) : 1);
  const t = rise(frame, s.a, 5);
  return (
    <div style={{ ...pill(u), maxWidth: maxW, boxSizing: "border-box", padding: `${(V ? 22 : 14) * u}px ${(V ? 34 : 30) * u}px ${(V ? 24 : 16) * u}px`, borderRadius: (V ? 26 : 22) * u, textAlign: "center", opacity: o }}>
      <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: ls, letterSpacing: "0.08em", textTransform: "uppercase", color: who.color, marginBottom: 4 * u }}>{who.label}</div>
      <div style={{ fontFamily: type.family, fontWeight: 600, fontSize: fs, lineHeight: type.lineHeight, letterSpacing: type.tracking, color: C.ink, textWrap: "balance" as never, opacity: 0.35 + 0.65 * t }}>{s.text}</div>
      {s.gloss && <div style={{ fontFamily: INTER, fontWeight: 400, fontSize: gs, lineHeight: 1.3, letterSpacing: "-0.006em", color: C.body, marginTop: 4 * u, textWrap: "balance" as never, opacity: 0.35 + 0.65 * t }}>{s.gloss}</div>}
    </div>
  );
}
