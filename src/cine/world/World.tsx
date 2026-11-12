"use client";

/* ════════════════════════════════════════════════════════════════════
   <World>: the hillside, alive. One WebGL 2 canvas that fills its parent.

   The camera drifts slowly, as a camera does on a still day. A story
   drives it with `progress` (0 → 1): the camera rises and turns the
   hillside into a map. Points on the ground (markers) are projected to
   the screen every frame and handed to `onProject`, so the page can place
   real, focusable buttons over them.

   It sleeps when it is off screen or the tab is hidden, holds still for
   people who prefer reduced motion, and says so when WebGL 2 is missing,
   so the page can show its still picture instead.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, type MutableRefObject } from "react";
import { FRAG, VERT, buildMesh, heightAt, lookAt, mul, perspective, project, type V3 } from "./terrain";

export type Marker = { id: string; x: number; z: number; lift?: number };
export type Projected = { id: string; x: number; y: number; vis: boolean };
export type View = "home" | "kaju";

type Shot = { eye: V3; at: V3; map: number; fog: number; drift: number };
const SHOTS: Record<View, [Shot, Shot]> = {
  /* The hill seen from its foot, the sky above it; then the same ground from above, as a map. */
  home: [
    { eye: [0, 3.0, 15], at: [2, 9.4, -12], map: 0, fog: 0.017, drift: 1 },
    { eye: [3, 38, 12], at: [2, 0, -15], map: 1, fog: 0.005, drift: 0.25 },
  ],
  /* The same world from its western ridge, with the map's lines showing through the grass. */
  kaju: [
    { eye: [-26, 13, 2], at: [4, 10.5, -16], map: 0.32, fog: 0.012, drift: 0.7 },
    { eye: [-20, 22, 0], at: [3, 6, -16], map: 0.6, fog: 0.008, drift: 0.4 },
  ],
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const SKY: V3 = [0.965, 0.975, 0.995];

export function World({ progress, markers = [], onProject, onReady, view = "home", className }: {
  progress?: MutableRefObject<number>; markers?: Marker[]; onProject?: (pts: Projected[], w: number, h: number) => void;
  onReady?: (ok: boolean) => void; view?: View; className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef(onProject); cb.current = onProject;
  const ready = useRef(onReady); ready.current = onReady;
  const list = useRef(markers); list.current = markers;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    const maybe = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!maybe) { ready.current?.(false); return; }
    const gl: WebGL2RenderingContext = maybe;
    el.appendChild(canvas);

    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader"); return s; };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
    } catch { canvas.remove(); ready.current?.(false); return; }

    const mesh = buildMesh(window.innerWidth < 700 ? 120 : 170, window.innerWidth < 700 ? 92 : 130);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = (data: Float32Array, loc: number) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0); };
    buf(mesh.pos, gl.getAttribLocation(prog, "aPos")); buf(mesh.nor, gl.getAttribLocation(prog, "aNor"));
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
    const U = { vp: gl.getUniformLocation(prog, "uVP"), cam: gl.getUniformLocation(prog, "uCam"), sky: gl.getUniformLocation(prog, "uSky"), map: gl.getUniformLocation(prog, "uMap"), fog: gl.getUniformLocation(prog, "uFog") };
    gl.useProgram(prog); gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.uniform3fv(U.sky, SKY);
    gl.clearColor(SKY[0], SKY[1], SKY[2], 1);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 1, h = 1, raf = 0, visible = true, smooth = progress?.current ?? 0;
    /* resolution: at most 1.5× on large screens and 1.25× on phones, lowered once if the first frames are slow */
    let scale = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.5);
    const size = () => { w = el.clientWidth; h = el.clientHeight; canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale)); gl.viewport(0, 0, canvas.width, canvas.height); };
    size();
    const ro = new ResizeObserver(size); ro.observe(el);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && e.intersectionRatio > 0; if (visible && !raf) raf = requestAnimationFrame(frame); }, { threshold: [0, 0.01] });
    let probe = 0, probeT = 0;
    io.observe(el);
    const t0 = performance.now();
    const [A, B] = SHOTS[view];
    let shown = false;

    function frame(now: number) {
      raf = 0;
      if (!visible || document.hidden) return;
      /* slow first frames: lower the resolution once, here, before drawing, so the cleared canvas is never shown */
      if (!still && probe < 40) {
        if (probe === 10) probeT = now;
        if (++probe === 40 && (now - probeT) / 30 > 34 && scale > 0.8) { scale = Math.max(0.8, scale * 0.66); size(); }
      }
      const target = progress?.current ?? 0;
      smooth += (target - smooth) * (still ? 1 : 0.075);
      const p = ease(Math.min(1, Math.max(0, smooth)));
      const t = still ? 0 : (now - t0) / 1000;
      const drift = lerp(A.drift, B.drift, p);
      const at: V3 = [lerp(A.at[0], B.at[0], p), lerp(A.at[1], B.at[1], p), lerp(A.at[2], B.at[2], p)];
      let eye: V3 = [lerp(A.eye[0], B.eye[0], p), lerp(A.eye[1], B.eye[1], p), lerp(A.eye[2], B.eye[2], p)];
      /* the drift: a slow turn about the point being looked at, and a breath of height */
      const yaw = (0.17 * Math.sin(t * 0.028) + 0.04 * Math.sin(t * 0.071)) * drift;
      const dx = eye[0] - at[0], dz = eye[2] - at[2];
      eye = [at[0] + dx * Math.cos(yaw) - dz * Math.sin(yaw), eye[1] + 0.25 * Math.sin(t * 0.05) * drift, at[2] + dx * Math.sin(yaw) + dz * Math.cos(yaw)];
      const vp = mul(perspective((38 * Math.PI) / 180, w / h, 0.1, 400), lookAt(eye, at));
      gl.uniformMatrix4fv(U.vp, false, vp);
      gl.uniform3fv(U.cam, eye);
      gl.uniform1f(U.map, lerp(A.map, B.map, Math.min(1, Math.max(0, (p - 0.3) / 0.55))));
      gl.uniform1f(U.fog, lerp(A.fog, B.fog, p));
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_INT, 0);
      if (cb.current) cb.current(list.current.map((m) => ({ id: m.id, ...project(vp, [m.x, heightAt(m.x, m.z) + (m.lift ?? 0.3), m.z], w, h) })), w, h);
      if (!shown) { shown = true; ready.current?.(true); }
      if (!still || Math.abs(target - smooth) > 0.001) raf = requestAnimationFrame(frame);
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("scroll", wake, { passive: true });
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", wake); window.removeEventListener("scroll", wake);
      gl.getExtension("WEBGL_lose_context")?.loseContext(); canvas.remove();
    };
  }, [view, progress]);

  return <div ref={host} className={className} style={{ position: "absolute", inset: 0, overflow: "hidden" }} />;
}
