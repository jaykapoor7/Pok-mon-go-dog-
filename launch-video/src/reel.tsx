/* ════════════════════════════════════════════════════════════════════
   Kaju · launch Reel (9:16, ~26 s, 120 BPM: one beat = 15 frames).
   Pure motion design: no screenshots, no slides. Every cut lands on a
   beat; every scene hands its main shape to the next (phone → waveform
   → record → tile → package → stamp → money → Kaju). The last beat
   returns to the opening buzz so the loop is seamless.
   ════════════════════════════════════════════════════════════════════ */
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Kaju } from "./kaju/Kaju";
import type { KajuState } from "./kaju/poses";
import { C, DEVA, INTER, SERIF, clamp, ease } from "./ui";

const BEAT = 15;
const sp = (f: number, d = 0, k: Partial<{ damping: number; stiffness: number; mass: number }> = {}) => spring({ frame: f - d, fps: 30, config: { damping: 13, stiffness: 180, mass: 0.7, ...k } });
const S = (n: number) => n; // sizes are authored for 1080 × 1920

/* ── Captions: big, word-by-word, keywords highlighted (sound-off friendly) ── */
function Caption({ words, top = 300, size = 92, dark = true }: { words: [string, number, boolean?][]; top?: number; size?: number; dark?: boolean }) {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${size * 0.12}px ${size * 0.22}px`, fontFamily: INTER, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.045em", textAlign: "center" }}>
      {words.map(([w, at, hi], i) => {
        const s = sp(f, at, { damping: 11, stiffness: 260 });
        if (f < at) return <span key={i} style={{ opacity: 0 }}>{w}</span>;
        return <span key={i} style={{ display: "inline-block", transform: `scale(${1.35 - 0.35 * s}) translateY(${(1 - s) * 30}px)`, color: hi ? C.ink : dark ? "#fff" : C.navy, background: hi ? C.gold : "transparent", padding: hi ? `0 ${size * 0.14}px` : 0, borderRadius: size * 0.16, textShadow: hi || !dark ? "none" : "0 6px 24px rgba(0,0,0,.45)" }}>{w}</span>;
      })}
    </div>
  );
}

/* ── shared bits ── */
function Bg({ hue = "navy" }: { hue?: "navy" | "green" | "cream" | "ink" }) {
  const f = useCurrentFrame();
  const m = { navy: [`#17366B`, C.navy, C.ink], green: ["#2FD27A", "#13A35C", "#0A6B3B"], cream: ["#FFF6E2", C.cream, "#EADFCC"], ink: ["#1A2440", "#0A1022", "#05080F"] }[hue];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(70% 50% at ${50 + Math.sin(f / 20) * 10}% ${42 + Math.cos(f / 26) * 8}%, ${m[0]} 0%, ${m[1]} 55%, ${m[2]} 100%)` }}>
      <AbsoluteFill style={{ backgroundImage: `radial-gradient(${hue === "cream" ? "rgba(11,30,61,.09)" : "rgba(255,255,255,.07)"} 2px, transparent 2px)`, backgroundSize: "54px 54px", backgroundPosition: `0 ${f * 2}px`, maskImage: "radial-gradient(60% 55% at 50% 50%, #000, transparent)" }} />
    </AbsoluteFill>
  );
}
function Shock({ at, color = "#fff", x = 540, y = 960 }: { at: number; color?: string; x?: number; y?: number }) {
  const f = useCurrentFrame();
  if (f < at || f > at + 18) return null;
  const k = (f - at) / 18;
  return <div style={{ position: "absolute", left: x, top: y, width: 1400, height: 1400, marginLeft: -700, marginTop: -700, borderRadius: "50%", border: `${30 * (1 - k)}px solid ${color}`, transform: `scale(${0.05 + k})`, opacity: 1 - k }} />;
}
function Flash({ at, color = "#fff", len = 6 }: { at: number; color?: string; len?: number }) {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: color, opacity: interpolate(f, [at, at + 1, at + len], [0, 0.9, 0], clamp), pointerEvents: "none" }} />;
}
const shake = (f: number, from: number, len: number, amt = 18) => (f >= from && f < from + len ? { x: (random(`x${f}`) - 0.5) * amt * (1 - (f - from) / len), y: (random(`y${f}`) - 0.5) * amt * (1 - (f - from) / len) } : { x: 0, y: 0 });
function Particles({ at, n = 28, color = C.gold, x = 540, y = 960, spread = 700, glyph }: { at: number; n?: number; color?: string; x?: number; y?: number; spread?: number; glyph?: string }) {
  const f = useCurrentFrame();
  if (f < at) return null;
  const k = Math.min(1, (f - at) / 28);
  return <>{Array.from({ length: n }).map((_, i) => {
    const a = random(`a${i}${at}`) * Math.PI * 2, r = (0.4 + random(`r${i}${at}`) * 0.6) * spread * ease(k);
    const g = 900 * k * k * 0.5;
    return <div key={i} style={{ position: "absolute", left: x + Math.cos(a) * r, top: y + Math.sin(a) * r + g, width: glyph ? undefined : 18, height: glyph ? undefined : 18, borderRadius: 4, background: glyph ? undefined : i % 3 ? color : "#fff", fontSize: 54, transform: `rotate(${k * 600 * (random(`s${i}`) - 0.5)}deg)`, opacity: 1 - k }}>{glyph}</div>;
  })}</>;
}
function KajuRun({ f, from, to, y, size = 300, at = 0, dur = 24, end = "sitting" as KajuState }: { f: number; from: number; to: number; y: number; size?: number; at?: number; dur?: number; end?: KajuState }) {
  const k = interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: ease });
  const running = k < 1;
  const hop = running ? Math.abs(Math.sin(f * 0.9)) * 26 : 0;
  return <div style={{ position: "absolute", left: from + (to - from) * k - size / 2, top: y - hop - size * 0.83, transform: `rotate(${running ? Math.sin(f * 0.9) * 4 : 0}deg)` }}><Kaju state={running ? "trotting" : end} size={size} still flip={to < from} /></div>;
}

/* ── 1 · Hook: the buzz (0–45) ── */
function Hook() {
  const f = useCurrentFrame();
  const up = sp(f, 0, { damping: 12, stiffness: 140 });
  const buzz = f < 40 ? Math.sin(f * 2.6) * 7 * (f % 15 < 9 ? 1 : 0.15) : 0;
  const note = sp(f, 8, { damping: 10, stiffness: 240 });
  const push = interpolate(f, [36, 45], [1, 5.5], { ...clamp, easing: (t) => t * t * t });
  return (
    <AbsoluteFill>
      <Bg hue="ink" />
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "540px 1150px" }}>
        <div style={{ position: "absolute", left: 540 - 240, top: 820 + (1 - up) * 1100, width: 480, height: 960, borderRadius: 70, background: "#0B0F18", boxShadow: "0 0 0 3px rgba(255,255,255,.14), 0 60px 140px rgba(0,0,0,.6)", transform: `rotate(${buzz * 0.4}deg) translateX(${buzz}px)` }}>
          <div style={{ position: "absolute", inset: 14, borderRadius: 58, background: "linear-gradient(160deg,#18305A,#0B1E3D)", overflow: "hidden" }}>
            <div style={{ marginTop: 90, textAlign: "center", color: "#fff", fontFamily: INTER, fontWeight: 300, fontSize: 120, letterSpacing: "-0.04em" }}>7:42</div>
            <div style={{ margin: "40px 22px 0", padding: 22, borderRadius: 30, background: "rgba(255,255,255,.92)", transform: `scale(${note}) translateY(${(1 - note) * -60}px)`, fontFamily: INTER, display: "grid", gridTemplateColumns: "64px 1fr", gap: "4px 16px", alignItems: "center" }}>
              <div style={{ gridRow: "span 2", width: 64, height: 64, borderRadius: 16, background: C.wa, display: "grid", placeItems: "center", fontSize: 36 }}>💬</div>
              <b style={{ fontSize: 30, color: C.navy }}>Ravi · Field team</b>
              <span style={{ fontSize: 28, color: "#33415C" }}>🎤 Voice note (0:14) · 📷 Photo</span>
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <Caption words={[["This", 2], ["voice", 6], ["note", 10, true], ["just", 17], ["did", 20], ["a", 24], ["week", 27, true], ["of", 31], ["paperwork.", 34]]} top={250} size={104} />
    </AbsoluteFill>
  );
}

/* ── 2 · Inside the voice note: Hindi, word by word (45–120) ── */
const HI = ["गांधी", "नगर", "में", "एक", "मादा", "कुत्ता,", "कान", "पर", "निशान", "नहीं,", "पैर", "में", "लंगड़ापन।"];
function Voice() {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 10], [0.4, 1], { ...clamp, easing: ease });
  const lit = Math.floor(interpolate(f, [12, 62], [0, HI.length], clamp));
  return (
    <AbsoluteFill>
      <Bg hue="navy" />
      <div style={{ position: "absolute", left: 0, right: 0, top: 820, height: 360, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transform: `scale(${z})` }}>
        {Array.from({ length: 34 }).map((_, i) => {
          const beat = Math.max(0, 1 - ((f + 3) % BEAT) / 8);
          const h = 30 + Math.abs(Math.sin(i * 0.8 + f * 0.45)) * 220 * (0.55 + 0.45 * beat) * Math.sin((i / 33) * Math.PI);
          return <div key={i} style={{ width: 16, height: h, borderRadius: 10, background: `linear-gradient(${C.gold}, ${C.wa})`, boxShadow: `0 0 30px ${C.wa}66` }} />;
        })}
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 1260, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 22px", fontFamily: DEVA, fontWeight: 600, fontSize: 70, lineHeight: 1.35 }}>
        {HI.map((w, i) => <span key={i} style={{ color: i < lit ? "#fff" : "rgba(255,255,255,.18)", transform: `translateY(${i === lit - 1 ? -6 : 0}px)` }}>{w}</span>)}
      </div>
      <Caption words={[["In", 4], ["Hindi.", 8, true], ["From", 30], ["the", 33], ["street.", 36]]} top={330} size={110} />
      <div style={{ position: "absolute", top: 600, width: "100%", textAlign: "center", fontFamily: INTER, fontWeight: 600, fontSize: 36, color: "rgba(255,255,255,.6)" }}>🎤 0:14 · WhatsApp</div>
    </AbsoluteFill>
  );
}

/* ── 3 · Kaju builds the record (120–195) ── */
const FIELDS: [string, string][] = [["Animal", "Female dog"], ["Place", "Gandhi Nagar"], ["Ear notch", "None"], ["Health", "Limp, hind leg"]];
function Build() {
  const f = useCurrentFrame();
  const card = sp(f, 4, { damping: 14 });
  return (
    <AbsoluteFill>
      <Bg hue="cream" />
      <Caption words={[["Kaju", 2, true], ["turns", 6], ["it", 9], ["into", 12], ["a", 15], ["record.", 18]]} top={250} size={100} dark={false} />
      <div style={{ position: "absolute", left: 90, right: 90, top: 640, padding: 44, borderRadius: 44, background: "#fff", boxShadow: "0 50px 120px rgba(11,30,61,.18)", transform: `perspective(1400px) rotateX(${(1 - card) * 40}deg) translateY(${(1 - card) * 300}px)`, opacity: card }}>
        <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 52, color: C.navy, letterSpacing: "-0.03em", marginBottom: 20 }}>New ABC record</div>
        {FIELDS.map(([k, v], i) => {
          const s = sp(f, 18 + i * 8, { damping: 9, stiffness: 300 });
          return <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 0", borderTop: "3px solid #EEF1F6", fontFamily: INTER, fontSize: 40 }}>
            <span style={{ color: C.mute, fontWeight: 600 }}>{k}</span>
            <span style={{ fontWeight: 800, color: C.navy, padding: "8px 22px", borderRadius: 16, background: "#EEF3FD", transform: `translateX(${(1 - s) * 500}px) scale(${0.6 + 0.4 * s}) rotate(${(1 - s) * 10}deg)`, opacity: s }}>{v}</span>
          </div>;
        })}
      </div>
      <KajuRun f={f} from={-200} to={820} y={1640} size={320} at={6} dur={26} end="explaining" />
    </AbsoluteFill>
  );
}

/* ── 4 · You confirm (195–240) ── */
function Confirm() {
  const f = useCurrentFrame();
  const press = interpolate(f, [16, 19, 23], [1, 0.86, 1], clamp);
  const fill = interpolate(f, [19, 34], [0, 1], { ...clamp, easing: ease });
  const cur = interpolate(f, [0, 15], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill>
      <Bg hue="cream" />
      <Caption words={[["You", 0], ["just", 3], ["confirm.", 6, true]]} top={420} size={124} dark={false} />
      <div style={{ position: "absolute", left: 540, top: 1000, transform: `translate(-50%,-50%) scale(${press})`, padding: "44px 90px", borderRadius: 40, background: f > 19 ? C.green : C.blue, color: "#fff", fontFamily: INTER, fontWeight: 800, fontSize: 64, boxShadow: `0 30px 80px ${f > 19 ? C.green : C.blue}66`, whiteSpace: "nowrap" }}>{f > 19 ? "✓ Saved" : "Confirm"}</div>
      <svg width={110} height={110} viewBox="0 0 24 24" style={{ position: "absolute", left: 900 - 330 * cur, top: 1500 - 470 * cur, filter: "drop-shadow(0 8px 10px rgba(0,0,0,.3))" }}><path d="M4 2l16 9.5-7 1.6-3.6 6.6z" fill={C.navy} stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /></svg>
      <Shock at={19} color={C.green} x={540} y={1000} />
      <div style={{ position: "absolute", left: 540, top: 1000, width: 3000, height: 3000, marginLeft: -1500, marginTop: -1500, borderRadius: "50%", background: C.green, transform: `scale(${fill})` }} />
    </AbsoluteFill>
  );
}

/* ── 5 · Month end: 146 tiles, 4 caught (240–345) ── */
const BAD = [37, 88, 121, 140];
function Tiles() {
  const f = useCurrentFrame();
  const cols = 11, size = 72, gap = 10, w = cols * (size + gap) - gap;
  const zoomOut = interpolate(f, [0, 16], [14, 1], { ...clamp, easing: ease });
  const scan = interpolate(f, [16, 52], [-200, 1700], clamp);
  const red = f > 54;
  const fly = sp(f, 66, { damping: 14 });
  const labels = ["No release photo", "No release photo", "Vet sign-off missing", "Billed twice"];
  return (
    <AbsoluteFill>
      <Bg hue="navy" />
      <AbsoluteFill style={{ transform: `scale(${zoomOut})`, transformOrigin: "540px 1010px" }}>
        <div style={{ position: "absolute", left: (1080 - w) / 2, top: 560, width: w, display: "grid", gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap }}>
          {Array.from({ length: 146 }).map((_, i) => {
            const y = Math.floor(i / cols) * (size + gap) + 560;
            const lit = scan > y - 560;
            const bad = red && BAD.includes(i);
            return <div key={i} style={{ width: size, height: size, borderRadius: 16, background: bad ? C.red : lit ? C.green : "rgba(255,255,255,.12)", boxShadow: bad ? `0 0 40px ${C.red}` : lit ? `0 0 14px ${C.green}55` : "none", transform: `scale(${bad ? 1 + Math.sin(f / 3) * 0.12 : 1})`, opacity: bad && fly > 0.5 ? 0.25 : 1 }} />;
          })}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 560 + scan - 560 + 520, height: 8, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, boxShadow: `0 0 60px ${C.gold}`, opacity: f < 54 ? 1 : 0 }} />
      </AbsoluteFill>
      {labels.map((t, i) => (
        <div key={i} style={{ position: "absolute", left: 540, top: 820 + i * 150, transform: `translate(-50%,-50%) translateY(${(1 - fly) * 300}px) scale(${0.3 + fly * 0.7}) rotate(${(i % 2 ? 1 : -1) * (1 - fly) * 20}deg)`, opacity: fly, padding: "26px 44px", borderRadius: 28, background: "#fff", fontFamily: INTER, fontWeight: 800, fontSize: 50, color: C.navy, boxShadow: `0 0 0 5px ${C.red}, 0 30px 70px rgba(0,0,0,.4)`, whiteSpace: "nowrap" }}>
          <span style={{ color: C.red }}>✕ </span>{t}
        </div>
      ))}
      <Caption words={[["146", 4, true], ["checked.", 8], ["4", 56, true], ["caught.", 60]]} top={300} size={118} />
    </AbsoluteFill>
  );
}

/* ── 6 · Fixed and packaged (345–420) ── */
function Package() {
  const f = useCurrentFrame();
  const labels = ["Photos requested", "Photos requested", "Vet reminded", "Duplicate merged"];
  const pack = interpolate(f, [44, 58], [0, 1], { ...clamp, easing: ease });
  const box = sp(f, 52, { damping: 9, stiffness: 160 });
  return (
    <AbsoluteFill>
      <Bg hue="navy" />
      {labels.map((t, i) => {
        const flip = interpolate(f, [4 + i * 7, 12 + i * 7], [0, 180], clamp);
        const back = flip > 90;
        return <div key={i} style={{ position: "absolute", left: 540, top: 820 + i * 150, transform: `translate(-50%,-50%) perspective(900px) rotateX(${flip}deg) translateY(${pack * (960 - 820 - i * 150)}px) scale(${1 - pack * 0.6})`, opacity: 1 - pack, padding: "26px 44px", borderRadius: 28, background: back ? C.green : "#fff", fontFamily: INTER, fontWeight: 800, fontSize: 50, color: back ? "#fff" : C.navy, whiteSpace: "nowrap" }}>
          <div style={{ transform: back ? "rotateX(180deg)" : "none" }}>{back ? `✓ ${t}` : "✕ ..."}</div>
        </div>;
      })}
      <div style={{ position: "absolute", left: 540, top: 1000, transform: `translate(-50%,-50%) scale(${box}) rotate(${(1 - box) * -30}deg)`, width: 600, padding: "60px 40px", borderRadius: 50, background: `linear-gradient(160deg, ${C.gold}, ${C.turmeric})`, textAlign: "center", fontFamily: INTER, color: C.ink, boxShadow: `0 40px 120px ${C.turmeric}88` }}>
        <div style={{ fontSize: 120 }}>📦</div>
        <div style={{ fontWeight: 900, fontSize: 110, letterSpacing: "-0.05em", lineHeight: 1 }}>142</div>
        <div style={{ fontWeight: 700, fontSize: 40 }}>verified · ready to bill</div>
      </div>
      <Shock at={52} color={C.gold} />
      <Caption words={[["Fixed.", 6, true], ["Packaged.", 50]]} top={300} size={124} />
    </AbsoluteFill>
  );
}

/* ── 7 · Files and tools burst out (420–495) ── */
const FILES: [string, string][] = [["PPTX", "#C4482B"], ["XLSX", "#1D6F42"], ["PDF", "#D93A3A"], ["DOCX", "#2B5BC4"]];
const TOOLS = ["Google Workspace", "Excel", "Slack", "WhatsApp", "SMS", "Microsoft 365", "PowerPoint", "Gmail"];
function Burst() {
  const f = useCurrentFrame();
  const open = sp(f, 0, { damping: 12 });
  return (
    <AbsoluteFill>
      <Bg hue="ink" />
      {TOOLS.map((t, i) => {
        const a = (i / TOOLS.length) * Math.PI * 2 + f / 24;
        const r = interpolate(f, [6, 24], [0, 1], { ...clamp, easing: ease });
        return <div key={t} style={{ position: "absolute", left: 540 + Math.cos(a) * 420 * r, top: 1020 + Math.sin(a) * 620 * r, transform: "translate(-50%,-50%)", padding: "16px 30px", borderRadius: 999, border: "2px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)", color: "#fff", fontFamily: INTER, fontWeight: 700, fontSize: 36, whiteSpace: "nowrap", opacity: r }}>{t}</div>;
      })}
      {FILES.map(([t, c], i) => {
        const s = sp(f, 4 + i * 4, { damping: 8, stiffness: 220 });
        const x = [-250, 250, -250, 250][i], y = [-180, -180, 180, 180][i];
        return <div key={t} style={{ position: "absolute", left: 540 + x * s, top: 1020 + y * s, transform: `translate(-50%,-50%) rotate(${(1 - s) * 180 + (i - 1.5) * 6}deg) scale(${s})`, width: 230, height: 280, borderRadius: 34, background: "#fff", display: "grid", placeItems: "center", boxShadow: `0 30px 80px ${c}88` }}>
          <div style={{ width: 150, height: 150, borderRadius: 30, background: c, color: "#fff", display: "grid", placeItems: "center", fontFamily: INTER, fontWeight: 900, fontSize: 46 }}>{t}</div>
        </div>;
      })}
      <div style={{ position: "absolute", left: 540, top: 1020, transform: `translate(-50%,-50%) scale(${1.4 - open * 0.4})`, opacity: 1 - open, fontSize: 200 }}>📦</div>
      <Particles at={2} n={34} color={C.gold} x={540} y={1020} spread={800} />
      <Caption words={[["Decks.", 6], ["Ledgers.", 12], ["Emails.", 18], ["Done.", 30, true]]} top={260} size={116} />
    </AbsoluteFill>
  );
}

/* ── 8 · Government accepts (495–570) ── */
function Stamp() {
  const f = useCurrentFrame();
  const fly = interpolate(f, [0, 18], [0, 1], { ...clamp, easing: ease });
  const st = interpolate(f, [30, 36], [4, 1], { ...clamp, easing: (t) => t * t });
  const sh = shake(f, 36, 14, 40);
  return (
    <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
      <Bg hue="cream" />
      {/* the office */}
      <svg width={760} height={560} viewBox="0 0 380 280" style={{ position: "absolute", left: 160, top: 760 }}>
        <path d="M190 20 L360 90 L20 90 Z" fill={C.navy} />
        <rect x="40" y="96" width="300" height="16" fill={C.navy} />
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={62 + i * 56} y="122" width="28" height="118" rx="4" fill="#C9D3E6" />)}
        <rect x="24" y="246" width="332" height="22" fill={C.navy} />
        <text x="190" y="76" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="20" fill="#fff">CITY OFFICE</text>
      </svg>
      <div style={{ position: "absolute", left: 540, top: 1700 - fly * 640, transform: `translate(-50%,-50%) scale(${1 - fly * 0.35}) rotate(${(1 - fly) * 20}deg)`, width: 520, padding: "34px 30px", borderRadius: 36, background: `linear-gradient(160deg, ${C.gold}, ${C.turmeric})`, textAlign: "center", fontFamily: INTER, fontWeight: 900, fontSize: 70, color: C.ink, boxShadow: "0 30px 80px rgba(0,0,0,.25)" }}>📦 142 verified</div>
      {f >= 30 && <div style={{ position: "absolute", left: 540, top: 1060, transform: `translate(-50%,-50%) rotate(-12deg) scale(${st})`, padding: "26px 60px", border: `14px solid ${C.green}`, borderRadius: 30, color: C.green, fontFamily: INTER, fontWeight: 900, fontSize: 140, letterSpacing: "0.04em", background: "rgba(255,255,255,.85)", opacity: interpolate(f, [30, 33], [0, 1], clamp) }}>ACCEPTED</div>}
      <Particles at={36} n={30} color={C.green} x={540} y={1060} spread={700} />
      <Caption words={[["The", 2], ["city", 5], ["checks", 8], ["it.", 11], ["Accepted.", 36, true]]} top={300} size={108} dark={false} />
      <Flash at={36} color={C.gold} />
    </AbsoluteFill>
  );
}

/* ── 9 · Paid (570–660) ── */
function Paid() {
  const f = useCurrentFrame();
  const v = Math.round(interpolate(f, [4, 40], [0, 234300], { ...clamp, easing: ease }));
  const pop = f > 40 ? sp(f, 40, { damping: 7, stiffness: 300 }) : 0;
  return (
    <AbsoluteFill>
      <Bg hue="green" />
      <div style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center", fontFamily: INTER, fontWeight: 900, fontSize: 190, color: "#fff", letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums", transform: `scale(${1 + pop * 0.08 - (f > 40 ? 0.08 : 0)})`, textShadow: "0 20px 60px rgba(0,0,0,.25)" }}>₹{v.toLocaleString("en-IN")}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1060, textAlign: "center", fontFamily: INTER, fontWeight: 700, fontSize: 48, color: "rgba(255,255,255,.9)" }}>sanctioned for 142 sterilisations</div>
      {Array.from({ length: 22 }).map((_, i) => {
        const t0 = (i * 3) % 40, k = (f - t0) / 40;
        if (k < 0 || k > 1) return null;
        return <div key={i} style={{ position: "absolute", left: 80 + random(`c${i}`) * 920, top: -100 + k * 2100, fontSize: 80, transform: `rotate(${k * 360}deg)` }}>🪙</div>;
      })}
      <Caption words={[["And", 44], ["paid.", 48, true]]} top={420} size={150} />
      <Particles at={40} n={36} color="#fff" x={540} y={920} spread={900} />
    </AbsoluteFill>
  );
}

/* ── 10 · Meet Kaju (660–780), ending on the buzz to loop ── */
function Outro() {
  const f = useCurrentFrame();
  const k = sp(f, 0, { damping: 8, stiffness: 140 });
  const t = sp(f, 12, { damping: 12 });
  const buzz = f > 104 ? Math.sin(f * 2.6) * 6 : 0;
  return (
    <AbsoluteFill>
      <Bg hue="navy" />
      <div style={{ position: "absolute", left: 540, top: 820, transform: `translate(-50%,-50%) translateY(${(1 - k) * 600}px) scale(${0.5 + 0.5 * k})` }}><Kaju state={f < 40 ? "success" : f < 80 ? "greeting" : "sitting"} size={560} still /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1130, textAlign: "center", fontFamily: INTER, fontWeight: 900, fontSize: 170, color: "#fff", letterSpacing: "-0.055em", transform: `scale(${0.6 + 0.4 * t})`, opacity: t }}>Meet <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, color: C.gold, letterSpacing: "-0.02em" }}>Kaju.</span></div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 1340, textAlign: "center", fontFamily: INTER, fontWeight: 700, fontSize: 50, color: "rgba(255,255,255,.85)", opacity: interpolate(f, [24, 34], [0, 1], clamp) }}>The AI agent for animal welfare teams.</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1480, display: "flex", justifyContent: "center", alignItems: "center", gap: 18, opacity: interpolate(f, [38, 48], [0, 1], clamp) }}>
        <img src={staticFile("straypaw-mark.png")} style={{ width: 70, height: 70 }} />
        <span style={{ fontFamily: INTER, fontWeight: 900, fontSize: 56, color: "#fff", letterSpacing: "-0.03em" }}>StrayPaw</span>
        <span style={{ fontFamily: INTER, fontWeight: 600, fontSize: 44, color: C.gold }}>straypaw.org</span>
      </div>
      <Particles at={0} n={26} glyph="🐾" x={540} y={820} spread={650} />
      {/* back to the start: the phone buzzes again */}
      <div style={{ position: "absolute", left: 540 - 240, top: 1960 - interpolate(f, [100, 120], [0, 300], { ...clamp, easing: ease }), width: 480, height: 300, borderRadius: "70px 70px 0 0", background: "#0B0F18", boxShadow: "0 0 0 3px rgba(255,255,255,.14)", transform: `translateX(${buzz}px)` }} />
    </AbsoluteFill>
  );
}

export const REEL: [string, number, () => React.ReactElement][] = [
  ["hook", 45, Hook], ["voice", 75, Voice], ["build", 75, Build], ["confirm", 45, Confirm], ["tiles", 105, Tiles],
  ["package", 75, Package], ["burst", 75, Burst], ["stamp", 75, Stamp], ["paid", 90, Paid], ["outro", 120, Outro],
];
export const REEL_TOTAL = REEL.reduce((n, [, d]) => n + d, 0);

/** Whip-zoom between scenes: a few frames of motion blur and scale on every cut. */
function Cut({ dur, children }: { dur: number; children: React.ReactNode }) {
  const f = useCurrentFrame();
  const inn = interpolate(f, [0, 5], [1.25, 1], { ...clamp, easing: ease });
  const out = interpolate(f, [dur - 4, dur], [1, 1.18], clamp);
  const blur = interpolate(f, [0, 4, dur - 3, dur], [18, 0, 0, 14], clamp);
  return <AbsoluteFill style={{ transform: `scale(${inn * out})`, filter: `blur(${blur}px)` }}>{children}</AbsoluteFill>;
}

export function Reel() {
  const { fps } = useVideoConfig();
  let at = 0;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <style>{`.kaju{display:block;overflow:visible}.kaju .kj-pose,.kaju .kj-loop,.kaju .kj-ear-up,.kaju .kj-ear-flop,.kaju .kj-flip,.kaju .kj-shadow{transform-box:view-box;transform-origin:0 0}.kaju.is-flip .kj-flip{transform:translateX(240px) scaleX(-1)}.kaju .kj-shadow{transform-origin:120px 188px;fill:#0b1e3d}.kaju-explorer .kj-lids{opacity:0}`}</style>
      {REEL.map(([id, d, Comp]) => { const from = at; at += d; return <Sequence key={id} from={from} durationInFrames={d} name={id}><Cut dur={d}><Comp /></Cut></Sequence>; })}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, textAlign: "center", fontFamily: INTER, fontSize: 22, color: "rgba(255,255,255,.45)", mixBlendMode: "difference" }}>Product demo · illustrative records</div>
      <Audio src={staticFile("reel-music.wav")} />
      {void fps}
    </AbsoluteFill>
  );
}
