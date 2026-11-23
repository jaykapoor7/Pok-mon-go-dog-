"use client";

/* ════════════════════════════════════════════════════════════════════
   The passage through the product, in the middle of the hero.

   The hero's blueprint card (the scripted product demo, with Kaju on
   top of it) is where it always was. As the page scrolls on, the card
   holds still and four things happen in turn:

     hold    nothing moves; the scripted demo plays and can be paused;
     enter   the window grows until it is the whole screen. What moves
             says where it came from: the plan of the ward comes nearer
             (three depths, the near one fastest); Kaju leaves his perch
             on the window and lands in his seat inside the product; the
             demo's ask field travels to become the real composer; and
             the product's own parts arrive in reading order;
     inside  nothing moves. The visitor is in the product, asking Kaju
             about a sample programme;
     exit    the interface draws back into a framed window, the plan
             pulls away, Kaju comes back out to sit on the window, the
             card closes round them, the page's header returns, and a
             line of type rises word by word to hand over to the page.

   Scrolling drives all of it and is never held: the page always moves
   with the wheel, a finger or the keyboard. What is drawn follows the
   scroll through a short settle (about a tenth of a second), so a wheel
   notch or a flick reads as one movement, not a step. "Ask Kaju
   yourself" and a click on the window go straight in; "Step out" and
   Escape go straight out; the conversation is kept, and "Back to Kaju"
   returns to it from anywhere further down.

   Only transform, opacity and clip-path are written, once per frame,
   straight onto the elements that move; nothing is laid out again and
   nothing is written at rest. This is hand-written on purpose: the
   homepage ships no animation library, and a scroll-scrubbed timeline
   with FLIP-style shared elements is about two hundred lines here.

   With reduced motion there is no pinning and nothing moves: the card
   is the hero as it was, and Kaju sits under it as an ordinary section.
   Without JavaScript the hero is exactly the earlier one.
   ════════════════════════════════════════════════════════════════════ */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";
import { KajuPresence } from "@/kaju/Presence";
import type { KajuState } from "@/kaju/poses";
import { Blueprint } from "../Blueprint";
import { HeroDemo } from "../HeroDemo";
import { HeroPerch } from "../HeroPerch";
import type { LiveProps } from "./KajuLive";
import "./passage.css";

const Live = dynamic<LiveProps>(() => import("./KajuLive"), { ssr: false, loading: () => <Opening /> });

type Phase = "hero" | "enter" | "inside" | "exit" | "out" | "past";
type Box = { x: number; y: number; w: number; h: number };
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** A stretch of a longer run, as its own 0 to 1. */
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
/* The house curves (docs/MOTION.md): travel for anything that leaves as well as arrives, settle for arriving. */
const travel = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const settle = (t: number) => 1 - Math.pow(1 - t, 4);
/** How far each stretch of the passage runs, in screen heights: holding still on arrival (the scripted demo plays and
    its controls stay put), growing in, staying inside, drawing back. */
/* The still stretch is long enough that bringing any of the demo's controls to the middle of the screen (a keyboard's
   focus, a screen reader, a test) lands inside it, where nothing is moving under the pointer. */
const RUN = { wide: [0.42, 0.9, 0.6, 1.0], narrow: [0.26, 0.75, 0.5, 0.85] } as const;
/** How long what is drawn takes to catch up with the scroll, in milliseconds. */
const SETTLE_MS = 110;
const HEADLINE = ["Now", "meet", "the", "teams", "it", "works", "with."];
const KAJU = 112;

function Opening() {
  return <div className="kx-opening" role="status"><span className="kx-opening-side" aria-hidden /><span className="kx-opening-main"><KajuFace size={28} /><span>Opening Kaju…</span></span></div>;
}

/** An element's place inside an ancestor, from layout alone (transforms and animations do not move it). */
function placeIn(el: HTMLElement, root: HTMLElement): Box {
  let x = 0, y = 0, n: HTMLElement | null = el;
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
const show = (el: HTMLElement | null | undefined, o: number, t = "") => { if (!el) return; el.style.opacity = o >= 1 ? "" : o.toFixed(3); el.style.transform = o >= 1 ? "" : t; };

export function KajuPassage() {
  const track = useRef<HTMLDivElement>(null), pin = useRef<HTMLDivElement>(null), clip = useRef<HTMLDivElement>(null), card = useRef<HTMLDivElement>(null);
  const app = useRef<HTMLDivElement>(null), tilt = useRef<HTMLDivElement>(null), outro = useRef<HTMLDivElement>(null), glow = useRef<HTMLDivElement>(null), field = useRef<HTMLDivElement>(null);
  const ask = useRef<HTMLDivElement>(null), kaju = useRef<HTMLDivElement>(null), fig = useRef<HTMLParagraphElement>(null), shade = useRef<HTMLSpanElement>(null);
  /* The scripted demo rests once the product has covered it. */
  const [covered, setCovered] = useState(false);
  const coveredRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("hero");
  const [mode, setMode] = useState<"off" | "motion" | "still">("off");
  const [want, setWant] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const [talk, setTalk] = useState({ turns: 0, busy: false, answered: false });
  const [news, setNews] = useState(false);
  /* Kaju between his perch and his seat: what he is doing, and which way he faces. */
  const [act, setAct] = useState<{ pose: KajuState | "perch"; flip: boolean }>({ pose: "sitting", flip: false });
  const [glad, setGlad] = useState(false);
  const geo = useRef({ start: 0, vh: 1, e: 1, p: 1, x: 1 });
  const phaseRef = useRef<Phase>("hero"), actRef = useRef("sitting:0");
  const pendingFocus = useRef(false), pendingOut = useRef(false), back = useRef<HTMLButtonElement>(null);
  /* Asks the passage to read the product's layout again (it has loaded, or its conversation changed) and repaint. */
  const refresh = useRef<() => void>(() => {});
  /* When the page last moved. A click on the demo window means "go in" only on a page that is standing still: a press
     that lands there while the page is still travelling was aimed at something else. */
  const moved = useRef(0);

  useEffect(() => {
    const el = track.current, sticky = pin.current; if (!el || !sticky) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    let raf = 0, last = 0, cur: number | null = null, running = false;
    let g = { vw: 1, vh: 1, vt: 0, start: 0, hold: 0, e: 1, p: 1, x: 1, wx: 0, wy: 0, s0: 1, cx: 0, cy: 0, cw: 0, ch: 0, head: 72, gut: 16, narrow: false, outH: 0 };
    let phone: HTMLElement | null = null, perch: HTMLElement | null = null;
    /* Shared elements, in the product window's own coordinates (the window at full size): where the ask field and Kaju
       start (their places in the scripted demo) and where they land (their places in the product). */
    let askFrom: Box | null = null, askTo: Box | null = null, pupFrom: Box | null = null, pupTo: Box | null = null, seatSeen = true;
    type Part = { el: HTMLElement; a: number; b: number; x: number; y: number };
    let parts: Part[] = [], seat: HTMLElement | null = null, composer: HTMLElement | null = null;
    let wordEls: HTMLElement[] = [], marks: HTMLElement[] = [], layers: HTMLElement[] = [];

    /** The product's own parts, once its code has arrived: what arrives when, in reading order. */
    const readProduct = () => {
      const A = app.current; if (!A) return;
      const nx = A.querySelector<HTMLElement>(".kx-nx");
      for (const p of parts) { p.el.style.opacity = ""; p.el.style.transform = ""; }
      if (composer) composer.style.opacity = ""; if (seat) seat.style.visibility = "";
      parts = []; seat = null; composer = null; askTo = null; pupTo = null;
      if (!nx) return;
      const body = nx.querySelector<HTMLElement>(".nx-body"), scrolled = body?.scrollTop ?? 0;
      const one = (sel: string, a: number, b: number, x = 0, y = 0) => { const n = nx.querySelector<HTMLElement>(sel); if (n) parts.push({ el: n, a, b, x, y }); };
      one(".nx-rail", 0.3, 0.48, -24, 0); one(".nx-side", 0.32, 0.52, -28, 0); one(".nx-top", 0.34, 0.52, 0, -12);
      one(".kj-hero-t", 0.44, 0.68, 0, 24); one(".kx-starters", 0.66, 0.84, 0, 20); one(".kj-convo", 0.6, 0.86, 0, 28); one(".kj-noticed-h", 0.7, 0.86, 0, 16);
      nx.querySelectorAll<HTMLElement>(".kj-notice").forEach((n, i) => parts.push({ el: n, a: 0.72 + i * 0.045, b: 0.9 + i * 0.03, x: 0, y: 36 }));
      one(".kj-foot", 0.84, 0.98, 0, 12);
      seat = nx.querySelector<HTMLElement>(".kj-hero-pup"); composer = nx.querySelector<HTMLElement>(".kj-compose");
      const box = composer?.querySelector<HTMLElement>(".nx-ask");
      /* A composer held at the foot of the window is already where it will be; one in the page's flow moves with it. */
      if (box && composer) { askTo = placeIn(box, A); if (getComputedStyle(composer).position !== "sticky") askTo.y -= scrolled; }
      if (seat) { pupTo = placeIn(seat, A); pupTo.y -= scrolled; seatSeen = pupTo.y > 40 && pupTo.y < g.vh - 40; }
      const O = ask.current;
      if (O && askTo) { O.style.left = `${askTo.x}px`; O.style.top = `${askTo.y}px`; O.style.width = `${askTo.w}px`; O.style.height = `${askTo.h}px`; }
    };

    const measure = () => {
      const vw = sticky.clientWidth, vh = window.innerHeight;
      const narrow = vw < 760;
      const head = document.querySelector<HTMLElement>(".s4-nav")?.offsetHeight ?? 72;
      el.style.setProperty("--kx-head", `${head}px`);
      el.style.setProperty("--kx-vh", `${vh}px`);
      const [hold, e, p, x] = narrow ? RUN.narrow : RUN.wide;
      el.style.setProperty("--kx-run", `${Math.round((hold + e + p + x) * vh)}px`);
      /* The stage holds just under the header; a card taller than the room there holds with its foot on the screen's foot. */
      const over = Math.max(0, sticky.offsetHeight - (vh - head));
      /* `vt`: where the top of the screen is, measured inside the held stage. */
      const vt = over - head;
      el.style.setProperty("--kx-stick", `${head - over}px`);
      el.style.setProperty("--kx-pinh", `${sticky.offsetHeight}px`);
      el.style.setProperty("--kx-top", `${vt}px`);
      const win = sticky.querySelector<HTMLElement>(".s4d-win"); phone = sticky.querySelector<HTMLElement>(".s4d-phone"); perch = sticky.querySelector<HTMLElement>(".s4-hero-perch");
      const anchor = win && win.offsetWidth > 0 ? win : phone;
      const c = card.current;
      if (!anchor || !c) return;
      const a = placeIn(anchor, sticky), cc = placeIn(c, sticky);
      /* The page's own offset, read without the pin's stuck position: the track is not positioned by scrolling. */
      const top = el.getBoundingClientRect().top + window.scrollY;
      g = { vw, vh, vt, start: top + vt + hold * vh, hold: hold * vh, e: e * vh, p: p * vh, x: x * vh, wx: a.x, wy: a.y - vt, s0: a.w / vw, cx: cc.x, cy: cc.y - vt, cw: cc.w, ch: cc.h, head, gut: cc.x, narrow, outH: outro.current?.offsetHeight ?? 0 };
      geo.current = { start: g.start, vh, e: g.e, p: g.p, x: g.x };
      /* Something in the demo, said in the product window's coordinates: the demo window is the product window at s0. */
      const local = (n: HTMLElement | null): Box | null => { if (!n || !n.offsetWidth) return null; const b = placeIn(n, sticky); return { x: (b.x - a.x) / g.s0, y: (b.y - a.y) / g.s0, w: b.w / g.s0, h: b.h / g.s0 }; };
      askFrom = local(sticky.querySelector<HTMLElement>(anchor === phone ? ".s4d-ph-bar > span:first-child" : ".s4d-ask")) ?? askFrom;
      pupFrom = local(perch) ?? pupFrom;
      /* Where the closed card rests is fixed by the layout, so its shadow and the handover line are placed here, once. */
      const top1 = head + (narrow ? 12 : 16), bottom1 = narrow ? 12 : 20, G = glow.current, O = outro.current;
      if (G) { G.style.left = G.style.right = `${g.gut}px`; G.style.top = `${vt + top1}px`; G.style.height = `${Math.max(0, vh - top1 - bottom1)}px`; }
      if (O) O.style.top = `${top1}px`;
      wordEls = outro.current ? [...outro.current.querySelectorAll<HTMLElement>(".kx-w > span")] : [];
      marks = app.current ? [...app.current.querySelectorAll<HTMLElement>(".kx-mark")] : [];
      layers = field.current ? ([...field.current.children] as HTMLElement[]) : [];
      readProduct();
    };

    /** What Kaju is doing on the way, set only when it changes. */
    const kajuDoes = (pose: KajuState | "perch", flip: boolean) => { const k = `${pose}:${flip ? 1 : 0}`; if (k !== actRef.current) { actRef.current = k; setAct({ pose, flip }); } };

    let painted = NaN;
    const paint = (s: number) => {
      /* Nothing is written twice for the same place (resting inside the product, most of all). */
      if (s === painted) return; painted = s;
      const pe = clamp(s / g.e), px = clamp((s - g.e - g.p) / g.x);
      const A = app.current, T = tilt.current, C = card.current, K = clip.current, O = outro.current, G = glow.current, F = field.current, Q = ask.current, J = kaju.current, L = fig.current, H = shade.current;
      if (!A || !T || !C || !K || !O || !F) return;

      if (s <= 0) {
        /* Before the card holds: it grows a little as it arrives, as the hero always has. */
        const a = g.narrow ? 1 : clamp(1 + (s + g.hold) / Math.max(1, g.start - g.hold));
        const k = 0.955 + 0.045 * a;
        C.style.transform = a < 1 ? `translate3d(${((1 - k) * g.cw / 2).toFixed(2)}px, 0, 0) scale(${k.toFixed(4)})` : "";
        C.style.opacity = ""; C.style.visibility = "";
        K.style.visibility = "hidden"; F.style.visibility = "hidden"; O.style.visibility = "hidden";
        if (Q) Q.style.visibility = "hidden"; if (J) J.style.visibility = "hidden"; if (L) L.style.visibility = "hidden";
        if (phone) phone.style.translate = ""; if (perch) perch.style.visibility = "";
        if (G) G.style.opacity = "0";
        return;
      }
      K.style.visibility = "visible"; F.style.visibility = "visible";
      const e = travel(pe), x = travel(px);
      /* Leaving: once the passage is over the stage scrolls away with the page, and its depths part a little as it goes. */
      const gone = clamp((s - g.e - g.p - g.x) / g.vh);
      /* The window: from the demo window's own place and size to the whole screen, then back to a framed window. */
      const s1 = g.narrow ? Math.min(0.8, (g.vw - 2 * g.gut - 24) / g.vw) : Math.min(0.7, (g.vw - 2 * g.gut - 160) / g.vw);
      const top1 = g.head + (g.narrow ? 12 : 16), bottom1 = g.narrow ? 12 : 20;
      const tx1 = (g.vw - g.vw * s1) / 2, ty1 = top1 + g.outH + (g.narrow ? 64 : 56);
      const sc = px > 0 ? lerp(1, s1, x) : lerp(g.s0, 1, e);
      const tx = px > 0 ? lerp(0, tx1, x) : lerp(g.wx, 0, e);
      const ty = (px > 0 ? lerp(0, ty1, x) : lerp(g.wy, 0, e)) + gone * 44;
      const rest = pe >= 1 && px <= 0;
      A.style.transform = rest ? "none" : `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${sc.toFixed(5)})`;
      /* The demo gives way to a clean sheet, in register with it; the product's parts then arrive on that sheet. */
      A.style.opacity = px > 0 ? "1" : seg(pe, 0.2, 0.34).toFixed(3);
      /* Depth: the window leans back a little while it travels and is flat at rest. */
      const lean = g.narrow ? 0 : px > 0 ? 6 * Math.sin(Math.PI * x) : 3.5 * Math.sin(Math.PI * e);
      T.style.transform = rest || lean < 0.02 ? "none" : `perspective(2200px) rotateX(${lean.toFixed(3)}deg)`;
      const round = rest ? 0 : (px > 0 ? lerp(0, 18, clamp(x * 3)) : lerp(16, 0, seg(e, 0.7, 1))) / sc;
      T.style.borderRadius = `${round.toFixed(2)}px`;
      /* The window's shadow is painted once and only its strength changes, so no frame repaints it. */
      if (H) H.style.opacity = rest ? "0" : (px > 0 ? clamp(x * 2) : 1 - e).toFixed(3);

      /* The hero card keeps the demo window registered with the growing product window, and gives way to it. */
      if (pe < 1) {
        const k = sc / g.s0;
        C.style.transform = `translate3d(${(tx - g.cx - k * (g.wx - g.cx)).toFixed(2)}px, ${(ty - g.cy - k * (g.wy - g.cy)).toFixed(2)}px, 0) scale(${k.toFixed(5)})`;
        C.style.opacity = (1 - seg(pe, 0.34, 0.48)).toFixed(3);
        C.style.visibility = pe > 0.48 ? "hidden" : "";
        if (phone) phone.style.translate = g.narrow ? "" : `${(settle(seg(pe, 0, 0.42)) * 380).toFixed(1)}px 0`;
      } else { C.style.visibility = "hidden"; }

      /* The plan of the ward, in three depths. Going in, the camera moves towards it and the nearest marks pass fastest;
         coming out it pulls away again. One move, so it says one thing: you are going into the ward, and back out. */
      const near = px > 0 ? 1 - travel(seg(px, 0, 0.86)) : travel(seg(pe, 0, 0.92));
      const depth = g.narrow ? [0.03, 0.06, 0.1] : [0.05, 0.11, 0.2];
      layers.forEach((n, i) => { const z = 1 + depth[i] * near; n.style.transform = near < 0.001 && !gone ? "" : `translate3d(0, ${(gone * [84, 48, 16][i] - near * [0, 10, 26][i]).toFixed(1)}px, 0) scale(${z.toFixed(4)})`; });

      /* The blueprint ground: opens from the card to the whole screen, and closes back to a card on the way out. */
      const open = travel(clamp(pe * 1.25)), shut = travel(seg(px, 0.22, 1));
      const l0 = g.cx, t0 = Math.max(0, g.cy), r0 = Math.max(0, g.vw - g.cx - g.cw), b0 = Math.max(0, g.vh - g.cy - g.ch);
      const l = px > 0 ? lerp(0, g.gut, shut) : lerp(l0, 0, open), r = px > 0 ? lerp(0, g.gut, shut) : lerp(r0, 0, open);
      const t = px > 0 ? lerp(0, top1, shut) : lerp(t0, 0, open), b = px > 0 ? lerp(0, bottom1, shut) : lerp(b0, 0, open);
      const rad = px > 0 ? lerp(0, g.narrow ? 20 : 28, shut) : lerp(g.narrow ? 20 : 28, 0, open);
      /* The ground sits under the hero card and the product over it, so both are cut to the same shape. */
      K.style.clipPath = F.style.clipPath = l + r + t + b + rad < 0.5 ? "none" : `inset(${t.toFixed(1)}px ${r.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px round ${rad.toFixed(1)}px)`;
      if (G) G.style.opacity = px > 0 ? shut.toFixed(3) : "0";

      /* The product's parts arrive in reading order: the frame from its edges, then Kaju's words, then what he noticed. */
      const arriving = px <= 0 && pe < 1;
      for (const p of parts) { const v = arriving ? settle(seg(pe, p.a, p.b)) : 1; show(p.el, v, `translate3d(${((1 - v) * p.x).toFixed(1)}px, ${((1 - v) * p.y).toFixed(1)}px, 0)`); }

      /* The ask field is one thing all the way through: the demo's field, travelling to become the composer. */
      const carried = arriving && !!askFrom && !!askTo;
      if (Q) {
        if (carried && pe > 0.18) {
          const from = askFrom!, to = askTo!, u = travel(seg(pe, 0.32, 0.78));
          const bx = lerp(from.x, to.x, u), by = lerp(from.y, to.y, u), bw = lerp(from.w, to.w, u), bh = lerp(from.h, to.h, u);
          const sx = bw / to.w, sy = bh / to.h, rr = lerp(12 / g.s0, 16, u);
          Q.style.visibility = "visible";
          Q.style.opacity = (seg(pe, 0.2, 0.32) * (1 - seg(pe, 0.82, 0.9))).toFixed(3);
          Q.style.transform = `translate3d(${(bx - to.x).toFixed(2)}px, ${(by - to.y).toFixed(2)}px, 0) scale(${sx.toFixed(5)}, ${sy.toFixed(5)})`;
          Q.style.borderRadius = `${(rr / sx).toFixed(2)}px / ${(rr / sy).toFixed(2)}px`;
          const inner = Q.firstElementChild as HTMLElement | null;
          if (inner) { inner.style.transform = `translate3d(0, ${(lerp((bh - 24) / 2, 16, u) / sy).toFixed(2)}px, 0) scale(${(1 / sx).toFixed(5)}, ${(1 / sy).toFixed(5)})`; inner.style.opacity = (1 - seg(u, 0.7, 1)).toFixed(3); }
        } else Q.style.visibility = "hidden";
      }
      if (composer) composer.style.opacity = arriving ? (carried ? seg(pe, 0.78, 0.88) : settle(seg(pe, 0.6, 0.8))).toFixed(3) : "";

      /* Kaju is one dog all the way through. Going in, he leaves his perch on the window and lands in his seat in the
         product; coming out, he hops back up onto the framed window and waits there. */
      if (J && pupFrom) {
        const size1 = (g.narrow ? 64 : 96) / s1;
        const onTop: Box = { x: g.vw * (g.narrow ? 0.7 : 0.8), y: -size1 * 0.8, w: size1, h: size1 };
        let from: Box | null = null, to: Box | null = null, v = 0, on = false, fade = 1;
        if (arriving) { from = pupFrom; to = pupTo; v = seg(pe, 0.14, 0.64); on = pe > 0.14 && pe < 0.64 && !!pupTo; }
        else if (px > 0) { from = seatSeen ? pupTo : null; to = onTop; v = seg(px, 0.34, 0.76); on = px > 0.34; if (!from) { from = onTop; fade = settle(seg(px, 0.5, 0.7)); } }
        if (perch) perch.style.visibility = on || pe >= 0.64 ? "hidden" : "";
        if (seat) seat.style.visibility = (arriving && on) || (px > 0.34 && seatSeen) ? "hidden" : "";
        if (on && from && to) {
          /* Off the perch he drops into the product; back out he has to jump up onto the window. */
          const m = travel(v), lift = from === to ? 0 : Math.sin(Math.PI * v) * (arriving ? 28 : Math.min(110, g.vh * 0.12));
          const lx = lerp(from.x, to.x, m), ly = lerp(from.y, to.y, m), lw = lerp(from.w, to.w, m);
          J.style.visibility = "visible"; J.style.opacity = fade.toFixed(3);
          J.style.transform = `translate3d(${(tx + sc * lx).toFixed(2)}px, ${(ty + sc * ly - lift).toFixed(2)}px, 0) scale(${((sc * lw) / KAJU).toFixed(4)})`;
          /* He faces the way he is going, trots through the air and sits when he lands. */
          if (arriving) kajuDoes(v < 0.08 ? "standing" : v < 0.9 ? "trotting" : "sitting", v >= 0.08 && v < 0.9 && to.x < from.x);
          else kajuDoes(v >= 1 ? "perch" : from === to || v < 0.08 || v > 0.9 ? "sitting" : "trotting", false);
        } else J.style.visibility = "hidden";
      }

      /* The framed window is drawn into the plan: corner marks and a caption, the way a plan marks a detail. */
      const noted = seg(px, 0.66, 0.86);
      for (const n of marks) { n.style.opacity = noted.toFixed(3); n.style.transform = `scale(${(1 / sc).toFixed(4)})`; }
      if (L) { L.style.opacity = (noted * 0.9).toFixed(3); L.style.transform = `translate3d(${tx.toFixed(1)}px, ${(ty - 32).toFixed(1)}px, 0)`; L.style.visibility = noted > 0 && !g.narrow ? "visible" : "hidden"; }

      /* The handover line rises word by word, in reading order, as the window settles. */
      const said = seg(px, 0.56, 0.7);
      O.style.visibility = said > 0 ? "visible" : "hidden"; O.style.opacity = "1";
      O.style.transform = gone ? `translate3d(0, ${(-gone * 36).toFixed(1)}px, 0)` : "";
      const lead = O.firstElementChild as HTMLElement | null, acts = O.lastElementChild as HTMLElement | null;
      if (lead) { lead.style.opacity = said.toFixed(3); lead.style.transform = said >= 1 ? "" : `translate3d(0, ${((1 - settle(said)) * 12).toFixed(1)}px, 0)`; }
      wordEls.forEach((w, i) => { const v = settle(seg(px, 0.62 + i * 0.03, 0.8 + i * 0.03)); w.style.transform = v >= 1 ? "" : `translate3d(0, ${((1 - v) * 108).toFixed(1)}%, 0)`; });
      if (acts) { const v = settle(seg(px, 0.84, 0.98)); acts.style.opacity = v.toFixed(3); acts.style.transform = v >= 1 ? "" : `translate3d(0, ${((1 - v) * 16).toFixed(1)}px, 0)`; }
    };

    /** One frame: where the page is decides what the visitor can do; what is drawn follows it through a short settle. */
    const frame = (now: number) => {
      raf = 0;
      const want = window.scrollY - g.start;
      /* Within a pixel of an end counts as that end, so a stop at a rounded scroll position is the settled state. */
      const snap = (v: number) => (v > 0.998 ? 1 : v < 0.002 ? 0 : v);
      const pe = snap(clamp(want / g.e)), px = snap(clamp((want - g.e - g.p) / g.x));
      const next: Phase = want <= 0 ? "hero" : pe < 1 ? "enter" : px <= 0 ? "inside" : px < 1 ? "exit" : want > g.e + g.p + g.x + g.vh * 0.6 ? "past" : "out";
      if (next !== phaseRef.current) { phaseRef.current = next; setPhase(next); }
      root.classList.toggle("kx-inside", pe > 0.42 && px < 0.3);
      /* Held to the screen between the two ends (see passage.css); sticky has it for the few pixels at each end. */
      sticky.classList.toggle("is-held", want > 3 - g.hold && want < g.e + g.p + g.x - 3);
      if (pe > 0.5 !== coveredRef.current) { coveredRef.current = pe > 0.5; setCovered(pe > 0.5); }
      const dt = last ? Math.min(64, now - last) : 16; last = now;
      /* Before the passage begins the card follows the page exactly: its controls must be where a pointer expects them.
         The settle is for the passage itself, where the things that move are not things to press. */
      if (want <= 0 || cur === null) cur = want;
      else cur = Math.max(0, cur) + (want - Math.max(0, cur)) * (1 - Math.exp(-dt / SETTLE_MS));
      if (Math.abs(want - cur) < 0.4) cur = want;
      /* Ends are exact: the product is never left a hair short of full size, nor the framed window a hair off its place. */
      const ends = [g.e, g.e + g.p, g.e + g.p + g.x];
      const at = ends.find((v) => Math.abs(want - v) < 1.5 && Math.abs(cur! - v) < 1.5);
      paint(cur === want && at !== undefined ? at : cur);
      if (cur !== want) raf = requestAnimationFrame(frame); else last = 0;
    };
    const onScroll = () => { moved.current = performance.now(); if (running && !raf) raf = requestAnimationFrame(frame); };
    const onResize = () => { measure(); cur = null; painted = NaN; onScroll(); };
    refresh.current = () => { if (!running) return; readProduct(); painted = NaN; onScroll(); };

    let ro: ResizeObserver | null = null;
    const start = () => {
      if (still.matches) { root.classList.add("kx-js", "kx-still"); root.classList.remove("kx-on", "kx-inside"); setMode("still"); return; }
      running = true; root.classList.add("kx-js", "kx-on"); root.classList.remove("kx-still"); setMode("motion");
      measure(); cur = null; painted = NaN; frame(performance.now());
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
      /* Anything that moves the hero on the page (the news bar closing, fonts arriving) changes where the passage starts. */
      ro = new ResizeObserver(onResize); ro.observe(sticky); ro.observe(document.body);
    };
    const stop = () => {
      running = false; sticky.classList.remove("is-held");
      window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); ro?.disconnect(); ro = null; cancelAnimationFrame(raf); raf = 0; last = 0;
      for (const n of [shade.current, app.current, tilt.current, card.current, clip.current, outro.current, glow.current, field.current, ask.current, kaju.current, fig.current, composer, seat, perch, outro.current?.firstElementChild, outro.current?.lastElementChild, ask.current?.firstElementChild, ...parts.map((p) => p.el), ...wordEls, ...marks, ...layers]) (n as HTMLElement | null | undefined)?.removeAttribute("style");
      if (phone) phone.style.translate = "";
    };
    const flip = () => { stop(); start(); };
    start();
    still.addEventListener("change", flip);
    return () => { still.removeEventListener("change", flip); stop(); refresh.current = () => {}; root.classList.remove("kx-js", "kx-on", "kx-still", "kx-inside"); };
  }, []);

  /* The product's code is fetched when a visitor first heads for it (or the page has been idle a while), not with the page. */
  useEffect(() => {
    if (want) return;
    const go = () => setWant(true);
    const idle = window.setTimeout(() => { if (!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) go(); }, 3500);
    const evs = ["scroll", "pointerdown", "keydown", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, go, { passive: true, once: true }));
    return () => { window.clearTimeout(idle); evs.forEach((e) => window.removeEventListener(e, go)); };
  }, [want]);

  /* A deliberate move through the passage: eased, about a second, and dropped the moment the visitor scrolls themselves.
     Each move owns its own frame and listeners, so starting a second one (Escape just after going in) ends the first
     cleanly and can never be cancelled by it. */
  const endGlide = useRef<(() => void) | null>(null);
  const smooth = useCallback((to: number) => {
    endGlide.current?.();
    const from = window.scrollY, dist = Math.max(0, Math.round(to)) - from, ms = Math.min(1700, Math.max(700, Math.abs(dist) * 0.85)), t0 = performance.now();
    let frame = 0, listening = 0, done = false;
    const stop = () => { if (done) return; done = true; cancelAnimationFrame(frame); window.clearTimeout(listening); window.removeEventListener("wheel", stop); window.removeEventListener("touchstart", stop); window.removeEventListener("keydown", key); if (endGlide.current === stop) endGlide.current = null; };
    /* A key that scrolls the page takes over; typing into Kaju while the move finishes does not interrupt it. */
    const key = (e: KeyboardEvent) => { const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)); if (!typing && [" ", "PageUp", "PageDown", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) stop(); };
    const step = (now: number) => { if (done) return; const t = clamp((now - t0) / ms); window.scrollTo({ top: from + dist * travel(t), behavior: "instant" as ScrollBehavior }); if (t < 1) frame = requestAnimationFrame(step); else stop(); };
    /* Listening starts after this turn, so the key or tap that asked for the move does not also cancel it. */
    listening = window.setTimeout(() => { if (done) return; window.addEventListener("wheel", stop, { passive: true }); window.addEventListener("touchstart", stop, { passive: true }); window.addEventListener("keydown", key); }, 0);
    endGlide.current = stop;
    frame = requestAnimationFrame(step);
  }, []);
  useEffect(() => () => endGlide.current?.(), []);
  /* The caret goes to the composer on a keyboard-and-pointer device; a phone is not made to raise its keyboard unasked. */
  const focus = useCallback(() => { if (window.matchMedia("(pointer: fine)").matches) setFocusKey((n) => n + 1); }, []);
  const enter = useCallback(() => {
    setWant(true); setNews(false);
    if (mode === "still") { app.current?.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior }); focus(); return; }
    const g = geo.current;
    if (phaseRef.current === "inside") { focus(); return; }
    pendingFocus.current = true;
    /* The middle of the inside stretch: the same slack above and below, so a nudge of the page (a control scrolling itself
       into view, a phone's keyboard arriving) leaves the visitor where they are. */
    smooth(g.start + g.e + g.p * 0.5);
  }, [mode, smooth, focus]);
  const exit = useCallback(() => {
    if (mode === "still") { document.querySelector(".s4-proof")?.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior }); return; }
    const g = geo.current; (document.activeElement as HTMLElement | null)?.blur?.();
    pendingOut.current = true;
    smooth(g.start + g.e + g.p + g.x + 1);
  }, [mode, smooth]);
  useEffect(() => {
    if (phase === "inside" && pendingFocus.current) { pendingFocus.current = false; focus(); }
    /* Stepping out leaves the keyboard on the way back in, next to the page that follows. */
    if (phase === "out" && pendingOut.current) { pendingOut.current = false; back.current?.focus({ preventScroll: true }); }
    /* A page opened part-way down (a reload, a restored tab) is already at the product: fetch it. */
    if (phase !== "hero") setWant(true);
    /* The product may have been scrolled or changed since it was last read: read its layout as a move begins. */
    if (phase === "enter" || phase === "exit") refresh.current();
  }, [phase, focus]);

  const active = mode === "still" || phase === "inside";
  const onConversation = useCallback((s: { turns: number; busy: boolean; answered: boolean }) => { setTalk(s); requestAnimationFrame(() => refresh.current()); }, []);
  /* An answer that arrives while the visitor is elsewhere on the page is waiting for them, and the page says so. */
  const wasBusy = useRef(false);
  useEffect(() => { if (wasBusy.current && !talk.busy && !active) setNews(true); wasBusy.current = talk.busy; }, [talk.busy, active]);
  useEffect(() => { if (active) setNews(false); }, [active]);
  const away = mode === "motion" && (phase === "past" || phase === "hero") && talk.turns > 0;
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => { setHost(track.current?.closest(".s4-page") ?? document.body); }, []);
  const waiting = mode === "motion" && (phase === "out" || phase === "past" || phase === "exit");

  return (
    <>
      <div ref={track} className="kx-track" data-phase={phase}>
        <div ref={pin} className="kx-pin" onKeyDown={(e) => { if (e.key === "Escape" && active && mode === "motion") exit(); }}>
          {/* The plan of the ward in three depths, far to near, so the camera can move through it. */}
          <div ref={field} className="kx-field" aria-hidden><Blueprint tone="dark" part="plots" /><Blueprint tone="dark" part="lines" /><Blueprint tone="dark" part="marks" /></div>
          <div className="s4-wrap kx-cardwrap">
            <div ref={card} className="kx-card0">
              <div className="s6-canvas">
                <Blueprint tone="dark" />
                {/* a soft light follows the pointer across the blueprint */}
                <span className="s8-light" aria-hidden />
                <button type="button" className="kx-enter" onClick={enter}><Sparkles size={15} aria-hidden />Ask Kaju yourself<ArrowDown size={15} aria-hidden /></button>
                <div className="s4-hero-stage s6-stage" onClick={(e) => { if (mode !== "off" && performance.now() - moved.current > 400 && !(e.target as HTMLElement).closest(".s4d-ctrl, button, a")) enter(); }}>
                  {/* Kaju rests on the product window: the agent lives inside the work. */}
                  <span className="s4-hero-perch" aria-hidden><HeroPerch /></span>
                  <HeroDemo hold={mode === "motion" && covered} />
                </div>
              </div>
            </div>
          </div>

          <div ref={glow} className="kx-glow" aria-hidden />
          <div ref={clip} className="kx-clip" onClick={() => { if (waiting) enter(); }} onPointerEnter={() => setGlad(true)} onPointerLeave={() => setGlad(false)}>
            <div ref={outro} className="kx-outro">
              <p className="kx-outro-k">That was Kaju, on a sample programme.</p>
              <p className="kx-outro-h" role="heading" aria-level={2} aria-label={HEADLINE.join(" ")}>{HEADLINE.map((w, i) => <span key={i} aria-hidden><span className="kx-w"><span>{w}</span></span>{i < HEADLINE.length - 1 ? " " : ""}</span>)}</p>
              <div className="kx-outro-a">
                <button ref={back} type="button" className="s4-btn is-white is-sm" onClick={(e) => { e.stopPropagation(); enter(); }}><KajuFace size={20} />{talk.turns ? "Back to your conversation" : "Back to Kaju"}</button>
                <Link href="/demo" className="kx-outro-l" onClick={(e) => e.stopPropagation()}>Put Kaju on your own records <ArrowRight size={16} aria-hidden /></Link>
              </div>
            </div>
            <p ref={fig} className="kx-fig" aria-hidden>KAJU · WARD 14 ABC UNIT · SAMPLE PROGRAMME</p>
            <div ref={app} id="kaju" className={`kx-app${phase === "inside" ? " is-arrived" : ""}`} aria-hidden={!active || undefined} inert={!active}>
              <span ref={shade} className="kx-shade" aria-hidden />
              <div ref={tilt} className="kx-tilt">
                {want ? <Live active={active} onExit={exit} focusKey={focusKey} onConversation={onConversation} /> : <Opening />}
                {/* The ask field on its way from the demo to the composer. */}
                <div ref={ask} className="kx-ask" aria-hidden><span><Sparkles size={16} /><i>Ask Kaju anything about your programme…</i></span></div>
              </div>
              {["tl", "tr", "bl", "br"].map((c) => <span key={c} className={`kx-mark is-${c}`} aria-hidden />)}
            </div>
            {/* Kaju himself, between his perch on the window and his seat inside the product. */}
            <div ref={kaju} className="kx-kaju" aria-hidden>
              {act.pose === "perch" ? (glad ? <KajuPresence key="glad" state="tailWag" size={KAJU} /> : <KajuPresence key="perch" sequence="perch" loop size={KAJU} />) : <KajuPresence key="go" state={act.pose} flip={act.flip} size={KAJU} />}
            </div>
          </div>
        </div>
      </div>
      {/* Drawn at the page's own level: the hero is its own layer, and this has to sit over every section after it. */}
      {away && host ? createPortal(
        <button type="button" className={`kx-resume${news ? " has-news" : ""}`} onClick={enter}>
          <KajuFace size={26} /><span><b>{news ? "Kaju has answered" : "Back to Kaju"}</b><small>{news ? "Your conversation is waiting" : "Your conversation is kept"}</small></span>
        </button>, host) : null}
    </>
  );
}
