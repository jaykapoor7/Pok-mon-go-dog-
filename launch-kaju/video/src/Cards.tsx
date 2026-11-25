import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { C, EASE, INTER, clamp01, rise, useLayout } from "./theme";
import { KajuRig } from "./kaju/KajuRig";
import type { EndSegment, TitleSegment } from "./types";

const tone = (variant?: "light" | "dark") => variant === "dark"
  ? { bg: `radial-gradient(80% 70% at 50% 0%, #10295a 0%, rgba(16,41,90,0) 60%), ${C.deep}`, ink: "#ffffff", body: "rgba(255,255,255,.72)", muted: "rgba(255,255,255,.56)", accent: "#8fb0ff", hair: "rgba(255,255,255,.16)" }
  : { bg: `radial-gradient(90% 70% at 50% 6%, #e9efff 0%, rgba(233,239,255,0) 62%), linear-gradient(180deg, #ffffff 0%, ${C.fill} 100%)`, ink: C.ink, body: C.body, muted: C.muted, accent: C.blue, hair: C.hairline };

/** Words rise out of a mask, one after another. */
function Rise({ text, at, stagger = 2, len = 13 }: { text: string; at: number; stagger?: number; len?: number }) {
  const frame = useCurrentFrame(); let i = 0;
  return (
    <>
      {text.split("\n").map((line, li) => (
        <div key={li} style={{ display: "flex", flexWrap: "wrap", columnGap: "0.24em", justifyContent: "inherit" }}>
          {line.split(" ").map((word, wi) => {
            const p = EASE(clamp01((frame - at - i++ * stagger) / len));
            return <span key={wi} style={{ display: "inline-block", overflow: "hidden", padding: "0.12em 0.04em 0.2em", margin: "-0.12em -0.04em -0.2em" }}><span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, opacity: Math.min(1, p * 2.5) }}>{word}</span></span>;
          })}
        </div>
      ))}
    </>
  );
}

/* ── Opening hook ───────────────────────────────────────────────────── */
export function Title({ seg }: { seg: TitleSegment }) {
  const frame = useCurrentFrame();
  const { V, u, width, height, fps } = useLayout();
  const t = tone(seg.variant), lines = seg.text.split("\n"), longest = Math.max(...lines.map((l) => l.length));
  const left = V ? width * 0.085 : width * 0.1;
  const avail = (V ? width - left * 2 : seg.kaju ? width * 0.58 : width * 0.8);
  const size = Math.min((V ? 128 : 138) * u, avail / (longest * 0.53));
  const k = seg.kaju ? EASE(clamp01((frame - 8) / 12)) : 0, ks = (V ? 360 : 380) * u;
  const kajuIn: React.CSSProperties = { opacity: Math.min(1, k * 2), transform: `translateY(${(1 - k) * 26 * u}px)` };
  const kaju = seg.kaju ? <KajuRig state={seg.kaju} t={frame / fps} size={ks} energy={clamp01((frame - 10) / 8)} /> : null;
  return (
    <AbsoluteFill style={{ background: t.bg }}>
      {/* Landscape: headline left, Kaju right. Vertical: one left-aligned column, Kaju under the headline. */}
      <div style={{ position: "absolute", left, right: left, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", transform: V ? `translateY(${-height * 0.03}px)` : undefined }}>
        {seg.eyebrow && <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: (V ? 30 : 26) * u, letterSpacing: "0.02em", color: t.accent, marginBottom: size * 0.3, opacity: rise(frame, 0, 8), transform: `translateY(${(1 - rise(frame, 0, 8)) * 10 * u}px)` }}>{seg.eyebrow}</div>}
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.035em", color: t.ink }}><Rise text={seg.text} at={3} /></div>
        {seg.kaju && V && <div style={{ marginTop: 56 * u, marginLeft: -ks * 0.2, ...kajuIn }}>{kaju}</div>}
      </div>
      {seg.kaju && !V && <div style={{ position: "absolute", right: width * 0.085, bottom: height * 0.5 - ks * 0.44, ...kajuIn }}>{kaju}</div>}
    </AbsoluteFill>
  );
}

/* ── Closing brand card ─────────────────────────────────────────────── */
export function End({ seg }: { seg: EndSegment }) {
  const frame = useCurrentFrame();
  const { V, u, fps } = useLayout();
  const t = tone(seg.variant);
  const ks = (V ? 400 : 330) * u;
  /* Kaju: up from below, a wave hello, paw down, one pleased hop. */
  const enter = EASE(clamp01((frame - 2) / 12));
  const waveE = clamp01((frame - 8) / 6) * (1 - clamp01((frame - 44) / 8));
  const down = EASE(clamp01((frame - 46) / 10));
  const hop = clamp01((frame - 56) / 15);
  const mark = EASE(clamp01((frame - 22) / 10)), url = EASE(clamp01((frame - 27) / 14));
  const ms = (V ? 60 : 50) * u, fs = (V ? 34 : 29) * u;
  return (
    <AbsoluteFill style={{ background: t.bg, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", justifyContent: "center", transform: `translateY(${-10 * u}px)` }}>
        <div style={{ opacity: Math.min(1, enter * 2), transform: `translateY(${(1 - enter) * 30 * u}px)`, marginBottom: 2 * u }}>
          <KajuRig state="sitting" from="greeting" mix={down} t={frame / fps} hop={hop} energy={frame < 46 ? waveE : 0.6} size={ks} />
        </div>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: (V ? 170 : 150) * u, lineHeight: 1, letterSpacing: "-0.045em", color: t.ink, justifyContent: "center", display: "flex" }}><Rise text={seg.wordmark ?? "Kaju"} at={8} len={14} /></div>
        <div style={{ fontFamily: INTER, fontWeight: 400, fontSize: (V ? 44 : 38) * u, lineHeight: 1.25, letterSpacing: "-0.015em", color: t.body, marginTop: 22 * u, maxWidth: (V ? 880 : 1300) * u, textWrap: "balance" as never, opacity: rise(frame, 15, 10), transform: `translateY(${(1 - rise(frame, 15, 10)) * 12 * u}px)` }}>{seg.line}</div>
        {/* logo resolve: the mark settles, then the name and address draw out from it */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 * u, marginTop: (V ? 76 : 54) * u, fontFamily: INTER, fontSize: fs, letterSpacing: "-0.01em" }}>
          <Img src={staticFile("straypaw-mark.png")} style={{ width: ms, height: ms, borderRadius: ms * 0.24, opacity: mark, transform: `scale(${0.7 + 0.3 * mark})` }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16 * u, clipPath: `inset(-10% ${(1 - url) * 100}% -10% 0)`, transform: `translateX(${(1 - url) * -10 * u}px)`, whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 600, color: t.ink }}>StrayPaw</span>
            <span style={{ width: 1, height: fs * 0.9, background: t.hair }} />
            <span style={{ fontWeight: 400, color: t.muted }}>{seg.url}</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
