import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { continueRender, delayRender, staticFile } from "remotion";

/* Fonts ship with the project (public/*.woff2) so renders never depend on the network. */
export const INTER = "SPInter, Inter, system-ui, sans-serif";
export const SERIF = "SPSerif, Georgia, serif";
export const DEVA = "SPDeva, SPInter, sans-serif";
if (typeof document !== "undefined") {
  const h = delayRender("Loading fonts");
  Promise.all([
    new FontFace("SPInter", `url(${staticFile("inter.woff2")})`, { weight: "100 900" }).load(),
    new FontFace("SPSerif", `url(${staticFile("serif-italic.woff2")})`, { style: "italic", weight: "400" }).load(),
    new FontFace("SPDeva", `url(${staticFile("deva.woff2")})`, { weight: "100 900" }).load(),
    new FontFace("SPHand", `url(${staticFile("caveat.woff2")})`, { weight: "400 700" }).load(),
  ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); }).catch((e) => { console.error(e); continueRender(h); });
}

export const C = { navy: "#0B1E3D", ink: "#071428", blue: "#2457CE", sky: "#7FA6FF", turmeric: "#D99B1C", gold: "#F0B45A", cream: "#F7F3EC", paper: "#FFFDF8", green: "#1FA463", wa: "#25D366", red: "#E5484D", mute: "#8C97AB" };

/** Layout helper: vertical (Reels) or horizontal (X). Sizes are in units of 1080px on the short side. */
export function useLayout() {
  const { width, height } = useVideoConfig();
  const V = height > width;
  const u = Math.min(width, height) / 1080;
  return { V, u, width, height };
}

export const ease = Easing.bezier(0.2, 0.9, 0.2, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function useSpring(delay = 0, config: Partial<{ damping: number; stiffness: number; mass: number }> = {}) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping: 14, stiffness: 140, mass: 0.8, ...config } });
}

/** Word-by-word kinetic headline. */
export function Kinetic({ text, delay = 0, size, color = C.navy, weight = 700, stagger = 3, align = "center", italicWords = [] as string[], lineHeight = 1.02 }: { text: string; delay?: number; size: number; color?: string; weight?: number; stagger?: number; align?: "center" | "left"; italicWords?: string[]; lineHeight?: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = text.split("\n");
  let i = 0;
  return (
    <div style={{ fontFamily: INTER, fontSize: size, fontWeight: weight, color, letterSpacing: "-0.045em", lineHeight, textAlign: align }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start", gap: `0 ${size * 0.24}px` }}>
          {line.split(" ").map((w, wi) => {
            const k = i++;
            const s = spring({ frame: f - delay - k * stagger, fps, config: { damping: 16, stiffness: 170, mass: 0.7 } });
            const it = italicWords.includes(w.replace(/[.,]/g, ""));
            return (
              <span key={wi} style={{ display: "inline-block", overflow: "hidden", paddingBottom: size * 0.12, marginBottom: -size * 0.12 }}>
                <span style={{ display: "inline-block", transform: `translateY(${(1 - s) * 110}%) rotate(${(1 - s) * 6}deg)`, opacity: s, fontFamily: it ? SERIF : INTER, fontStyle: it ? "italic" : "normal", fontWeight: it ? 400 : weight, letterSpacing: it ? "-0.02em" : undefined, color: it ? C.turmeric : undefined }}>{w}</span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function Kicker({ n, label, delay = 0, dark = false }: { n: string; label: string; delay?: number; dark?: boolean }) {
  const { u } = useLayout();
  const s = useSpring(delay);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 14 * u, padding: `${10 * u}px ${20 * u}px`, borderRadius: 999, background: dark ? "rgba(255,255,255,.08)" : "rgba(11,30,61,.06)", border: `1.5px solid ${dark ? "rgba(255,255,255,.16)" : "rgba(11,30,61,.1)"}`, fontFamily: INTER, fontSize: 26 * u, fontWeight: 600, color: dark ? "#fff" : C.navy, opacity: s, transform: `translateY(${(1 - s) * 20}px)` }}>
      <span style={{ color: C.turmeric, fontVariantNumeric: "tabular-nums" }}>{n}</span>
      <span style={{ width: 1.5, height: 22 * u, background: dark ? "rgba(255,255,255,.25)" : "rgba(11,30,61,.2)" }} />
      {label}
    </div>
  );
}

/** Soft animated background: gradient, slow-drifting glow and a fine grid. */
export function Backdrop({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const f = useCurrentFrame();
  const dark = tone === "dark";
  const x = 50 + Math.sin(f / 60) * 18, y = 40 + Math.cos(f / 75) * 14;
  return (
    <AbsoluteFill style={{ background: dark ? `radial-gradient(60% 50% at ${x}% ${y}%, #17366B 0%, ${C.navy} 55%, ${C.ink} 100%)` : `radial-gradient(60% 50% at ${x}% ${y}%, #FFF6E2 0%, ${C.cream} 60%, #EFE7DA 100%)` }}>
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${dark ? "rgba(255,255,255,.045)" : "rgba(11,30,61,.05)"} 1px, transparent 1px), linear-gradient(90deg, ${dark ? "rgba(255,255,255,.045)" : "rgba(11,30,61,.05)"} 1px, transparent 1px)`, backgroundSize: "72px 72px", backgroundPosition: `${f * 0.6}px ${f * 0.3}px`, maskImage: "radial-gradient(70% 60% at 50% 50%, #000 30%, transparent 100%)" }} />
    </AbsoluteFill>
  );
}

/** White flash used on hard cuts. */
export function Flash({ at = 0, len = 8, color = "#fff" }: { at?: number; len?: number; color?: string }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [at, at + 1, at + len], [0, 0.85, 0], clamp);
  return <AbsoluteFill style={{ background: color, opacity: o, pointerEvents: "none" }} />;
}

/** Scene wrapper: quick zoom-blur in and out. */
export function Scene({ children, dur, tone = "dark" }: { children: React.ReactNode; dur: number; tone?: "dark" | "light" }) {
  const f = useCurrentFrame();
  const inn = interpolate(f, [0, 10], [1.08, 1], { ...clamp, easing: ease });
  const out = interpolate(f, [dur - 8, dur], [1, 0.94], clamp);
  const blur = interpolate(f, [0, 8, dur - 6, dur], [14, 0, 0, 10], clamp);
  const op = interpolate(f, [0, 5, dur - 4, dur], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <Backdrop tone={tone} />
      <AbsoluteFill style={{ transform: `scale(${inn * out})`, filter: `blur(${blur}px)`, opacity: op }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
}

export function Check({ size, color = C.green }: { size: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill={color} /><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
