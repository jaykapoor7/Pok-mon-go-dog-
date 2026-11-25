import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_IN_OUT, clamp01 } from "./theme";
import { buildTimeline, takeToFrame, takeToFrameNear, typingCues, type Cue, type Placed } from "./lib";
import type { Edit, FilmProps, Mix, TakeLog } from "./types";
import { Screen, takeFile } from "./Screen";
import { End, Title } from "./Cards";

export const STOCK_MUSIC = [40, 50, 60];
const MIX: Required<Mix> = { music: 0.5, screenDuck: 3, voiceDuck: 8, voice: 0.85, sfx: 1 };

/** A segment, with the way it arrives and the way it gives way to the next. Quick, eased, nothing flashy. */
function Slot({ item, children }: { item: Placed; children: React.ReactNode }) {
  const f = useCurrentFrame();
  const style: React.CSSProperties = {};
  if (item.tin && f < item.tin) {
    const p = EASE_IN_OUT(clamp01((f + 1) / (item.tin + 1)));
    if (item.tinKind === "zoom") { style.opacity = p; style.transform = `scale(${0.955 + 0.045 * p})`; }
    else { style.clipPath = `inset(0 0 0 ${(1 - p) * 100}%)`; style.transform = `translateX(${(1 - p) * 28}px)`; }
  } else if (item.tout && f >= item.dur - item.tout) {
    const q = EASE_IN_OUT(clamp01((f - (item.dur - item.tout) + 1) / (item.tout + 1)));
    style.transform = item.toutKind === "zoom" ? `scale(${1 + 0.045 * q})` : `translateX(${-28 * q}px)`;
  }
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
}

/** Every sound in the film, placed from the logs: voice at its logged moment, clicks, typing, transitions, callouts. */
function soundPlan(edit: Edit, items: Placed[], logs: Record<string, TakeLog>, fps: number, total: number) {
  const sfx: Cue[] = [], voice: (Cue & { end: number })[] = [], screens: [number, number][] = [];
  for (const it of items) {
    if (it.tin) sfx.push({ frame: Math.max(0, it.start - 3), file: "sfx/whoosh.wav", volume: 0.3 });
    if (it.seg.kind !== "screen") continue;
    const seg = it.seg, log = logs[seg.take]; if (!log) continue;
    screens.push([it.start, it.start + it.dur]);
    for (const c of log.clicks) { const f = takeToFrame(it.spans, c.t, fps); if (f !== null) sfx.push({ frame: it.start + Math.round(f), file: "sfx/click.wav", volume: 0.55 }); }
    for (const k of typingCues(seg, log, it.spans, `${edit.slug}-${it.index}`, fps)) sfx.push({ ...k, frame: it.start + k.frame });
    for (const c of seg.callouts ?? []) if (c.sfx !== false && takeToFrame(it.spans, c.from, fps) !== null) sfx.push({ frame: it.start + Math.round(takeToFrameNear(it.spans, c.from, fps)), file: "sfx/pop.wav", volume: 0.3 });
    for (const c of seg.chimes ?? []) { const t = typeof c === "number" ? c : log.marks.find((m) => m.name === c.mark)?.t; const f = t === undefined ? null : takeToFrame(it.spans, t, fps); if (f !== null) sfx.push({ frame: it.start + Math.round(f), file: "sfx/chime.wav", volume: 0.4 }); }
    for (const a of log.audio) {
      const dur = a.duration ?? 4; let f = takeToFrame(it.spans, a.t, fps), trim = 0;
      if (f === null) {                                   // it began in a part that was cut: join it where the picture rejoins
        const s = it.spans.find((x) => x.from > a.t && x.from < a.t + dur); if (!s) continue;
        f = s.f0; trim = Math.round((s.from - a.t) * fps);
      }
      const frame = it.start + Math.round(f), frames = Math.max(1, Math.min(Math.round(dur * fps) - trim, total - frame));
      voice.push({ frame, file: `takes/${seg.take}/${a.file}`, volume: 1, trim, frames, end: frame + frames });
    }
  }
  return { sfx, voice, screens };
}


const trapezoid = (f: number, a: number, b: number, r: number) => clamp01(Math.min((f - (a - r)) / r, (b + r - f) / r));

export function Film({ edit, logs = {} }: FilmProps) {
  const { fps, durationInFrames } = useVideoConfig();
  const { items } = useMemo(() => buildTimeline(edit, logs, fps), [edit, logs, fps]);
  const plan = useMemo(() => soundPlan(edit, items, logs, fps, durationInFrames), [edit, items, logs, fps, durationInFrames]);
  const mix = { ...MIX, ...edit.mix };
  /* Music: pick the bed, and start far enough into it that its composed ending lands on the last frame. */
  const seconds = durationInFrames / fps;
  const music = edit.music === false ? null : typeof edit.music === "object" ? edit.music : { length: STOCK_MUSIC.find((l) => l >= seconds) ?? STOCK_MUSIC[STOCK_MUSIC.length - 1] };
  const musicTrim = music ? Math.max(0, Math.round((music.length - seconds) * fps)) : 0;
  const ramp = Math.round(0.2 * fps);
  const musicVolume = (f: number) => {
    let duck = 0;
    for (const [a, b] of plan.screens) duck = Math.max(duck, mix.screenDuck * trapezoid(f, a, b, ramp * 1.5));
    for (const v of plan.voice) duck = Math.max(duck, mix.voiceDuck * trapezoid(f, v.frame, v.end, ramp));     // down before the first word, back up after the last
    const fadeIn = musicTrim > 0 ? clamp01((f + 1) / 18) : 1;
    return mix.music * fadeIn * 10 ** (-duck / 20);
  };
  return (
    <AbsoluteFill style={{ background: "#f5f7fb" }}>
      {items.map((it) => {
        const seg = it.seg;
        return (
          <Sequence key={it.index} from={it.start} durationInFrames={it.dur} name={`${it.index + 1} · ${seg.kind}`}>
            <Slot item={it}>
              {seg.kind === "title" ? <Title seg={seg} /> : seg.kind === "end" ? <End seg={seg} /> : logs[seg.take] ? <Screen seg={seg} log={logs[seg.take]} spans={it.spans} host={edit.host} heading={seg.heading ?? edit.title} /> : <Missing take={seg.take} />}
            </Slot>
          </Sequence>
        );
      })}
      {music && <Audio src={staticFile(music.file ?? `music/kaju-${music.length}s.wav`)} trimBefore={musicTrim} volume={musicVolume} />}
      {plan.voice.map((v, i) => <Sequence key={`v${i}`} from={v.frame} durationInFrames={v.frames} layout="none" name={`voice · ${v.file.split("/").pop()}`}><Audio src={staticFile(v.file)} trimBefore={v.trim} volume={mix.voice} /></Sequence>)}
      {plan.sfx.map((c, i) => <Sequence key={`s${i}`} from={c.frame} durationInFrames={Math.round(fps * 1.5)} layout="none" name={c.file}><Audio src={staticFile(c.file)} volume={c.volume * mix.sfx} /></Sequence>)}
    </AbsoluteFill>
  );
}

function Missing({ take }: { take: string }) {
  return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 30, color: "#0b1e3d" }}>Take "{take}" is not in public/takes. Run: npm run prepare:takes</AbsoluteFill>;
}

