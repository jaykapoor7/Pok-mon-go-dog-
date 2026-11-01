/* ════════════════════════════════════════════════════════════════════
   "On the record" · Kaju launch film (9:16, 46 s).
   One real dog's journey through StrayPaw, shot on real photography with
   film grain and light, not flat colour. Each scene hands off through a
   physical idea: viewfinder → shutter → chat; a voice note becomes a
   ribbon of Hindi that flows into Kaju; the ribbon draws the record; the
   record is one polaroid on a wall of 146; the wall folds into a folder;
   the folder travels across the city; the city stamps and signs; and we
   end where we began, with her on the record.
   ════════════════════════════════════════════════════════════════════ */
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, random, spring, staticFile, useCurrentFrame } from "remotion";
import { Kaju } from "./kaju/Kaju";
import type { KajuState } from "./kaju/poses";
import { C, DEVA, INTER, SERIF, clamp, ease } from "./ui";

const HAND = "SPHand, cursive";
const sp = (f: number, d = 0, k: Partial<{ damping: number; stiffness: number; mass: number }> = {}) => spring({ frame: f - d, fps: 30, config: { damping: 15, stiffness: 120, mass: 0.9, ...k } });
const io = (f: number, a: number, b: number, from = 0, to = 1, e = ease) => interpolate(f, [a, b], [from, to], { ...clamp, easing: e });
const HERO = "dogs/brown-by-ladder.jpg";
const DOG = { x: 220, y: 860 }; // her face in the 1080×1920 frame

/* ── film texture ─────────────────────────────────────────────────── */
function Grain() {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.png")})`, backgroundSize: "512px 512px", backgroundPosition: `${random(`gx${f}`) * 512}px ${random(`gy${f}`) * 512}px`, mixBlendMode: "overlay", opacity: 0.22, pointerEvents: "none" }} />;
}
function Vignette({ k = 0.65 }: { k?: number }) {
  return <AbsoluteFill style={{ background: `radial-gradient(75% 60% at 50% 48%, transparent 40%, rgba(5,8,15,${k}) 100%)`, pointerEvents: "none" }} />;
}
function Leak({ at = 0, color = "255,170,80" }: { at?: number; color?: string }) {
  const f = useCurrentFrame();
  const x = 20 + Math.sin((f + at) / 40) * 30, o = 0.25 + Math.sin((f + at) / 23) * 0.12;
  return <AbsoluteFill style={{ background: `radial-gradient(45% 35% at ${x}% 12%, rgba(${color},${o}) 0%, transparent 70%)`, mixBlendMode: "screen", pointerEvents: "none" }} />;
}
/** A photograph with a slow camera move (Ken Burns) and optional grade. */
function Photo({ src, from = 1.18, to = 1.06, x = [0, -20], y = [0, -30], dur, blur = 0, dark = 0, warm = false }: { src: string; from?: number; to?: number; x?: number[]; y?: number[]; dur: number; blur?: number; dark?: number; warm?: boolean }) {
  const f = useCurrentFrame();
  const k = f / dur;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${from + (to - from) * k}) translate(${x[0] + (x[1] - x[0]) * k}px, ${y[0] + (y[1] - y[0]) * k}px)`, filter: `blur(${blur}px) brightness(${1 - dark}) ${warm ? "sepia(.25) saturate(1.2) contrast(1.05)" : "contrast(1.05) saturate(1.05)"}` }} />
    </AbsoluteFill>
  );
}

/* ── type: cinematic subtitles ────────────────────────────────────── */
function Sub({ lines, top = 230, size = 82, color = "#fff" }: { lines: [string, number, number?][]; top?: number; size?: number; color?: string }) {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top, textAlign: "center" }}>
      {lines.map(([t, a, b], i) => {
        const o = Math.min(io(f, a, a + 14), b ? io(f, b, b + 10, 1, 0) : 1);
        if (o <= 0) return null;
        return <div key={i} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: size, lineHeight: 1.12, color, letterSpacing: "-0.01em", opacity: o, transform: `translateY(${(1 - io(f, a, a + 18)) * 24}px)`, filter: `blur(${(1 - io(f, a, a + 12)) * 10}px)`, textShadow: "0 4px 30px rgba(0,0,0,.55)" }}>{t}</div>;
      })}
    </div>
  );
}
function Label({ text, at, top = 160, color = "rgba(255,255,255,.75)" }: { text: string; at: number; top?: number; color?: string }) {
  const f = useCurrentFrame();
  const n = Math.floor(io(f, at, at + text.length * 1.2, 0, text.length, (t) => t));
  return <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", fontFamily: INTER, fontWeight: 600, fontSize: 28, letterSpacing: "0.22em", textTransform: "uppercase", color }}>{text.slice(0, n)}</div>;
}

/* ── Kaju, placed in the world ─────────────────────────────────────── */
function KajuAt({ x, y, size, state, flip, shadow = true }: { x: number; y: number; size: number; state: KajuState; flip?: boolean; shadow?: boolean }) {
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size * 0.8 }}>
      {shadow && <div style={{ position: "absolute", left: size * 0.18, right: size * 0.18, top: size * 0.76, height: size * 0.08, borderRadius: "50%", background: "rgba(0,0,0,.45)", filter: "blur(8px)" }} />}
      <Kaju state={state} size={size} still flip={flip} />
    </div>
  );
}

/* ══ A · Viewfinder (0–180) ══════════════════════════════════════════ */
function Viewfinder() {
  const f = useCurrentFrame();
  const box = io(f, 40, 90, 520, 300);
  const shut = f >= 104 && f < 112;
  const flash = io(f, 108, 112, 0, 1) * io(f, 112, 124, 1, 0);
  const shrink = io(f, 128, 172, 1, 0.5);
  const lift = io(f, 128, 172, 0, -150);
  const border = io(f, 124, 140, 0, 22);
  return (
    <AbsoluteFill style={{ background: "#05080F" }}>
      <AbsoluteFill style={{ transform: `translateY(${lift}px) scale(${shrink})`, transformOrigin: "50% 50%" }}>
        <AbsoluteFill style={{ border: `${border}px solid #fff`, borderRadius: border * 1.2, overflow: "hidden", boxShadow: border ? "0 40px 120px rgba(0,0,0,.6)" : "none" }}>
          <Photo src={HERO} dur={180} from={1.22} to={1.05} x={[10, 0]} y={[20, -10]} warm />
          {f < 124 && <>
            <Vignette k={0.5} />
            {/* camera UI */}
            {[[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sy], i) => (
              <div key={i} style={{ position: "absolute", left: sx > 0 ? 70 : undefined, right: sx < 0 ? 70 : undefined, top: sy > 0 ? 300 : undefined, bottom: sy < 0 ? 300 : undefined, width: 90, height: 90, borderTop: sy > 0 ? "5px solid #fff" : undefined, borderBottom: sy < 0 ? "5px solid #fff" : undefined, borderLeft: sx > 0 ? "5px solid #fff" : undefined, borderRight: sx < 0 ? "5px solid #fff" : undefined, opacity: io(f, 30, 40) * 0.9 }} />
            ))}
            <div style={{ position: "absolute", left: DOG.x - box / 2, top: DOG.y - box / 2, width: box, height: box, border: `4px solid ${f > 90 ? C.gold : "#fff"}`, borderRadius: 14, opacity: io(f, 40, 48), boxShadow: f > 90 ? `0 0 30px ${C.gold}` : "none" }} />
            <div style={{ position: "absolute", left: 90, top: 330, fontFamily: INTER, fontWeight: 700, fontSize: 30, color: "#fff", display: "flex", gap: 14, alignItems: "center", opacity: io(f, 34, 42) }}><span style={{ width: 22, height: 22, borderRadius: "50%", background: f % 30 < 18 ? "#ff3b30" : "transparent" }} />PHOTO</div>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 330, textAlign: "center", fontFamily: INTER, fontSize: 30, fontWeight: 600, color: C.gold, opacity: io(f, 90, 96) }}>AF LOCK</div>
          </>}
        </AbsoluteFill>
      </AbsoluteFill>
      {shut && <AbsoluteFill style={{ background: "#000" }} />}
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      <Sub lines={[["7:42 in the morning.", 6, 100], ["Ravi spots her.", 40, 100], ["No ear notch. No record.", 136], ["Nobody is counting her.", 150]]} top={f < 120 ? 170 : 1500} size={86} />
      <Grain />
    </AbsoluteFill>
  );
}

/* ══ B · Voice note becomes a ribbon of Hindi (180–420) ═════════════ */
const RIBBON = "गांधी नगर में एक मादा कुत्ता है · कान पर निशान नहीं · पीछे का पैर थोड़ा लंगड़ा रहा है · ";
function Ribbon() {
  const f = useCurrentFrame();
  const phone = sp(f, 0, { damping: 16 });
  const voice = sp(f, 22, { damping: 12, stiffness: 160 });
  const draw = io(f, 50, 120);
  const flow = io(f, 60, 230, 1600, -900, (t) => t);
  const kaju = sp(f, 96, { damping: 12 });
  const playing = f > 40 && f < 200;
  return (
    <AbsoluteFill>
      <Photo src={HERO} dur={240} from={1.3} to={1.2} blur={26} dark={0.45} warm />
      <Leak />
      <Label text="WhatsApp · voice note · Hindi" at={6} top={150} />
      {/* phone */}
      <div style={{ position: "absolute", left: 120, top: 380, width: 470, height: 820, borderRadius: 64, background: "#0B0F18", padding: 13, boxShadow: "0 0 0 2px rgba(255,255,255,.12), 0 60px 140px rgba(0,0,0,.6)", transform: `translateY(${(1 - phone) * 900}px) rotate(${-6 + (1 - phone) * -10}deg)` }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 52, overflow: "hidden", background: "#E9E1D6" }}>
          <div style={{ height: 110, background: "#0B4F45", display: "flex", alignItems: "flex-end", padding: "0 26px 18px", gap: 14, fontFamily: INTER, color: "#fff" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#cfe9dd", color: "#0B4F45", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 20 }}>RK</div>
            <div><b style={{ fontSize: 26 }}>Ravi</b><div style={{ fontSize: 18, opacity: .75 }}>Field team</div></div>
          </div>
          <div style={{ padding: 20, display: "grid", gap: 14, justifyItems: "start" }}>
            <div style={{ padding: 7, background: "#fff", borderRadius: 16 }}><Img src={staticFile(HERO)} style={{ width: 300, height: 380, objectFit: "cover", borderRadius: 11, display: "block" }} /></div>
            <div style={{ padding: "14px 16px", background: "#fff", borderRadius: 16, display: "flex", alignItems: "center", gap: 12, transform: `scale(${voice})`, transformOrigin: "left center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#0B4F45", color: "#fff", display: "grid", placeItems: "center", fontSize: 20 }}>{playing ? "❚❚" : "▶"}</div>
              <div style={{ display: "flex", gap: 3, alignItems: "center", height: 44 }}>{Array.from({ length: 24 }).map((_, i) => <i key={i} style={{ width: 4, borderRadius: 2, background: i / 24 < io(f, 40, 200) ? "#0B4F45" : "#AAB4B0", height: 8 + Math.abs(Math.sin(i * 1.3 + (playing ? f * 0.4 : 0))) * 30 }} />)}</div>
              <span style={{ fontFamily: INTER, fontSize: 17, color: "#556" }}>0:14</span>
            </div>
          </div>
        </div>
      </div>
      {/* the ribbon: Hindi flows out of the voice note and into Kaju */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <path id="wave" d="M 420 1150 C 620 1050, 700 1350, 860 1250 S 1000 900, 880 760 S 560 560, 700 420" />
          <linearGradient id="gl" x1="0" x2="1"><stop offset="0" stopColor={C.gold} stopOpacity="0" /><stop offset=".3" stopColor={C.gold} /><stop offset="1" stopColor="#fff" /></linearGradient>
        </defs>
        <use href="#wave" fill="none" stroke="url(#gl)" strokeWidth="4" strokeDasharray="2400" strokeDashoffset={2400 * (1 - draw)} style={{ filter: `drop-shadow(0 0 12px ${C.gold})` }} />
        <text fontFamily={DEVA} fontWeight={600} fontSize={46} fill="#fff" style={{ filter: "drop-shadow(0 2px 10px rgba(0,0,0,.6))" }} opacity={draw}>
          <textPath href="#wave" startOffset={flow}>{RIBBON + RIBBON}</textPath>
        </text>
      </svg>
      <div style={{ opacity: kaju, transform: `translateY(${(1 - kaju) * 60}px)` }}><KajuAt x={760} y={470} size={330} state={f < 150 ? "listening" : f < 200 ? "thinking" : "explaining"} shadow={false} /></div>
      <Sub lines={[["“Female. No ear notch.", 150], ["A slight limp in a hind leg.”", 164]]} top={1340} size={76} />
      <Label text="Kaju · transcribed and translated" at={186} top={1560} color={C.gold} />
      <Grain />
    </AbsoluteFill>
  );
}

/* ══ C · The record is drawn, then signed (420–660) ═════════════════ */
const ROWS: [string, string][] = [["Animal", "Adult female, brown"], ["Where", "Gandhi Nagar, 2nd Street"], ["Ear notch", "None · new ABC intake"], ["Register", "No match in 1,248 animals"], ["Health", "Limp, hind leg · vet to check"]];
function Dossier() {
  const f = useCurrentFrame();
  const draw = io(f, 0, 28);
  const fill = io(f, 24, 36);
  const polaroid = sp(f, 34, { damping: 11, stiffness: 140 });
  const note = sp(f, 118, { damping: 9, stiffness: 160 });
  const stampY = io(f, 156, 166, -500, 0, (t) => t * t);
  const stamped = f >= 166;
  const sq = stamped ? io(f, 166, 172, 0.9, 1) : 1;
  const W = 900, H = 1020, X = 90, Y = 520;
  return (
    <AbsoluteFill>
      <Photo src={HERO} dur={240} from={1.25} to={1.32} blur={30} dark={0.62} warm />
      <Leak at={80} />
      <Label text="Kaju prepares the record" at={4} top={150} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <rect x={X} y={Y} width={W} height={H} rx={28} fill="#FBF8F2" fillOpacity={fill} stroke={C.gold} strokeWidth={5} strokeDasharray={2 * (W + H)} strokeDashoffset={2 * (W + H) * (1 - draw)} style={{ filter: `drop-shadow(0 30px 60px rgba(0,0,0,${0.5 * fill}))` }} />
      </svg>
      <div style={{ position: "absolute", left: X, top: Y, width: W, height: H, padding: 48, opacity: fill }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: INTER }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.18em", color: C.mute }}>ABC · NEW INTAKE</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: C.navy }}>ADY-ABC-1147</span>
        </div>
        <div style={{ marginTop: 18, height: 3, background: C.navy, width: `${io(f, 30, 50) * 100}%` }} />
        <div style={{ marginTop: 34, marginLeft: 330 }}>
          {ROWS.map(([k, v], i) => {
            const a = 46 + i * 12;
            const n = Math.floor(io(f, a, a + 14, 0, v.length, (t) => t));
            return <div key={k} style={{ marginBottom: 26, fontFamily: INTER }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.14em", color: C.mute, textTransform: "uppercase", opacity: io(f, a - 4, a) }}>{k}</div>
              <div style={{ fontSize: 33, fontWeight: 600, color: C.navy, minHeight: 42 }}>{v.slice(0, n)}</div>
              <svg width={480} height={10} style={{ display: "block" }}><path d="M2 6 Q 120 1, 240 6 T 478 5" stroke={C.gold} strokeWidth={3} fill="none" strokeDasharray={500} strokeDashoffset={500 * (1 - io(f, a + 8, a + 18))} /></svg>
            </div>;
          })}
        </div>
      </div>
      {/* polaroid, clipped on */}
      <div style={{ position: "absolute", left: X + 40, top: Y + 130, width: 300, padding: "14px 14px 54px", background: "#fff", boxShadow: "0 18px 40px rgba(0,0,0,.25)", transform: `rotate(${-5 + (1 - polaroid) * -25}deg) translateY(${(1 - polaroid) * -700}px)` }}>
        <Img src={staticFile(HERO)} style={{ width: 272, height: 330, objectFit: "cover", display: "block", filter: "sepia(.15)" }} />
        <div style={{ fontFamily: HAND, fontSize: 34, color: C.navy, textAlign: "center", marginTop: 6 }}>her · 7:42</div>
        <svg width={50} height={110} viewBox="0 0 50 110" style={{ position: "absolute", left: 120, top: -40 }}><path d="M14 100 V 18 a 11 11 0 0 1 22 0 V 86 a 6 6 0 0 1 -12 0 V 30" fill="none" stroke="#9AA3B2" strokeWidth={5} strokeLinecap="round" /></svg>
      </div>
      {/* sticky note: what is still missing */}
      <div style={{ position: "absolute", left: 650, top: 1450, width: 340, padding: "26px 26px 30px", background: "#FFE37A", boxShadow: "0 16px 30px rgba(0,0,0,.3)", transform: `rotate(${4 + (1 - note) * 30}deg) scale(${note})`, transformOrigin: "top right", fontFamily: HAND, fontSize: 40, lineHeight: 1.12, color: "#3a2a00" }}>
        still need:<br />· surgery record<br />· ear-notch photo<br />· release photo
      </div>
      {/* the stamp */}
      <div style={{ position: "absolute", left: 100, top: 1240 + stampY, transform: `rotate(-9deg) scale(${sq})`, opacity: f >= 150 ? 1 : 0 }}>
        <svg width={560} height={200} viewBox="0 0 560 200">
          <defs><filter id="ink"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" /><feDisplacementMap in="SourceGraphic" scale="7" /></filter></defs>
          <g filter="url(#ink)" opacity={stamped ? 0.92 : 1}>
            <rect x="10" y="10" width="540" height="180" rx="22" fill="none" stroke={C.blue} strokeWidth="10" />
            <text x="280" y="100" textAnchor="middle" fontFamily={INTER} fontWeight="900" fontSize="70" fill={C.blue} letterSpacing="6">CONFIRMED</text>
            <text x="280" y="152" textAnchor="middle" fontFamily={INTER} fontWeight="700" fontSize="30" fill={C.blue} letterSpacing="3">A. RAO · COORDINATOR</text>
          </g>
        </svg>
      </div>
      {stamped && <AbsoluteFill style={{ transform: `translate(${(random(`c${f}`) - 0.5) * 14 * io(f, 166, 176, 1, 0)}px, 0)` }} />}
      <Sub lines={[["Kaju writes it up.", 4, 150], ["A person signs off.", 170]]} top={250} size={84} />
      <Grain />
    </AbsoluteFill>
  );
}

/* ══ D · The wall of 146 (660–900) ═══════════════════════════════════ */
const DOGS = ["asleep-by-bicycle", "beside-ac-unit", "black-tan-shopfront", "black-white-on-back", "black-white-snake-plant", "brown-on-ledge", "cream-forecourt", "cream-street-standing", "crossing-street", "dark-asleep-doorway", "ginger-under-chair", "golden-curled-indoors", "pale-by-bowls", "red-under-tables", "tan-granite-step", "tan-lobby-collar", "tan-outside-cafe", "tan-standing-night", "two-on-concrete", "walking-at-dusk", "white-stone-floor"];
const COLS = 11, PW = 150, PH = 186, GX = 168, GY = 206;
const BAD = [{ i: 36, n: "no release photo" }, { i: 49, n: "no release photo" }, { i: 104, n: "vet hasn't signed" }, { i: 118, n: "same dog twice!" }];
const HERE = 73; // her polaroid sits in the middle of the wall
const pos = (i: number) => ({ x: (i % COLS) * GX + (Math.floor(i / COLS) % 2) * 14 + random(`px${i}`) * 10, y: Math.floor(i / COLS) * GY + random(`py${i}`) * 12 });
function Wall() {
  const f = useCurrentFrame();
  const me = pos(HERE);
  const k = io(f, 0, 70, 0, 1, (t) => 1 - Math.pow(1 - t, 3));
  const z = 4.2 + (0.56 - 4.2) * k;
  const wallW = COLS * GX, wallH = Math.ceil(146 / COLS) * GY;
  const O = { x: me.x + PW / 2, y: me.y + PH / 2 };
  const T0 = { x: 540 - O.x, y: 980 - O.y }, T1 = { x: 540 - O.x - 0.56 * (wallW / 2 - O.x), y: 1080 - O.y - 0.56 * (wallH / 2 - O.y) };
  const ox = T0.x + (T1.x - T0.x) * k, oy = T0.y + (T1.y - T0.y) * k, camX = 0, camY = 0;
  const spot = { x: 540 + Math.sin(f / 18) * 330, y: 980 + Math.cos(f / 25) * 520 };
  const found = f > 120, fixed = f > 186;
  const count = Math.floor(io(f, 60, 118, 0, 146, (t) => t));
  return (
    <AbsoluteFill style={{ background: "#141922" }}>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.png")})`, opacity: 0.35, mixBlendMode: "overlay" }} />
      <AbsoluteFill style={{ transform: `translate(${ox + camX}px, ${oy + camY}px)` }}>
        <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${z})`, transformOrigin: `${O.x}px ${O.y}px`, width: wallW, height: wallH }}>
          {Array.from({ length: 146 }).map((_, i) => {
            const p = pos(i), bad = BAD.find((b) => b.i === i);
            const lift = bad && found ? sp(f, 120 + BAD.indexOf(bad) * 6, { damping: 10 }) : 0;
            return <div key={i} style={{ position: "absolute", left: p.x, top: p.y, width: PW, padding: "8px 8px 30px", background: "#F6F1E7", boxShadow: `0 ${6 + lift * 20}px ${14 + lift * 30}px rgba(0,0,0,.5)`, transform: `rotate(${(random(`r${i}`) - 0.5) * 9}deg) scale(${1 + lift * 0.25})`, zIndex: bad ? 5 : 1 }}>
              <Img src={staticFile(i === HERE ? HERO : `dogs/${DOGS[i % DOGS.length]}.jpg`)} style={{ width: PW - 16, height: PH - 50, objectFit: "cover", display: "block", filter: "sepia(.2) contrast(1.05)" }} />
              {bad && found && <div style={{ position: "absolute", left: -10, top: PH - 70, width: 300, padding: "14px 16px", background: fixed ? "#BFF0CF" : "#FFE37A", fontFamily: HAND, fontSize: 50, lineHeight: 1, color: "#2a2300", transform: `rotate(${(BAD.indexOf(bad) % 2 ? 6 : -5)}deg) scale(${sp(f, 128 + BAD.indexOf(bad) * 6)})`, boxShadow: "0 8px 16px rgba(0,0,0,.4)" }}>{fixed ? "✓ fixed" : bad.n}</div>}
            </div>;
          })}
          {/* red string between the problems */}
          <svg width={wallW} height={wallH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 6 }}>
            <path d={BAD.map((b, k) => { const p = pos(b.i); return `${k ? "L" : "M"} ${p.x + PW / 2} ${p.y + 20}`; }).join(" ")} fill="none" stroke={fixed ? C.green : "#E5484D"} strokeWidth={6} strokeDasharray={3000} strokeDashoffset={3000 * (1 - io(f, 132, 170))} />
            {BAD.map((b) => { const p = pos(b.i); return <circle key={b.i} cx={p.x + PW / 2} cy={p.y + 20} r={found ? 12 : 0} fill={fixed ? C.green : "#E5484D"} />; })}
          </svg>
        </div>
      </AbsoluteFill>
      {/* Kaju's search light */}
      <AbsoluteFill style={{ background: `radial-gradient(circle 360px at ${spot.x}px ${spot.y}px, transparent 0%, rgba(5,8,15,${io(f, 60, 80, 0, 0.62) * io(f, 118, 130, 1, 0.15)}) 100%)` }} />
      <div style={{ position: "absolute", left: 70, top: 1700, fontFamily: INTER, fontWeight: 800, fontSize: 64, color: "#fff", fontVariantNumeric: "tabular-nums", opacity: io(f, 56, 66) }}>{count}<span style={{ color: "rgba(255,255,255,.5)", fontSize: 40 }}> / 146 checked</span></div>
      <Sub lines={[["Month end.", 30, 112], ["She is one of 146.", 50, 112], ["Four would have bounced.", 124, 182], ["Kaju caught them first.", 192]]} top={210} size={84} />
      <Vignette k={0.6} />
      <Grain />
    </AbsoluteFill>
  );
}

/* ══ E · Into the folder, out come the files (900–1080) ═══════════════ */
function Folder() {
  const f = useCurrentFrame();
  const open = io(f, 70, 92);
  const papers = [{ k: "deck", r: -14, x: -260 }, { k: "sheet", r: -3, x: -40 }, { k: "mail", r: 10, x: 200 }];
  const stickers = ["Google Workspace", "Excel", "PowerPoint", "Slack", "WhatsApp", "SMS"];
  return (
    <AbsoluteFill style={{ background: "#141922" }}>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.png")})`, opacity: 0.35, mixBlendMode: "overlay" }} />
      <Leak color="255,190,110" />
      {/* polaroids raining into the folder */}
      {Array.from({ length: 22 }).map((_, i) => {
        const t = io(f, i * 1.6, i * 1.6 + 26, 0, 1, (x) => x * x);
        const sx = 120 + random(`fx${i}`) * 840, sy = -300 - random(`fy${i}`) * 300;
        return t > 0 && t < 1 ? <div key={i} style={{ position: "absolute", left: sx + (540 - sx) * t - 60, top: sy + (1180 - sy) * t, width: 120, padding: "6px 6px 22px", background: "#F6F1E7", transform: `rotate(${(1 - t) * 180 * (random(`fr${i}`) - 0.5)}deg) scale(${1 - t * 0.4})` }}><Img src={staticFile(`dogs/${DOGS[i % DOGS.length]}.jpg`)} style={{ width: 108, height: 120, objectFit: "cover", display: "block" }} /></div> : null;
      })}
      {/* folder */}
      <div style={{ position: "absolute", left: 160, top: 1060, width: 760, height: 520, perspective: 1600 }}>
        <div style={{ position: "absolute", inset: 0, background: "#C9933F", borderRadius: "0 22px 22px 22px", boxShadow: "0 50px 100px rgba(0,0,0,.6)" }} />
        <div style={{ position: "absolute", left: 0, top: -50, width: 260, height: 60, background: "#C9933F", borderRadius: "18px 18px 0 0" }} />
        {papers.map((p, i) => {
          const s = sp(f, 92 + i * 8, { damping: 13, stiffness: 110 });
          return <div key={p.k} style={{ position: "absolute", left: 230 + p.x * s, top: 40 - s * 640, width: 320, height: 420, background: "#fff", borderRadius: 10, boxShadow: "0 30px 60px rgba(0,0,0,.45)", transform: `rotate(${p.r * s}deg)`, padding: 26, overflow: "hidden", opacity: open }}>
            {p.k === "deck" && <><div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 24, color: C.navy }}>Board update · October</div><div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 220, marginTop: 30 }}>{[0.8, 0.75, 0.75, 0.75, 0.2].map((h, j) => <div key={j} style={{ flex: 1, height: `${h * 100 * io(f, 104 + j * 3, 118 + j * 3)}%`, background: C.blue, borderRadius: 4 }} />)}</div><div style={{ marginTop: 18, fontFamily: INTER, fontWeight: 700, fontSize: 20, color: "#C4482B" }}>PPTX</div></>}
            {p.k === "sheet" && <><div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 24, color: C.navy }}>Ledger · 142 rows</div>{Array.from({ length: 11 }).map((_, j) => <div key={j} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.8fr", gap: 6, marginTop: 8, opacity: io(f, 104 + j * 2, 110 + j * 2) }}>{[0, 1, 2].map((c) => <div key={c} style={{ height: 16, background: j === 0 ? "#1D6F42" : c === 2 ? "#D7EBDD" : "#EEF1F4", borderRadius: 2 }} />)}</div>)}<div style={{ marginTop: 18, fontFamily: INTER, fontWeight: 700, fontSize: 20, color: "#1D6F42" }}>XLSX · ₹2,34,300</div></>}
            {p.k === "mail" && <><div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 24, color: C.navy }}>To: Trustees</div><div style={{ fontFamily: INTER, fontSize: 19, color: "#556", marginTop: 14, lineHeight: 1.4 }}>October package sent to the city today: 142 verified sterilisations. Deck and ledger attached.</div><div style={{ marginTop: 30, display: "inline-block", padding: "12px 22px", borderRadius: 10, background: C.blue, color: "#fff", fontFamily: INTER, fontWeight: 700, fontSize: 20 }}>Send ✓</div></>}
          </div>;
        })}
        {/* folder front flap */}
        <div style={{ position: "absolute", inset: 0, top: 40, background: "linear-gradient(#E2AE55,#D19A42)", borderRadius: 20, transformOrigin: "bottom center", transform: `rotateX(${open * 62}deg)`, display: "grid", placeItems: "center", boxShadow: "inset 0 2px 0 rgba(255,255,255,.3)" }}>
          <div style={{ fontFamily: HAND, fontSize: 70, color: "#4A2E05", transform: "rotate(-3deg)", opacity: io(f, 36, 50) }}>October · 142 verified</div>
        </div>
      </div>
      {stickers.map((s, i) => { const k = sp(f, 124 + i * 5, { damping: 9, stiffness: 200 }); const a = [[110, 560], [690, 520], [80, 1700], [700, 1720], [380, 1790], [400, 470]][i]; return <div key={s} style={{ position: "absolute", left: a[0], top: a[1], padding: "14px 24px", borderRadius: 999, background: "#fff", fontFamily: INTER, fontWeight: 800, fontSize: 28, color: C.navy, boxShadow: "0 10px 24px rgba(0,0,0,.45)", transform: `rotate(${(i % 2 ? 5 : -6)}deg) scale(${k})` }}>{s}</div>; })}
      <Sub lines={[["Packaged.", 40, 120], ["Decks, ledgers, emails.", 128], ["Already written.", 140]]} top={230} size={84} />
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
}

/* ══ F · Across the city, stamped and signed (1080–1260) ═════════════ */
function City() {
  const f = useCurrentFrame();
  const route = io(f, 6, 70);
  const desk = f >= 84;
  const st = io(f, 104, 112, -500, 0, (t) => t * t);
  const sig = io(f, 124, 156);
  const amt = Math.round(io(f, 130, 166, 0, 234300));
  return (
    <AbsoluteFill>
      {!desk ? <>
        <Photo src="skyline-dog-1920.jpg" dur={90} from={1.9} to={1.6} x={[-120, -60]} y={[60, 0]} dark={0.15} />
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <path id="route" d="M 160 1500 C 300 1300, 260 1100, 480 1040 S 820 900, 880 640" fill="none" stroke={C.gold} strokeWidth={8} strokeLinecap="round" strokeDasharray="1500" strokeDashoffset={1500 * (1 - route)} style={{ filter: `drop-shadow(0 0 16px ${C.gold})` }} />
          <circle cx={160} cy={1500} r={18} fill="#fff" />
          <circle cx={880} cy={640} r={18 + Math.sin(f / 4) * 4} fill={C.gold} opacity={route} />
        </svg>
        <div style={{ position: "absolute", left: 90, top: 1540, fontFamily: INTER, fontWeight: 700, fontSize: 30, color: "#fff", textShadow: "0 2px 10px #000" }}>Coastal Paws Trust</div>
        <div style={{ position: "absolute", left: 640, top: 560, fontFamily: INTER, fontWeight: 700, fontSize: 30, color: "#fff", textShadow: "0 2px 10px #000", opacity: route }}>City vet office</div>
        <Vignette k={0.55} />
        <Sub lines={[["Sent across the city.", 4]]} top={250} size={84} />
      </> : <>
        <AbsoluteFill style={{ background: "#1B1712" }} />
        <AbsoluteFill style={{ background: "radial-gradient(60% 45% at 50% 52%, #4A3A26 0%, #1B1712 70%)" }} />
        <div style={{ position: "absolute", left: 120, top: 640, width: 840, height: 820, background: "#FBF8F2", borderRadius: 10, boxShadow: "0 50px 100px rgba(0,0,0,.7)", transform: `rotate(-2deg) scale(${io(f, 84, 100, 1.25, 1)})`, padding: 60, fontFamily: INTER }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.16em", color: C.mute }}>REPORT PACKAGE · OCTOBER</div>
          <div style={{ fontSize: 50, fontWeight: 800, color: C.navy, marginTop: 10, letterSpacing: "-0.02em" }}>142 verified sterilisations</div>
          {["710 of 710 evidence files", "No animal billed twice", "All releases inside the ward"].map((t, i) => <div key={t} style={{ fontSize: 30, color: C.navy, marginTop: 20, opacity: io(f, 90 + i * 5, 96 + i * 5) }}><span style={{ color: C.green }}>✓</span> {t} <span style={{ fontSize: 20, color: C.blue }}>· checked by Kaju</span></div>)}
          <div style={{ marginTop: 50, fontSize: 26, color: C.mute }}>Sanctioned for payment</div>
          <div style={{ fontSize: 86, fontWeight: 900, color: f > 130 ? C.green : "#D0D5DE", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>₹{amt.toLocaleString("en-IN")}</div>
          <svg width={500} height={120} style={{ position: "absolute", right: 50, bottom: 40 }}>
            <text x="10" y="90" fontFamily={HAND} fontWeight={700} fontSize={92} fill="none" stroke={C.navy} strokeWidth={2.5} strokeDasharray={1400} strokeDashoffset={1400 * (1 - sig)}>K. Iyer</text>
            <text x="10" y="90" fontFamily={HAND} fontWeight={700} fontSize={92} fill={C.navy} opacity={io(f, 150, 160)}>K. Iyer</text>
          </svg>
        </div>
        <div style={{ position: "absolute", left: 150, top: 1290 + st, transform: "rotate(-10deg) scale(.62)", transformOrigin: "top left", opacity: f >= 100 ? 0.95 : 0 }}>
          <svg width={560} height={190} viewBox="0 0 560 190"><defs><filter id="ink2"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9" /><feDisplacementMap in="SourceGraphic" scale="8" /></filter></defs>
            <g filter="url(#ink2)"><rect x="10" y="10" width="540" height="170" rx="20" fill="none" stroke={C.green} strokeWidth="11" /><text x="280" y="125" textAnchor="middle" fontFamily={INTER} fontWeight="900" fontSize="96" fill={C.green} letterSpacing="8">ACCEPTED</text></g></svg>
        </div>
        <Sub lines={[["Checked by the city.", 88], ["Signed. Paid.", 140]]} top={250} size={84} />
        <Grain />
      </>}
      <Grain />
    </AbsoluteFill>
  );
}

/* ══ G · Back on her street (1260–1400) ═════════════════════════════ */
function Home() {
  const f = useCurrentFrame();
  const run = io(f, 10, 50);
  const tag = sp(f, 52, { damping: 10 });
  const title = sp(f, 66, { damping: 14 });
  return (
    <AbsoluteFill>
      <Photo src={HERO} dur={140} from={1.05} to={1.12} x={[0, 10]} y={[0, 10]} warm />
      <Leak />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,8,15,.0) 40%, rgba(5,8,15,.85) 100%)" }} />
      <KajuAt x={1240 - run * 520} y={1280 + (run < 1 ? -Math.abs(Math.sin(f * 0.7)) * 22 : 0)} size={300} state={run < 1 ? "trotting" : f < 80 ? "tailWag" : "sitting"} flip={run < 1} />
      <div style={{ position: "absolute", left: DOG.x - 40, top: DOG.y - 250, transform: `scale(${tag}) rotate(-4deg)`, transformOrigin: "bottom left", padding: "14px 22px", borderRadius: 14, background: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,.4)", fontFamily: INTER }}>
        <div style={{ fontWeight: 800, fontSize: 26, color: C.navy }}>ADY-ABC-1147</div>
        <div style={{ fontWeight: 600, fontSize: 22, color: C.green }}>● on the record</div>
      </div>
      <Sub lines={[["Now somebody is counting her.", 20]]} top={230} size={80} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1400, textAlign: "center", opacity: title, transform: `translateY(${(1 - title) * 40}px)` }}>
        <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 150, color: "#fff", letterSpacing: "-0.055em", lineHeight: 1 }}>Meet <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, color: C.gold, letterSpacing: "-0.02em" }}>Kaju.</span></div>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 40, color: "rgba(255,255,255,.88)", marginTop: 14 }}>The AI agent for animal welfare teams.</div>
        <div style={{ marginTop: 34, display: "flex", justifyContent: "center", alignItems: "center", gap: 16, opacity: io(f, 84, 96) }}>
          <img src={staticFile("straypaw-mark.png")} style={{ width: 56, height: 56 }} />
          <span style={{ fontFamily: INTER, fontWeight: 900, fontSize: 46, color: "#fff" }}>StrayPaw</span>
          <span style={{ fontFamily: INTER, fontWeight: 600, fontSize: 38, color: C.gold }}>straypaw.org</span>
        </div>
      </div>
      <Grain />
    </AbsoluteFill>
  );
}

export const FILM: [string, number, () => React.ReactElement][] = [
  ["viewfinder", 180, Viewfinder], ["ribbon", 240, Ribbon], ["dossier", 240, Dossier], ["wall", 240, Wall], ["folder", 180, Folder], ["city", 180, City], ["home", 140, Home],
];
export const FILM_TOTAL = FILM.reduce((n, [, d]) => n + d, 0);

/** Soft cross-dissolve with a breath of blur between scenes (12 frames overlap). */
const X = 12;
function Dissolve({ dur, first, last, children }: { dur: number; first: boolean; last: boolean; children: React.ReactNode }) {
  const f = useCurrentFrame();
  const o = Math.min(first ? 1 : io(f, 0, X), last ? 1 : io(f, dur, dur + X, 1, 0));
  const b = (1 - o) * 16;
  return <AbsoluteFill style={{ opacity: o, filter: b > 0.3 ? `blur(${b}px)` : undefined }}>{children}</AbsoluteFill>;
}

export function Film() {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: "#05080F" }}>
      <style>{`@font-face{font-family:SPHand;src:url(${staticFile("caveat.woff2")})}.kaju{display:block;overflow:visible}.kaju .kj-pose,.kaju .kj-loop,.kaju .kj-ear-up,.kaju .kj-ear-flop,.kaju .kj-flip,.kaju .kj-shadow{transform-box:view-box;transform-origin:0 0}.kaju.is-flip .kj-flip{transform:translateX(240px) scaleX(-1)}.kaju .kj-shadow{display:none}.kaju-explorer .kj-lids{opacity:0}`}</style>
      {FILM.map(([id, d, Comp], i) => { const from = at; at += d; return <Sequence key={id} from={from} durationInFrames={d + (i < FILM.length - 1 ? X : 0)} name={id}><Dissolve dur={d} first={i === 0} last={i === FILM.length - 1}><Comp /></Dissolve></Sequence>; })}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, textAlign: "center", fontFamily: INTER, fontSize: 21, color: "rgba(255,255,255,.5)" }}>Product demo · illustrative records</div>
      <Audio src={staticFile("film-music.wav")} />
    </AbsoluteFill>
  );
}
