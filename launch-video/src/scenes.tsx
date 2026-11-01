import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Kaju } from "./kaju/Kaju";
import type { KajuState } from "./kaju/poses";
import { C, Check, DEVA, Flash, INTER, Kicker, Kinetic, SERIF, clamp, ease, useLayout, useSpring } from "./ui";

/* ── 1 · Hook: the paperwork behind one dog ────────────────────────── */
export function Hook() {
  const f = useCurrentFrame();
  const { u, V, width, height } = useLayout();
  const lines = [["1", "street dog."], ["5", "photos."], ["1", "vet signature."], ["1", "government audit."]];
  const flood = interpolate(f, [56, 86], [0, 1], clamp);
  const shake = f > 56 && f < 92 ? (random(`s${f}`) - 0.5) * 10 * u : 0;
  const cols = V ? 12 : 22, rows = V ? 22 : 12, cell = (V ? width : width) / cols;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
      {/* the pile of forms */}
      <AbsoluteFill>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const r = random(`d${i}`);
          const on = flood > r;
          return <div key={i} style={{ position: "absolute", left: (i % cols) * cell + cell * 0.18, top: Math.floor(i / cols) * (height / rows) + 10, width: cell * 0.64, height: (height / rows) * 0.7, borderRadius: 6 * u, background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.12)", opacity: on ? 1 : 0, transform: `scale(${on ? 1 : 0.6}) rotate(${(r - 0.5) * 10}deg)` }}>
            <div style={{ margin: "18% 14% 0", height: 4 * u, background: "rgba(255,255,255,.2)", borderRadius: 4 }} />
            <div style={{ margin: "10% 14% 0", width: "50%", height: 4 * u, background: "rgba(255,255,255,.14)", borderRadius: 4 }} />
          </div>;
        })}
      </AbsoluteFill>
      <div style={{ display: "grid", gap: 8 * u, textAlign: "left", position: "relative" }}>
        {lines.map(([n, t], i) => {
          const d = 4 + i * 11;
          const s = useSpring(d, { damping: 12, stiffness: 220 });
          return <div key={i} style={{ fontFamily: INTER, fontWeight: 800, fontSize: (V ? 92 : 96) * u, letterSpacing: "-0.05em", lineHeight: 1, color: "#fff", opacity: s, transform: `translateX(${(1 - s) * -60}px) scale(${1.25 - 0.25 * s})`, transformOrigin: "left center", filter: `blur(${(1 - s) * 8}px)` }}>
            <span style={{ color: C.gold, fontVariantNumeric: "tabular-nums" }}>{n}</span> {t}
          </div>;
        })}
        <div style={{ marginTop: 26 * u, fontFamily: SERIF, fontStyle: "italic", fontSize: 76 * u, color: C.sky, opacity: interpolate(f, [52, 62], [0, 1], clamp), transform: `translateY(${interpolate(f, [52, 64], [20, 0], clamp)}px)` }}>× every dog, every month.</div>
      </div>
      <Flash at={92} len={6} />
    </AbsoluteFill>
  );
}

/* ── 2 · Reveal ─────────────────────────────────────────────────────── */
export function Reveal() {
  const f = useCurrentFrame();
  const { u, V } = useLayout();
  const pop = useSpring(6, { damping: 9, stiffness: 120 });
  const state: KajuState = f < 40 ? "greeting" : f < 80 ? "tailWag" : "sitting";
  const ring = interpolate(f, [4, 40], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: V ? "column" : "row", gap: (V ? 30 : 60) * u }}>
      <div style={{ position: "relative", width: 520 * u, height: 460 * u, display: "grid", placeItems: "center" }}>
        <div style={{ position: "absolute", width: 480 * u, height: 480 * u, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}55 0%, transparent 65%)`, transform: `scale(${0.4 + ring * 0.8})`, opacity: 1 - ring * 0.3 }} />
        <div style={{ position: "absolute", width: 440 * u, height: 440 * u, borderRadius: "50%", border: `3px solid ${C.turmeric}`, transform: `scale(${0.3 + ring})`, opacity: 1 - ring }} />
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2, r = 120 + ring * 160;
          return <div key={i} style={{ position: "absolute", fontSize: 30 * u, transform: `translate(${Math.cos(a) * r * u}px, ${Math.sin(a) * r * u}px) rotate(${a}rad)`, opacity: (1 - ring) * 0.9 }}>🐾</div>;
        })}
        <div style={{ transform: `translateY(${(1 - pop) * 260}px) scale(${0.6 + pop * 0.4})` }}>
          <Kaju state={state} size={460 * u} still />
        </div>
      </div>
      <div style={{ textAlign: V ? "center" : "left" }}>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 30 * u, color: C.blue, letterSpacing: "0.02em", opacity: interpolate(f, [18, 28], [0, 1], clamp), marginBottom: 10 * u }}>STRAYPAW PRESENTS</div>
        <Kinetic text="Meet Kaju." size={(V ? 170 : 160) * u} delay={20} align={V ? "center" : "left"} italicWords={["Kaju"]} />
        <div style={{ marginTop: 18 * u, maxWidth: 760 * u }}>
          <Kinetic text={"The AI agent for\nanimal welfare programmes."} size={52 * u} weight={600} delay={40} stagger={2} color="#33415C" align={V ? "center" : "left"} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── 3 · WhatsApp intake ────────────────────────────────────────────── */
const HINDI = "गांधी नगर सेकंड स्ट्रीट पर एक मादा कुत्ता है, कान पर निशान नहीं है, पीछे का पैर थोड़ा लंगड़ा रहा है।";
const ENGLISH = "Female dog, Gandhi Nagar 2nd Street. No ear notch. Slight limp in a hind leg.";

function Phone({ children, s }: { children: React.ReactNode; s: number }) {
  const { u } = useLayout();
  return (
    <div style={{ width: 470 * u, height: 900 * u, borderRadius: 64 * u, background: "#0a0f1a", padding: 14 * u, boxShadow: "0 50px 120px rgba(0,0,0,.45), inset 0 0 0 2px rgba(255,255,255,.12)", transform: `translateY(${(1 - s) * 400}px) rotate(${(1 - s) * -8}deg)`, opacity: s }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 52 * u, overflow: "hidden", background: "#ECE5DD", position: "relative" }}>{children}</div>
    </div>
  );
}

export function WhatsApp() {
  const f = useCurrentFrame();
  const { u, V } = useLayout();
  const ph = useSpring(4, { damping: 15 });
  const photo = useSpring(26, { damping: 11, stiffness: 180 });
  const voice = useSpring(46, { damping: 11, stiffness: 180 });
  const typed = Math.floor(interpolate(f, [80, 140], [0, HINDI.length], clamp));
  const tr = interpolate(f, [150, 172], [0, 1], { ...clamp, easing: ease });
  const beam = interpolate(f, [62, 84], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ padding: (V ? 90 : 70) * u, flexDirection: V ? "column" : "row", alignItems: "center", justifyContent: V ? "flex-start" : "center", gap: (V ? 40 : 80) * u }}>
      {V && <div style={{ display: "grid", gap: 20 * u, justifyItems: "center" }}><Kicker n="01" label="WhatsApp intake" dark /><Kinetic text={"A voice note.\nIn Hindi."} size={96 * u} color="#fff" delay={4} italicWords={["Hindi."]} /></div>}
      <div style={{ transform: `scale(${V ? 0.98 : 1})`, transformOrigin: "top center", marginTop: V ? -10 * u : 0 }}>
        <Phone s={ph}>
          <div style={{ height: 120 * u, background: "#075E54", display: "flex", alignItems: "flex-end", gap: 16 * u, padding: `0 ${24 * u}px ${18 * u}px`, color: "#fff", fontFamily: INTER }}>
            <div style={{ width: 54 * u, height: 54 * u, borderRadius: "50%", background: "#cfe9dd", color: "#075E54", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 22 * u }}>RK</div>
            <div><div style={{ fontWeight: 600, fontSize: 26 * u }}>Ravi · Field team</div><div style={{ fontSize: 18 * u, opacity: .8 }}>online</div></div>
          </div>
          <div style={{ padding: 22 * u, display: "grid", gap: 16 * u, justifyItems: "start" }}>
            <div style={{ background: "#fff", padding: 8 * u, borderRadius: 18 * u, transform: `scale(${photo})`, transformOrigin: "left top", boxShadow: "0 2px 4px rgba(0,0,0,.1)" }}>
              <Img src={staticFile("dog5.jpg")} style={{ width: 340 * u, height: 300 * u, objectFit: "cover", borderRadius: 12 * u, display: "block" }} />
              <div style={{ fontFamily: INTER, fontSize: 16 * u, color: "#667", textAlign: "right", marginTop: 6 * u }}>07:42 ✓✓</div>
            </div>
            <div style={{ background: "#fff", padding: `${16 * u}px ${18 * u}px`, borderRadius: 18 * u, display: "flex", alignItems: "center", gap: 14 * u, transform: `scale(${voice})`, transformOrigin: "left top", boxShadow: "0 2px 4px rgba(0,0,0,.1)" }}>
              <div style={{ width: 58 * u, height: 58 * u, borderRadius: "50%", background: "#075E54", display: "grid", placeItems: "center", color: "#fff", fontSize: 24 * u }}>▶</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 * u, height: 50 * u }}>
                {Array.from({ length: 26 }).map((_, i) => <div key={i} style={{ width: 5 * u, borderRadius: 3, background: f > 50 ? "#075E54" : "#9aa", height: (10 + Math.abs(Math.sin(i * 1.7 + f * 0.35)) * 34 * (f > 50 && f < 150 ? 1 : 0.4)) * u }} />)}
              </div>
              <div style={{ fontFamily: INTER, fontSize: 18 * u, color: "#556" }}>0:14</div>
            </div>
          </div>
        </Phone>
      </div>
      {/* the beam into Kaju */}
      <div style={{ display: "grid", gap: 24 * u, maxWidth: (V ? 900 : 820) * u, position: V ? "absolute" : "relative", bottom: V ? 150 * u : undefined, left: V ? 90 * u : undefined, right: V ? 90 * u : undefined }}>
        {!V && <><Kicker n="01" label="WhatsApp intake" dark /><Kinetic text={"A voice note.\nIn Hindi."} size={110 * u} color="#fff" delay={4} align="left" italicWords={["Hindi."]} /></>}
        <div style={{ background: "rgba(255,255,255,.96)", borderRadius: 28 * u, padding: 30 * u, boxShadow: "0 30px 80px rgba(0,0,0,.35)", opacity: beam, transform: `translateY(${(1 - beam) * 40}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 * u, marginBottom: 14 * u }}>
            <div style={{ width: 64 * u, height: 54 * u, overflow: "hidden" }}><Kaju state={f < 150 ? "listening" : "explaining"} size={64 * u} still /></div>
            <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 28 * u, color: C.navy }}>Kaju</div>
            <div style={{ fontFamily: INTER, fontSize: 22 * u, color: C.mute }}>{f < 150 ? "transcribing…" : "translated"}</div>
          </div>
          <div style={{ fontFamily: DEVA, fontWeight: 600, fontSize: 36 * u, lineHeight: 1.45, color: C.navy, minHeight: 104 * u }}>{HINDI.slice(0, typed)}<span style={{ opacity: f % 16 < 8 && typed < HINDI.length ? 1 : 0, color: C.blue }}>|</span></div>
          <div style={{ marginTop: 14 * u, paddingTop: 14 * u, borderTop: "2px dashed #E2E7EF", fontFamily: INTER, fontWeight: 600, fontSize: 32 * u, lineHeight: 1.3, color: C.blue, clipPath: `inset(0 ${100 - tr * 100}% 0 0)` }}>{ENGLISH}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── 4 · Kaju prepares the record ──────────────────────────────────── */
export function Record() {
  const f = useCurrentFrame();
  const { u, V } = useLayout();
  const card = useSpring(2, { damping: 15 });
  const rows: [string, string, boolean][] = [["Animal", "Adult female dog", true], ["Place", "Gandhi Nagar 2nd St · GPS 13.0012, 80.2565", true], ["Ear notch", "None: new ABC intake", true], ["Register", "Not a duplicate (1,248 checked)", true], ["Health", "Slight limp: vet to check", false]];
  const click = f > 92;
  const saved = f > 98;
  const press = interpolate(f, [90, 94, 98], [1, 0.92, 1], clamp);
  const cx = interpolate(f, [62, 90], [V ? 900 : 1500, V ? 540 : 960], { ...clamp, easing: ease }) * u;
  const cy = interpolate(f, [62, 90], [V ? 1700 : 1000, V ? 1395 : 846], { ...clamp, easing: ease }) * u;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 * u }}>
      <div style={{ display: "grid", gap: 18 * u, justifyItems: "center" }}><Kicker n="02" label="Kaju prepares the record" /><Kinetic text="Ready in seconds. You confirm." size={(V ? 84 : 92) * u} delay={4} italicWords={["You", "confirm."]} /></div>
      <div style={{ width: (V ? 900 : 1100) * u, background: "#fff", borderRadius: 32 * u, padding: 36 * u, boxShadow: "0 40px 100px rgba(11,30,61,.18)", border: `3px solid ${saved ? C.green : "transparent"}`, transform: `translateY(${(1 - card) * 120}px) scale(${0.9 + card * 0.1})`, opacity: card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 * u }}>
          <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 38 * u, color: C.navy }}>New ABC record</div>
          <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 22 * u, padding: `${8 * u}px ${16 * u}px`, borderRadius: 999, background: saved ? "#E6F6EE" : "#EEF3FD", color: saved ? C.green : C.blue }}>{saved ? "Saved · logged" : "Prepared by Kaju"}</div>
        </div>
        {rows.map(([k, v, ok], i) => {
          const s = useSpring(14 + i * 7, { damping: 16, stiffness: 200 });
          return <div key={k} style={{ display: "grid", gridTemplateColumns: `${200 * u}px 1fr ${44 * u}px`, alignItems: "center", padding: `${16 * u}px 0`, borderTop: "2px solid #EEF1F6", opacity: s, transform: `translateX(${(1 - s) * 40}px)`, fontFamily: INTER, fontSize: 28 * u }}>
            <span style={{ color: C.mute }}>{k}</span><span style={{ color: C.navy, fontWeight: 600 }}>{v}</span>
            {ok ? <Check size={36 * u} /> : <div style={{ width: 36 * u, height: 36 * u, borderRadius: "50%", background: C.turmeric, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 24 * u }}>!</div>}
          </div>;
        })}
        <div style={{ display: "flex", gap: 12 * u, flexWrap: "wrap", marginTop: 18 * u, opacity: interpolate(f, [52, 60], [0, 1], clamp) }}>
          <span style={{ fontFamily: INTER, fontSize: 24 * u, color: C.mute, alignSelf: "center" }}>Still needed:</span>
          {["Surgery record", "Ear-notch photo", "Release photo"].map((t) => <span key={t} style={{ fontFamily: INTER, fontWeight: 600, fontSize: 22 * u, padding: `${8 * u}px ${16 * u}px`, borderRadius: 999, background: "#FFF4DE", color: "#8A5A00" }}>{t}</span>)}
        </div>
        <div style={{ marginTop: 26 * u, display: "flex", justifyContent: "center" }}>
          <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 30 * u, color: "#fff", background: saved ? C.green : C.blue, padding: `${18 * u}px ${44 * u}px`, borderRadius: 16 * u, transform: `scale(${press})`, display: "flex", alignItems: "center", gap: 12 * u }}>{saved ? <><Check size={30 * u} color="rgba(255,255,255,.25)" />Saved to the record</> : "Confirm and save"}</div>
        </div>
      </div>
      {/* cursor */}
      <div style={{ position: "absolute", left: cx, top: cy, opacity: interpolate(f, [60, 66, 112, 118], [0, 1, 1, 0], clamp) }}>
        {click && <div style={{ position: "absolute", left: -40 * u, top: -40 * u, width: 80 * u, height: 80 * u, borderRadius: "50%", border: `4px solid ${C.blue}`, opacity: interpolate(f, [92, 108], [1, 0], clamp), transform: `scale(${interpolate(f, [92, 108], [0.3, 1.4], clamp)})` }} />}
        <svg width={52 * u} height={52 * u} viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,.3))" }}><path d="M4 2l16 9.5-7 1.6-3.6 6.6z" fill={C.navy} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </div>
      <Flash at={98} len={8} color={C.green} />
    </AbsoluteFill>
  );
}

/* ── 5 · Month-end check ───────────────────────────────────────────── */
export function MonthEnd() {
  const f = useCurrentFrame();
  const { u, V } = useLayout();
  const cols = V ? 12 : 22, n = 146, cell = (V ? 66 : 48) * u;
  const bad = new Set([37, 88, 121, 140]);
  const sweep = interpolate(f, [16, 70], [0, n], clamp);
  const count = Math.floor(sweep);
  const reveal = interpolate(f, [74, 84], [0, 1], clamp);
  const labels = ["2 missing release photos", "1 vet sign-off pending", "1 animal billed twice"];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 44 * u }}>
      <div style={{ display: "grid", gap: 18 * u, justifyItems: "center" }}><Kicker n="03" label="Month-end check" dark /><Kinetic text={"146 procedures.\nChecked before lunch."} size={(V ? 92 : 96) * u} color="#fff" delay={2} italicWords={["lunch."]} /></div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap: 8 * u }}>
        {Array.from({ length: n }).map((_, i) => {
          const done = i < count;
          const isBad = bad.has(i) && reveal > 0;
          const pulse = isBad ? 1 + Math.sin(f / 4) * 0.12 : 1;
          return <div key={i} style={{ width: cell, height: cell, borderRadius: 10 * u, background: isBad ? C.red : done ? C.green : "rgba(255,255,255,.1)", transform: `scale(${done ? pulse : 0.7})`, boxShadow: isBad ? `0 0 ${30 * u}px ${C.red}` : "none", transition: "none" }} />;
        })}
      </div>
      <div style={{ display: "flex", gap: 16 * u, flexWrap: "wrap", justifyContent: "center", maxWidth: 980 * u }}>
        <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 40 * u, color: C.gold, fontVariantNumeric: "tabular-nums" }}>{count}/146 checked</div>
        {labels.map((t, i) => { const s = useSpring(84 + i * 6); return <div key={t} style={{ fontFamily: INTER, fontWeight: 600, fontSize: 28 * u, color: "#fff", padding: `${10 * u}px ${20 * u}px`, borderRadius: 999, background: "rgba(229,72,77,.18)", border: `2px solid ${C.red}`, opacity: s, transform: `translateY(${(1 - s) * 20}px)` }}>{t}</div>; })}
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 44 * u, color: C.sky, opacity: interpolate(f, [104, 114], [0, 1], clamp), width: "100%", textAlign: "center" }}>Fixes prepared. Waiting for your yes.</div>
      </div>
    </AbsoluteFill>
  );
}

/* ── 6 · The real app ───────────────────────────────────────────────── */
const CLIPS = [{ from: 15.5, label: "Kaju turns WhatsApp into a record" }, { from: 45, label: "Finds what blocks the package" }, { from: 99, label: "Makes the board deck" }, { from: 150.5, label: "Checks it for the government" }];
export function RealApp() {
  const f = useCurrentFrame();
  const { u, V, width } = useLayout();
  const { fps } = useVideoConfig();
  const each = 30;
  const idx = Math.min(CLIPS.length - 1, Math.floor(f / each));
  const local = f - idx * each;
  const w = (V ? 1000 : 1500) * u, h = w * (1080 - 150) / 1920;
  const s = useSpring(0, { damping: 16 });
  const zoom = interpolate(local, [0, each], [1.0, 1.12], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 36 * u }}>
      <div style={{ display: "grid", gap: 16 * u, justifyItems: "center" }}><Kicker n="★" label="Inside the real app" /></div>
      <div style={{ width: w, borderRadius: 22 * u, overflow: "hidden", background: "#fff", boxShadow: "0 50px 120px rgba(11,30,61,.3)", transform: `scale(${0.85 + s * 0.15}) rotateX(${(1 - s) * 18}deg)`, opacity: s }}>
        <div style={{ height: 44 * u, background: "#EEF1F6", display: "flex", alignItems: "center", gap: 10 * u, padding: `0 ${18 * u}px` }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 14 * u, height: 14 * u, borderRadius: "50%", background: c }} />)}
          <span style={{ marginLeft: 18 * u, fontFamily: INTER, fontSize: 18 * u, color: C.mute, background: "#fff", padding: `${4 * u}px ${18 * u}px`, borderRadius: 8 * u }}>straypaw.org/ngo</span>
        </div>
        <div style={{ width: w, height: h, overflow: "hidden", position: "relative" }}>
          {CLIPS.map((c, i) => i === idx && (
            <Sequence key={i} from={i * each} durationInFrames={each} layout="none">
              <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: i % 2 ? "100% 0%" : "70% 20%" }}>
                <OffthreadVideo src={staticFile("demo.mp4")} startFrom={Math.round(c.from * fps)} playbackRate={1.6} muted style={{ width: w, height: w * 1080 / 1920, display: "block" }} />
              </div>
            </Sequence>
          ))}
        </div>
      </div>
      <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 46 * u, color: C.navy, letterSpacing: "-0.03em" }}>{CLIPS[idx].label}</div>
      {void width}
    </AbsoluteFill>
  );
}

/* ── 7 · Files and tools ───────────────────────────────────────────── */
const TOOLS = ["Google Workspace", "Microsoft 365", "Excel", "PowerPoint", "WhatsApp", "Slack", "SMS", "PDF", "Word", "Maps"];
export function Files() {
  const f = useCurrentFrame();
  const { u, V } = useLayout();
  const files = [{ t: "PPTX", c: "#C4482B", n: "Board deck" }, { t: "XLSX", c: "#1D6F42", n: "Ledger" }, { t: "PDF", c: "#D93A3A", n: "Package" }, { t: "DOCX", c: "#2B5BC4", n: "Report" }];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 * u }}>
      {/* orbiting tools */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {TOOLS.map((t, i) => {
          const a = (i / TOOLS.length) * Math.PI * 2 + f / 70;
          const R = (V ? 500 : 800) * u, ry = (V ? 860 : 440) * u;
          const s = useSpring(10 + i * 3);
          return <div key={t} style={{ position: "absolute", transform: `translate(${Math.cos(a) * R}px, ${Math.sin(a) * ry}px) scale(${s})`, fontFamily: INTER, fontWeight: 600, fontSize: 26 * u, color: "#fff", padding: `${12 * u}px ${22 * u}px`, borderRadius: 999, background: "rgba(255,255,255,.08)", border: "1.5px solid rgba(255,255,255,.18)", whiteSpace: "nowrap" }}>{t}</div>;
        })}
      </AbsoluteFill>
      <div style={{ display: "grid", gap: 18 * u, justifyItems: "center", position: "relative", zIndex: 5, textShadow: "0 6px 30px rgba(7,20,40,.9)" }}><Kicker n="04" label="Works with your files and tools" dark /><Kinetic text={"Decks. Ledgers. Emails.\nDone."} size={(V ? 92 : 100) * u} color="#fff" delay={4} italicWords={["Done."]} /></div>
      <div style={{ position: "relative", width: (V ? 860 : 1200) * u, height: (V ? 520 : 420) * u }}>
        {[1, 3, 2].map((n, i) => { const s = useSpring(30 + i * 8, { damping: 13 }); return <Img key={n} src={staticFile(`deck-${n}.png`)} style={{ position: "absolute", left: "50%", top: 0, width: (V ? 640 : 600) * u, borderRadius: 12 * u, boxShadow: "0 30px 70px rgba(0,0,0,.4)", transform: `translateX(-50%) translateX(${(i - 1) * (V ? 120 : 260) * u * s}px) translateY(${(1 - s) * 300 + Math.abs(i - 1) * 30 * u}px) rotate(${(i - 1) * 7 * s}deg)`, opacity: s, zIndex: i === 1 ? 2 : 1 }} />; })}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", gap: 18 * u, zIndex: 3 }}>
          {files.map((x, i) => { const s = useSpring(56 + i * 5, { damping: 10, stiffness: 200 }); return <div key={x.t} style={{ width: 150 * u, padding: `${18 * u}px 0`, borderRadius: 18 * u, background: "#fff", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,.3)", transform: `translateY(${(1 - s) * 80}px) scale(${s})` }}>
            <div style={{ margin: "0 auto", width: 70 * u, height: 70 * u, borderRadius: 14 * u, background: x.c, color: "#fff", fontFamily: INTER, fontWeight: 800, fontSize: 20 * u, display: "grid", placeItems: "center" }}>{x.t}</div>
            <div style={{ marginTop: 10 * u, fontFamily: INTER, fontWeight: 600, fontSize: 20 * u, color: C.navy }}>{x.n}</div>
          </div>; })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── 8 · Government side ───────────────────────────────────────────── */
export function Government() {
  const f = useCurrentFrame();
  const { u, V } = useLayout();
  const card = useSpring(4, { damping: 15 });
  const checks = ["710 of 710 evidence files", "0 animals billed twice", "All release points in the ward"];
  const stamp = interpolate(f, [70, 78], [3, 1], { ...clamp, easing: ease });
  const stampOn = f >= 70;
  const shake = f >= 78 && f < 88 ? (random(`g${f}`) - 0.5) * 16 * u : 0;
  const money = Math.round(interpolate(f, [86, 118], [0, 234300], { ...clamp, easing: ease }));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 * u, transform: `translate(${shake}px, ${shake}px)` }}>
      <div style={{ display: "grid", gap: 18 * u, justifyItems: "center" }}><Kicker n="05" label="At the municipal office" /><Kinetic text={V ? "Checked.\nAccepted. Paid." : "Checked. Accepted. Paid."} size={(V ? 104 : 104) * u} delay={2} italicWords={["Paid."]} /></div>
      <div style={{ position: "relative", width: (V ? 900 : 1000) * u, background: "#fff", borderRadius: 32 * u, padding: 40 * u, boxShadow: "0 40px 100px rgba(11,30,61,.18)", transform: `translateY(${(1 - card) * 140}px)`, opacity: card }}>
        <div style={{ fontFamily: INTER, fontSize: 24 * u, color: C.mute, fontWeight: 600 }}>REPORT PACKAGE · OCTOBER</div>
        <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 52 * u, color: C.navy, letterSpacing: "-0.03em", margin: `${6 * u}px 0 ${18 * u}px` }}>142 verified sterilisations</div>
        {checks.map((t, i) => { const s = useSpring(22 + i * 9, { damping: 14, stiffness: 200 }); return <div key={t} style={{ display: "flex", alignItems: "center", gap: 16 * u, padding: `${12 * u}px 0`, opacity: s, transform: `translateX(${(1 - s) * 30}px)`, fontFamily: INTER, fontSize: 32 * u, color: C.navy, fontWeight: 600 }}><Check size={40 * u} />{t}<span style={{ marginLeft: "auto", fontSize: 20 * u, color: C.blue, fontWeight: 600 }}>Kaju</span></div>; })}
        <div style={{ marginTop: 24 * u, paddingTop: 24 * u, borderTop: "2px solid #EEF1F6", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontFamily: INTER, fontSize: 28 * u, color: C.mute }}>Sanctioned for payment</span>
          <span style={{ fontFamily: INTER, fontWeight: 800, fontSize: 72 * u, color: f > 86 ? C.green : "#C9D0DC", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>₹{money.toLocaleString("en-IN")}</span>
        </div>
        {stampOn && <div style={{ position: "absolute", left: 40 * u, bottom: 110 * u, transform: `rotate(-8deg) scale(${stamp})`, opacity: interpolate(f, [70, 74], [0, 1], clamp), border: `6px solid ${C.green}`, color: C.green, borderRadius: 14 * u, padding: `${8 * u}px ${24 * u}px`, fontFamily: INTER, fontWeight: 900, fontSize: 52 * u, letterSpacing: "0.06em", background: "rgba(255,255,255,.9)" }}>ACCEPTED</div>}
      </div>
      <Flash at={78} len={6} color={C.gold} />
    </AbsoluteFill>
  );
}

/* ── 9 · End card ───────────────────────────────────────────────────── */
export function End() {
  const f = useCurrentFrame();
  const { u, V } = useLayout();
  const phase2 = f > 64;
  const k = useSpring(66, { damping: 10, stiffness: 120 });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24 * u, padding: 80 * u }}>
      {!phase2 ? (
        <Kinetic text={"From a voice note\nto a sanctioned payment."} size={(V ? 104 : 116) * u} color="#fff" delay={2} stagger={4} italicWords={["voice", "note", "payment."]} />
      ) : (
        <>
          <div style={{ transform: `translateY(${(1 - k) * 200}px) scale(${0.7 + k * 0.3})` }}><Kaju state={f < 100 ? "success" : "sitting"} size={(V ? 380 : 300) * u} still /></div>
          <Kinetic text="Meet Kaju." size={(V ? 150 : 130) * u} color="#fff" delay={70} italicWords={["Kaju."]} />
          <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 38 * u, color: "rgba(255,255,255,.8)", opacity: interpolate(f, [84, 94], [0, 1], clamp) }}>Kaju does the paperwork. Your team does the work.</div>
          <div style={{ marginTop: 26 * u, display: "flex", alignItems: "center", gap: 16 * u, opacity: interpolate(f, [94, 104], [0, 1], clamp) }}>
            <Img src={staticFile("straypaw-mark.png")} style={{ width: 64 * u, height: 64 * u }} />
            <span style={{ fontFamily: INTER, fontWeight: 800, fontSize: 48 * u, color: "#fff", letterSpacing: "-0.03em" }}>StrayPaw</span>
            <span style={{ fontFamily: INTER, fontWeight: 500, fontSize: 36 * u, color: C.gold, marginLeft: 10 * u }}>straypaw.org</span>
          </div>
          <div style={{ fontFamily: INTER, fontSize: 24 * u, color: "rgba(255,255,255,.55)", opacity: interpolate(f, [104, 114], [0, 1], clamp) }}>Every change confirmed by a person.</div>
        </>
      )}
      <Flash at={64} len={8} />
    </AbsoluteFill>
  );
}
