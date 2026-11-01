"use client";

import { useId } from "react";
import { getImageProps } from "next/image";
import { POSES, type KajuState } from "./poses";
import "./kaju.css";

/** Reference-based Explorer artwork. The existing rig is retained in Rig.tsx;
 * controller, events, sequences and accessible placements keep the same API.
 * Six illustrated key poses do not constitute a frame-by-frame walk cycle. */
const ART = getImageProps({ src: "/kaju/explorer-atlas.png", alt: "", width: 512, height: 341, quality: 85 }).props.src;
const CELLS: Record<KajuState, [number, number]> = {
  sitting: [0, 0], standing: [0, 1], walking: [0, 1], trotting: [0, 1],
  lying: [2, 0], sleeping: [2, 0], waking: [2, 0], stretching: [0, 1],
  peeking: [1, 0], looking: [0, 0], headTilt: [1, 1], earTwitch: [0, 0], tailWag: [0, 0], settling: [2, 0],
  greeting: [2, 1], listening: [0, 0], thinking: [1, 1], explaining: [0, 0],
  success: [2, 1], insight: [1, 1], concerned: [1, 1], error: [1, 1], goodbye: [2, 1],
};

type Props = { state?: KajuState; size?: number | string; label?: string; still?: boolean; flip?: boolean; className?: string };

export function Kaju({ state = "sitting", size = 120, label, still = false, flip = false, className = "" }: Props) {
  const clip = `explorer-${useId().replace(/:/g, "")}`;
  const pose = POSES[state] ?? POSES.sitting;
  const [col, row] = CELLS[state] ?? CELLS.sitting;
  // The lower seated poses extend above the nominal row boundary.
  const y = row === 1 && col > 0 ? 480 : row * 512;
  const height = row === 1 && col > 0 ? 544 : 512;
  const clipHeight = row === 0 && col > 0 ? 480 : height;
  return (
    <svg className={`kaju kaju-explorer is-${state}${still ? " is-still" : ""}${flip ? " is-flip" : ""} ${className}`}
      viewBox="0 0 240 200" width={size} height={typeof size === "number" ? size * 200 / 240 : undefined}
      role={label ? "img" : undefined} aria-label={label ? `${label} (${pose.label})` : undefined}
      aria-hidden={label ? undefined : true} focusable="false" data-kaju-state={state} data-kaju-art="explorer">
      <g className="kj-flip"><g className="kj-explorer-breathe">
        <svg x="0" y="0" width="240" height="200" viewBox={`${col * 512} ${y} 512 ${height}`} preserveAspectRatio="xMidYMax meet" overflow="hidden">
          <defs><clipPath id={clip}><rect x={col * 512} y={y} width="512" height={clipHeight} /></clipPath></defs>
          <image href={ART} x="0" y="0" width="1536" height="1024" clipPath={`url(#${clip})`} />
        </svg>
      </g></g>
    </svg>
  );
}

/** Shared face crop from the peeking pose; no separate character artwork. */
export function KajuFace({ size = 20, className = "" }: { size?: number; className?: string }) {
  return <svg className={`kaju-face ${className}`} viewBox="560 88 400 340" width={size} height={size} aria-hidden focusable="false"><image href={ART} width="1536" height="1024" /></svg>;
}
