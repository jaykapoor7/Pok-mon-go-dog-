import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import { C, INTER } from "./theme";
import { resolveTarget, FPS, type Viewport } from "./lib";
import type { FilmProps } from "./types";
import { Backdrop, Stage, Window, takeFile, type WindowRect } from "./Screen";
import { KajuRig } from "./kaju/KajuRig";

/** Thumbnail: a real frame of a take in the window, a large headline, Kaju sitting on the window, the StrayPaw mark. */
export function Thumb({ edit, logs = {} }: FilmProps) {
  const { width, height } = useVideoConfig();
  const th = edit.thumb!, log = logs[th.take];
  const tall = height > width, u = Math.min(width, height) / 1080, m = (tall ? 76 : 104) * u;
  const bar = (tall ? 50 : 46) * u;
  /* The window runs off the right (and, in 4:5, the bottom) edge; its viewport is only the part that is on the canvas. */
  const rect: WindowRect = tall
    ? { x: m, y: height * 0.5, vw: width - m + 40 * u, vh: height * 0.5 - bar + 40 * u, bar, radius: 18 * u }
    : { x: width * 0.47, y: height * 0.235, vw: width * 0.53 + 40 * u, vh: height * 0.765 - bar - m * 0.78, bar, radius: 18 * u };
  const seen = { vw: Math.min(rect.vw, width - rect.x), vh: Math.min(rect.vh, height - rect.y - bar) };
  const v: Viewport = { ...seen, aspect: "landscape" };
  const lines = th.headline.split("\n"), longest = Math.max(...lines.map((l) => l.length));
  const textW = tall ? width - m * 2 : rect.x - m - 50 * u;
  const size = Math.min((tall ? 118 : 124) * u, textW / (longest * 0.535));
  const ks = (tall ? 250 : 230) * u, lock = (tall ? 46 : 48) * u;
  let cam = { k: 1, cx: 0, cy: 0 };
  if (log) { const t = resolveTarget(tall && th.v ? { ...th, ...th.v } : th, log, v, th.t); const k = Math.max(v.vw / log.width, v.vh / log.height) * t.z, hw = v.vw / k / 2, hh = v.vh / k / 2; cam = { k, cx: Math.min(Math.max(t.cx, hw), log.width - hw), cy: Math.min(Math.max(t.cy, hh), log.height - hh) }; }
  return (
    <AbsoluteFill>
      <Backdrop />
      <div style={{ position: "absolute", left: m, top: m * (tall ? 0.9 : 0.78), display: "flex", alignItems: "center", gap: 14 * u, fontFamily: INTER, fontWeight: 600, fontSize: lock * 0.6, letterSpacing: "-0.015em", color: C.ink }}>
        <Img src={staticFile("straypaw-mark.png")} style={{ width: lock, height: lock, borderRadius: lock * 0.24 }} />StrayPaw
      </div>
      <div style={{ position: "absolute", left: m, width: textW, ...(tall ? { top: m * 0.9 + lock + 54 * u } : { top: rect.y, bottom: m * 0.78, display: "flex", flexDirection: "column", justifyContent: "center" }) }}>
        {th.eyebrow && <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: (tall ? 30 : 28) * u, letterSpacing: "0.02em", color: C.blue, marginBottom: size * 0.26 }}>{th.eyebrow}</div>}
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: size, lineHeight: 1.03, letterSpacing: "-0.038em", color: C.ink, whiteSpace: "pre-line" }}>{th.headline}</div>
      </div>
      <Window rect={rect} host={edit.host} u={u}>
        {log && (
          <Stage log={log} cam={cam} v={v}>
            <OffthreadVideo src={takeFile(th.take, "raw.mp4")} trimBefore={Math.round(th.t * FPS)} muted style={{ position: "absolute", left: 0, top: 0, width: log.width, height: log.height }} />
          </Stage>
        )}
      </Window>
      {th.kaju !== undefined && (
        <div style={{ position: "absolute", left: tall ? width - ks - m * 0.9 : rect.x + 70 * u, top: rect.y - ks * (190 / 240) + 2 * u }}>
          <KajuRig state={th.kaju} t={1.1} size={ks} shadow={false} flip={tall} />
        </div>
      )}
    </AbsoluteFill>
  );
}
