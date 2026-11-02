/* ════════════════════════════════════════════════════════════════════
   Kaju product demo, social cut (~52 s). The real app recording
   (public/clean.mp4, recorded by scripts/record-yc-demo.cjs with CLEAN=1)
   trimmed into 14 beats, speed-ramped, with a virtual camera that moves
   onto each action. Two framings from one cut list (democut.json):
   9:16 for Reels and 16:9 for X.
   ════════════════════════════════════════════════════════════════════ */
import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Kaju, KajuFace } from "./kaju/Kaju";
import { C, INTER, SERIF, clamp, ease } from "./ui";
import SEGS from "./democut.json";

type R = { x: number; y: number; w: number; h: number };
type Seg = { s: number; e: number; r: number; cap: string; v: R[]; x: R[] };
const segs = SEGS as Seg[];
const FPS = 30;
const frames = (s: Seg) => Math.round(((s.e - s.s) / s.r) * FPS);
const HOOK = 0, OUTRO = 78;
export const DEMO_TOTAL = segs.reduce((n, s) => n + frames(s), 0) + OUTRO;

const lerp = (a: R, b: R, k: number): R => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k });

/** The recording, framed on a region of the 1920×1080 source and fitted into a W×H window. */
function Shot({ seg, W, H, cover = false, blur = 0 }: { seg: Seg; W: number; H: number; cover?: boolean; blur?: number }) {
  const f = useCurrentFrame();
  const n = frames(seg);
  const cams = W > H ? seg.x : seg.v;
  const k = interpolate(f, [0, n], [0, 1], { ...clamp, easing: ease });
  const r = lerp(cams[0], cams[1], k);
  const scale = cover ? Math.max(W / r.w, H / r.h) : Math.min(W / r.w, H / r.h);
  const left = W / 2 - scale * (r.x + r.w / 2), top = H / 2 - scale * (r.y + r.h / 2);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", left, top, width: 1920 * scale, height: 1080 * scale, filter: blur ? `blur(${blur}px) brightness(.5) saturate(1.2)` : undefined }}>
        <OffthreadVideo src={staticFile("clean.mp4")} startFrom={Math.round(seg.s * FPS)} playbackRate={seg.r} muted style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}

/** Whip between beats: a few frames of scale and blur. */
function Beat({ n, children }: { n: number; children: React.ReactNode }) {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, 6], [1.06, 1], { ...clamp, easing: ease }) * interpolate(f, [n - 4, n], [1, 0.97], clamp);
  const b = interpolate(f, [0, 5, n - 3, n], [12, 0, 0, 8], clamp);
  return <AbsoluteFill style={{ transform: `scale(${s})`, filter: b > 0.2 ? `blur(${b}px)` : undefined }}>{children}</AbsoluteFill>;
}

function Caption({ i, text, vertical }: { i: number; text: string; vertical: boolean }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 2, fps, config: { damping: 15, stiffness: 160 } });
  const words = text.split(" ");
  return (
    <div style={vertical
      ? { position: "absolute", left: 60, right: 60, top: 150, height: 250, display: "flex", flexDirection: "column", justifyContent: "flex-end" }
      : { position: "absolute", left: 56, bottom: 56, maxWidth: 1180 }}>
      <div style={{ display: "inline-flex", alignSelf: vertical ? "center" : "flex-start", alignItems: "center", gap: 10, marginBottom: vertical ? 18 : 12, padding: "6px 14px", borderRadius: 999, background: vertical ? "rgba(255,255,255,.12)" : "rgba(7,20,40,.9)", border: "1.5px solid rgba(255,255,255,.2)", fontFamily: INTER, fontWeight: 700, fontSize: vertical ? 26 : 22, color: C.gold, opacity: s, letterSpacing: "0.04em" }}>STEP {String(i + 1).padStart(2, "0")}</div>
      <div style={{ ...(vertical ? { textAlign: "center" } : { padding: "18px 26px", borderRadius: 22, background: "rgba(7,20,40,.86)", backdropFilter: "blur(10px)", boxShadow: "0 20px 50px rgba(0,0,0,.35)" }), fontFamily: INTER, fontWeight: 800, fontSize: vertical ? 64 : 46, lineHeight: 1.08, letterSpacing: "-0.035em", color: "#fff" }}>
        {words.map((w, j) => { const k = spring({ frame: f - 3 - j * 1.6, fps, config: { damping: 16, stiffness: 220 } }); return <span key={j} style={{ display: "inline-block", marginRight: "0.24em", opacity: k, transform: `translateY(${(1 - k) * 18}px)` }}>{w}</span>; })}
      </div>
    </div>
  );
}

function Hook({ vertical }: { vertical: boolean }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 4, 70, 80], [0, 1, 1, 0], clamp);
  const s = spring({ frame: f, fps: 30, config: { damping: 12, stiffness: 200 } });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: vertical ? 470 : 380, display: "flex", justifyContent: "center", opacity: o, pointerEvents: "none" }}>
      <div style={{ padding: vertical ? "26px 34px" : "24px 40px", borderRadius: 28, background: C.gold, color: C.ink, fontFamily: INTER, fontWeight: 900, fontSize: vertical ? 54 : 60, letterSpacing: "-0.04em", lineHeight: 1.05, textAlign: "center", transform: `scale(${0.8 + 0.2 * s}) rotate(${(1 - s) * -4}deg)`, boxShadow: "0 30px 80px rgba(0,0,0,.4)", maxWidth: vertical ? 920 : 1300 }}>
        {vertical ? <>An AI agent that does<br />a month of NGO paperwork<br />in minutes 👇</> : <>An AI agent that does a month of<br />NGO paperwork in minutes 👇</>}
      </div>
    </div>
  );
}

function Outro({ vertical }: { vertical: boolean }) {
  const f = useCurrentFrame();
  const k = spring({ frame: f, fps: 30, config: { damping: 10, stiffness: 140 } });
  const t = spring({ frame: f - 8, fps: 30, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(70% 55% at 50% 45%, #17366B 0%, ${C.navy} 55%, ${C.ink} 100%)`, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: vertical ? 26 : 18 }}>
      <div style={{ transform: `translateY(${(1 - k) * 300}px) scale(${0.6 + 0.4 * k})` }}><Kaju state={f < 30 ? "success" : "sitting"} size={vertical ? 460 : 360} still /></div>
      <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: vertical ? 150 : 130, color: "#fff", letterSpacing: "-0.055em", lineHeight: 1, opacity: t, transform: `scale(${0.7 + 0.3 * t})` }}>Meet <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, color: C.gold, letterSpacing: "-0.02em" }}>Kaju.</span></div>
      <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: vertical ? 42 : 38, color: "rgba(255,255,255,.85)", opacity: interpolate(f, [16, 26], [0, 1], clamp) }}>From a voice note to a sanctioned payment.</div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 16, opacity: interpolate(f, [26, 36], [0, 1], clamp) }}>
        <img src={staticFile("straypaw-mark.png")} style={{ width: 56, height: 56 }} />
        <span style={{ fontFamily: INTER, fontWeight: 900, fontSize: 46, color: "#fff" }}>StrayPaw</span>
        <span style={{ fontFamily: INTER, fontWeight: 600, fontSize: 38, color: C.gold }}>straypaw.org</span>
      </div>
    </AbsoluteFill>
  );
}

export function DemoCut() {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  /* 9:16: the app sits in a rounded window over a blurred copy of itself. */
  const win = vertical ? { x: 40, y: 430, w: 1000, h: 1150 } : { x: 0, y: 0, w: width, h: height };
  let at = HOOK;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <style>{`.kaju{display:block;overflow:visible}.kaju .kj-pose,.kaju .kj-loop,.kaju .kj-ear-up,.kaju .kj-ear-flop,.kaju .kj-flip,.kaju .kj-shadow{transform-box:view-box;transform-origin:0 0}.kaju .kj-shadow{display:none}.kaju-explorer .kj-lids{opacity:0}`}</style>
      {segs.map((seg, i) => {
        const n = frames(seg), from = at; at += n;
        return (
          <Sequence key={i} from={from} durationInFrames={n} name={`beat ${i + 1}`}>
            <Beat n={n}>
              {vertical && <Shot seg={seg} W={width} H={height} cover blur={36} />}
              <div style={{ position: "absolute", left: win.x, top: win.y, width: win.w, height: win.h, borderRadius: vertical ? 34 : 0, overflow: "hidden", boxShadow: vertical ? "0 40px 100px rgba(0,0,0,.55), 0 0 0 2px rgba(255,255,255,.12)" : undefined, background: "#F6F8FB" }}>
                <Shot seg={seg} W={win.w} H={win.h} />
              </div>
            </Beat>
            <Caption i={i} text={seg.cap} vertical={vertical} />
          </Sequence>
        );
      })}
      <Sequence from={0} durationInFrames={84}><Hook vertical={vertical} /></Sequence>
      <Sequence from={at} durationInFrames={OUTRO}><Outro vertical={vertical} /></Sequence>
      {vertical && <div style={{ position: "absolute", left: 0, right: 0, top: 1630, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, fontFamily: INTER, fontWeight: 700, fontSize: 32, color: "#fff" }}><KajuFace size={44} /> Kaju · the AI agent by StrayPaw</div>}
      {!vertical && <div style={{ position: "absolute", left: 40, top: 32, display: "flex", alignItems: "center", gap: 10, padding: "8px 16px 8px 10px", borderRadius: 999, background: "rgba(7,20,40,.8)", fontFamily: INTER, fontWeight: 700, fontSize: 22, color: "#fff" }}><KajuFace size={32} /> Kaju by StrayPaw</div>}
      <div style={{ position: "absolute", left: 0, right: vertical ? 0 : 40, bottom: vertical ? 60 : 24, textAlign: vertical ? "center" : "right", fontFamily: INTER, fontSize: vertical ? 22 : 18, color: "rgba(255,255,255,.55)" }}>Product demo · illustrative records</div>
      <Audio src={staticFile("demo-music.wav")} />
    </AbsoluteFill>
  );
}
