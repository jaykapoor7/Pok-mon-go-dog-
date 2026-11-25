import React, { useMemo } from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, EASE, INTER, clamp01, rise, useLayout } from "./theme";
import { anchorBox, cameraTrack, chunk, frameToTake, pointerAt, pointerMoments, pointerPresence, project, splitLike, takeToFrame, takeToFrameNear, type Cam, type PlacedSpan, type Viewport } from "./lib";
import type { Callout, ScreenSegment, Subtitle, TakeLog } from "./types";
import { CaptionBand, type SubtitleCue } from "./Captions";

/* ── Backdrop: soft off-white with a faint blue-tinted light from above ─ */
export function Backdrop() {
  return <AbsoluteFill style={{ background: `radial-gradient(90% 70% at 50% 8%, #eaf0ff 0%, rgba(234,240,255,0) 62%), linear-gradient(180deg, #f7f9fc 0%, ${C.fill} 55%, #eff2f8 100%)` }} />;
}

/* ── The window ─────────────────────────────────────────────────────── */
export type WindowRect = { x: number; y: number; vw: number; vh: number; bar: number; radius: number };
export function Window({ rect, host, children, u }: { rect: WindowRect; host?: string; children: React.ReactNode; u: number }) {
  const { x, y, vw, vh, bar, radius } = rect;
  const dot = bar * 0.25;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: vw, height: vh + bar, borderRadius: radius, background: C.ground, boxShadow: `0 0 0 1px ${C.hairline}, 0 1px 2px rgba(11,30,61,.05), 0 ${14 * u}px ${36 * u}px ${-10 * u}px rgba(11,30,61,.13), 0 ${44 * u}px ${90 * u}px ${-28 * u}px rgba(11,30,61,.2)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: bar, background: "#fbfcfe", borderBottom: `1px solid ${C.hairline}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", left: bar * 0.42, display: "flex", gap: dot * 0.72 }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: dot, height: dot, borderRadius: dot, background: "#d7dce6" }} />)}
          </div>
          {host && <div style={{ fontFamily: INTER, fontWeight: 400, fontSize: bar * 0.335, color: C.muted, letterSpacing: "-0.005em", padding: `${bar * 0.13}px ${bar * 0.42}px`, borderRadius: 999, background: C.fill, boxShadow: `inset 0 0 0 1px ${C.hairline}`, whiteSpace: "nowrap", maxWidth: vw - bar * 4.4, overflow: "hidden", textOverflow: "ellipsis" }}>{host}</div>}
        </div>
        <div style={{ position: "absolute", left: 0, top: bar, width: vw, height: vh, overflow: "hidden", background: C.ground }}>{children}</div>
      </div>
    </div>
  );
}

/** The recording, placed by the camera. Children are drawn in the take's own CSS-px space. */
export function Stage({ log, cam, v, children }: { log: TakeLog; cam: Cam; v: Viewport; children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: log.width, height: log.height, transformOrigin: "0 0", transform: `translate(${v.vw / 2 - cam.cx * cam.k}px, ${v.vh / 2 - cam.cy * cam.k}px) scale(${cam.k})` }}>{children}</div>
  );
}
export const takeFile = (take: string, file: string) => staticFile(`takes/${take}/${file}`);

/* ── Pointer: vector, drawn in window px so it is sharp at any zoom ──── */
function Pointer({ log, cam, v, spans, frame, u }: { log: TakeLog; cam: Cam; v: Viewport; spans: PlacedSpan[]; frame: number; u: number }) {
  const moments = useMemo(() => pointerMoments(log), [log]);
  const t = frameToTake(spans, frame), p = pointerAt(log, t), s = project(cam, v, p.x, p.y);
  const presence = pointerPresence(log, moments, t);
  const h = Math.max(22 * cam.k, 31 * u), sc = h / 20.6;       // 22 CSS px tall at 1x; never smaller than ~31 px on the canvas
  let press = 0; const ripples: React.ReactNode[] = [];
  log.clicks.forEach((c, i) => {
    const fc = takeToFrame(spans, c.t); if (fc === null) return;
    const d = frame - fc;
    if (d > -3 && d < 9) press = Math.max(press, d < 0 ? clamp01((d + 3) / 3) : d < 3 ? 1 : 1 - clamp01((d - 3) / 6));
    if (d >= 0 && d <= 14) {
      const q = project(cam, v, c.x, c.y), e = EASE(d / 14), r = 38 * (h / 22) * 0.72 * e;
      ripples.push(<div key={i} style={{ position: "absolute", left: q.x - r, top: q.y - r, width: r * 2, height: r * 2, borderRadius: r, boxShadow: `inset 0 0 0 ${Math.max(1.5, 2 * u)}px rgba(36,87,206,${0.7 * (1 - e)})`, background: `rgba(36,87,206,${0.14 * (1 - e)})` }} />);
    }
  });
  if (presence <= 0 && !ripples.length) return null;
  return (
    <>
      {ripples}
      <svg width={18 * sc} height={26 * sc} viewBox="-2 -2 18 26" style={{ position: "absolute", left: s.x - 2 * sc, top: s.y - 2 * sc, opacity: presence, transformOrigin: `${2 * sc}px ${2 * sc}px`, transform: `scale(${1 - 0.14 * EASE(press)})`, filter: `drop-shadow(0 ${1.2 * sc}px ${1.6 * sc}px rgba(7,22,48,.32))`, overflow: "visible" }}>
        <path d="M0 0 L0 17.6 L4.5 13.7 L7.5 20.6 L10.3 19.4 L7.4 12.7 L13.2 12.7 Z" fill="#0b0f17" stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </>
  );
}

/* ── Callouts ───────────────────────────────────────────────────────── */
function CalloutLayer({ c, log, cam, v, spans, frame, u, V }: { c: Callout; log: TakeLog; cam: Cam; v: Viewport; spans: PlacedSpan[]; frame: number; u: number; V: boolean }) {
  const a = takeToFrameNear(spans, c.from), b = takeToFrameNear(spans, c.to);
  if (frame < a || frame > b) return null;
  const o = Math.min(rise(frame, a, 7), 1 - rise(frame, b - 6, 6));           // 220 ms in, 200 ms out
  const box = anchorBox(c.anchor, log, c.from), isPoint = box.w === 0 && box.h === 0, pad = isPoint ? 0 : c.pad ?? 6;
  const tl = project(cam, v, box.x - pad, box.y - pad), br = project(cam, v, box.x + box.w + pad, box.y + box.h + pad);
  const r = { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y }, rad = Math.min(12 * u, Math.max(6 * u, 8 * cam.k));
  const stroke = Math.max(2, 2 * u), grow = (1 - o) * 6 * u;
  const spot = c.variant === "spotlight";
  /* label geometry: sized by estimate, only so it can be kept inside the window */
  const fs = (V ? 27 : 21) * u, px = fs * 0.72, py = fs * 0.42, lead = (V ? 30 : 24) * u, m = 14 * u;
  const lw = c.text ? c.text.length * fs * 0.555 + px * 2 : 0, lh = fs * 1.25 + py * 2;
  let side = c.side ?? "top";
  if (side === "top" && r.y - lead - lh < m) side = "bottom"; else if (side === "bottom" && r.y + r.h + lead + lh > v.vh - m) side = "top";
  else if (side === "left" && r.x - lead - lw < m) side = "right"; else if (side === "right" && r.x + r.w + lead + lw > v.vw - m) side = "left";
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const from = side === "top" ? { x: cx, y: r.y } : side === "bottom" ? { x: cx, y: r.y + r.h } : side === "left" ? { x: r.x, y: cy } : { x: r.x + r.w, y: cy };
  const lx = side === "left" ? r.x - lead - lw : side === "right" ? r.x + r.w + lead : cx - lw / 2;
  const ly = side === "top" ? r.y - lead - lh : side === "bottom" ? r.y + r.h + lead : cy - lh / 2;
  const L = { x: Math.min(Math.max(lx, m), Math.max(m, v.vw - lw - m)), y: Math.min(Math.max(ly, m), Math.max(m, v.vh - lh - m)) };
  const to = side === "top" ? { x: Math.min(Math.max(from.x, L.x + px), L.x + lw - px), y: L.y + lh } : side === "bottom" ? { x: Math.min(Math.max(from.x, L.x + px), L.x + lw - px), y: L.y } : side === "left" ? { x: L.x + lw, y: Math.min(Math.max(from.y, L.y + py), L.y + lh - py) } : { x: L.x, y: Math.min(Math.max(from.y, L.y + py), L.y + lh - py) };
  const slide = (1 - o) * 8 * u, dx = side === "left" ? slide : side === "right" ? -slide : 0, dy = side === "top" ? slide : side === "bottom" ? -slide : 0;
  return (
    <>
      {spot && (
        <svg width={v.vw} height={v.vh} style={{ position: "absolute", left: 0, top: 0, opacity: o }}>
          <path fillRule="evenodd" fill="rgba(7,22,48,.35)" d={`M0 0H${v.vw}V${v.vh}H0Z M${r.x + rad} ${r.y}H${r.x + r.w - rad}A${rad} ${rad} 0 0 1 ${r.x + r.w} ${r.y + rad}V${r.y + r.h - rad}A${rad} ${rad} 0 0 1 ${r.x + r.w - rad} ${r.y + r.h}H${r.x + rad}A${rad} ${rad} 0 0 1 ${r.x} ${r.y + r.h - rad}V${r.y + rad}A${rad} ${rad} 0 0 1 ${r.x + rad} ${r.y}Z`} />
        </svg>
      )}
      {!isPoint && <div style={{ position: "absolute", left: r.x - grow, top: r.y - grow, width: r.w + grow * 2, height: r.h + grow * 2, borderRadius: rad + grow, boxShadow: `inset 0 0 0 ${stroke}px rgba(36,87,206,${spot ? 0.45 : 0.6})`, background: spot ? "transparent" : "rgba(36,87,206,.06)", opacity: o }} />}
      {isPoint && <div style={{ position: "absolute", left: r.x - 5 * u, top: r.y - 5 * u, width: 10 * u, height: 10 * u, borderRadius: 99, background: C.blue, boxShadow: `0 0 0 ${4 * u}px rgba(36,87,206,.18)`, opacity: o }} />}
      {c.text && (
        <>
          <svg width={v.vw} height={v.vh} style={{ position: "absolute", left: 0, top: 0, opacity: o, overflow: "visible" }}>
            <line x1={from.x} y1={from.y} x2={to.x + dx} y2={to.y + dy} stroke="rgba(36,87,206,.6)" strokeWidth={Math.max(1.5, 1.5 * u)} />
          </svg>
          <div style={{ position: "absolute", left: L.x + dx, top: L.y + dy, height: lh, padding: `0 ${px}px`, display: "flex", alignItems: "center", borderRadius: lh * 0.32, background: C.ink, color: "#fff", fontFamily: INTER, fontWeight: 600, fontSize: fs, letterSpacing: "-0.012em", whiteSpace: "nowrap", opacity: o }}>{c.text}</div>
        </>
      )}
    </>
  );
}

/* ── Layout of a screen segment in each aspect ratio ────────────────── */
export function screenLayout(width: number, height: number, log: TakeLog, roomy: boolean): { rect: WindowRect; band: { top: number; bottom: number }; head: { top: number; bottom: number } } {
  const V = height > width, u = Math.min(width, height) / 1080;
  if (!V) {
    const bar = 44 * u, top = (roomy ? 50 : 62) * u;
    let vw = width * (roomy ? 0.7 : 0.76), vh = (vw * log.height) / log.width;
    const maxH = height * (roomy ? 0.7 : 0.762); if (vh > maxH) { vh = maxH; vw = (vh * log.width) / log.height; }
    const rect = { x: (width - vw) / 2, y: top, vw, vh, bar, radius: 16 * u };
    return { rect, band: { top: top + bar + vh, bottom: height * 0.95 }, head: { top: 0, bottom: 0 } };
  }
  /* Vertical: the window takes the middle 58% of the height, sitting a little high so the lines under it clear the
     part of the frame that Reels and Shorts cover with their own interface. */
  const bar = 56 * u, total = height * 0.58, top = height * 0.172, x = 48 * u;
  const rect = { x, y: top, vw: width - x * 2, vh: total - bar, bar, radius: 18 * u };
  return { rect, band: { top: top + total, bottom: height * 0.95 }, head: { top: height * 0.05, bottom: top } };
}

/** Conversation subtitles → cues on this segment's frames. Voice is never sped up, so a line lasts as long as its audio. */
export function subtitleCues(seg: ScreenSegment, log: TakeLog, spans: PlacedSpan[], fps: number, V: boolean): SubtitleCue[] {
  const list: Subtitle[] = seg.subtitles === "auto" ? log.audio.filter((a) => a.text).map((a) => ({ audio: a.file })) : seg.subtitles ?? [];
  const out: SubtitleCue[] = [];
  for (const s of list) {
    const au = s.audio ? log.audio.find((a) => a.file === s.audio || a.file.endsWith("/" + s.audio)) : undefined;
    if (s.audio && !au) console.warn(`Subtitle audio "${s.audio}" is not in log.audio`);
    const text = s.text ?? au?.text; if (!text) continue;
    const from = s.from ?? au?.t; if (from === undefined) continue;
    const full = Array.isArray(text) ? text.join(" ") : text;
    const a = takeToFrameNear(spans, from);
    const b = s.to !== undefined ? takeToFrameNear(spans, s.to) : a + Math.round((au?.duration ?? Math.max(1.6, full.length / 14)) * fps);
    const parts = Array.isArray(text) ? text : chunk(text, V ? 58 : 84);
    const gloss = s.gloss === undefined ? [] : Array.isArray(s.gloss) ? s.gloss : splitLike(s.gloss, parts.map((p) => p.length));
    const speaker = s.speaker ?? (au?.kind === "answer" ? "kaju" : "you");
    const total = parts.reduce((n, p) => n + p.length, 0); let acc = 0;
    parts.forEach((p, i) => { const f0 = a + ((b - a) * acc) / total; acc += p.length; out.push({ a: Math.round(f0), b: Math.round(a + ((b - a) * acc) / total), speaker, text: p, gloss: gloss[i], first: i === 0, last: i === parts.length - 1 }); });
  }
  return out.sort((x, y) => x.a - y.a);
}

/* ── The segment ────────────────────────────────────────────────────── */
export function Screen({ seg, log, spans, host, heading }: { seg: ScreenSegment; log: TakeLog; spans: PlacedSpan[]; host?: string; heading?: string }) {
  const frame = useCurrentFrame();
  const { V, u, width, height, fps } = useLayout();
  const roomy = !!seg.subtitles && (seg.subtitles === "auto" || seg.subtitles.length > 0);
  const { rect, band, head } = useMemo(() => screenLayout(width, height, log, roomy), [width, height, log, roomy]);
  const v: Viewport = useMemo(() => ({ vw: rect.vw, vh: rect.vh, aspect: V ? "vertical" : "landscape" }), [rect, V]);
  const track = useMemo(() => cameraTrack(seg, log, spans, v, fps), [seg, log, spans, v, fps]);
  const subs = useMemo(() => subtitleCues(seg, log, spans, fps, V), [seg, log, spans, fps, V]);
  const cam = track[Math.min(track.length - 1, Math.max(0, frame))];
  const src = takeFile(seg.take, "raw.mp4");
  const caption = (seg.captions ?? []).map((c) => ({ ...c, a: takeToFrameNear(spans, c.from), b: takeToFrameNear(spans, c.to) })).find((c) => frame >= c.a && frame <= c.b);
  const sub = subs.find((s) => frame >= s.a && frame < s.b + (s.last ? 6 : 0));
  return (
    <AbsoluteFill>
      <Backdrop />
      {V && heading && (
        <div style={{ position: "absolute", left: width * 0.07, right: width * 0.07, top: head.top, height: head.bottom - head.top - 44 * u, display: "flex", alignItems: "flex-end", justifyContent: "center", textAlign: "center", fontFamily: INTER, fontWeight: 600, fontSize: 54 * u, lineHeight: 1.08, letterSpacing: "-0.03em", color: C.ink, opacity: rise(frame, 2, 8), transform: `translateY(${(1 - rise(frame, 2, 8)) * 14 * u}px)` }}>
          <span style={{ whiteSpace: "pre-line" }}>{heading}</span>
        </div>
      )}
      <Window rect={rect} host={seg.host ?? host} u={u}>
        <Stage log={log} cam={cam} v={v}>
          {spans.map((s, i) => (
            <Sequence key={i} from={s.f0} durationInFrames={s.f1 - s.f0} layout="none">
              <OffthreadVideo src={src} trimBefore={s.trim} playbackRate={s.speed} muted style={{ position: "absolute", left: 0, top: 0, width: log.width, height: log.height, display: "block" }} />
            </Sequence>
          ))}
        </Stage>
        {(seg.callouts ?? []).map((c, i) => <CalloutLayer key={i} c={c} log={log} cam={cam} v={v} spans={spans} frame={frame} u={u} V={V} />)}
        {seg.pointer !== false && <Pointer log={log} cam={cam} v={v} spans={spans} frame={frame} u={u} />}
      </Window>
      <CaptionBand band={band} caption={sub ? undefined : caption} subtitle={sub} frame={frame} />
    </AbsoluteFill>
  );
}
