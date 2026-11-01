import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Scene, INTER, useLayout } from "./ui";
import { End, Files, Government, Hook, MonthEnd, Record, RealApp, Reveal, WhatsApp } from "./scenes";

export const SCENES: { id: string; dur: number; tone: "dark" | "light"; C: () => React.ReactElement }[] = [
  { id: "hook", dur: 96, tone: "dark", C: Hook },
  { id: "reveal", dur: 120, tone: "light", C: Reveal },
  { id: "whatsapp", dur: 210, tone: "dark", C: WhatsApp },
  { id: "record", dur: 125, tone: "light", C: Record },
  { id: "monthend", dur: 135, tone: "dark", C: MonthEnd },
  { id: "realapp", dur: 120, tone: "light", C: RealApp },
  { id: "files", dur: 130, tone: "dark", C: Files },
  { id: "government", dur: 130, tone: "light", C: Government },
  { id: "end", dur: 150, tone: "dark", C: End },
];
export const TOTAL = SCENES.reduce((n, s) => n + s.dur, 0);

function Footer() {
  const f = useCurrentFrame();
  const { u } = useLayout();
  const light = (() => { let t = 0; for (const s of SCENES) { if (f < t + s.dur) return s.tone === "light"; t += s.dur; } return false; })();
  return <div style={{ position: "absolute", left: 0, right: 0, bottom: 28 * u, textAlign: "center", fontFamily: INTER, fontSize: 18 * u, color: light ? "rgba(11,30,61,.45)" : "rgba(255,255,255,.4)", opacity: interpolate(f, [0, 10], [0, 1]) }}>Product demo · illustrative records</div>;
}

export function Launch() {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "#0B1E3D" }}>
      <style>{`.kaju{display:block;overflow:visible}.kaju .kj-pose,.kaju .kj-loop,.kaju .kj-ear-up,.kaju .kj-ear-flop,.kaju .kj-flip,.kaju .kj-shadow{transform-box:view-box;transform-origin:0 0}.kaju .kj-shadow{transform-origin:120px 188px;fill:#0b1e3d}.kaju-explorer .kj-lids{opacity:0}`}</style>
      {SCENES.map((s) => { const at = from; from += s.dur; return <Sequence key={s.id} from={at} durationInFrames={s.dur} name={s.id}><Scene dur={s.dur} tone={s.tone}><s.C /></Scene></Sequence>; })}
      <Footer />
      <Audio src={staticFile("music.wav")} />
    </AbsoluteFill>
  );
}
