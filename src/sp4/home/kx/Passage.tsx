"use client";

/* ════════════════════════════════════════════════════════════════════
   The passage through the product, in the middle of the hero.

   The hero's blueprint card (the scripted product demo, with Kaju on
   top of it) is where it always was. As the page scrolls on, the card
   holds still and three things happen in turn:

     enter   the product window grows until it is the whole screen, and
             the scripted demo gives way to Kaju itself: the real
             interface, answering a visitor's own questions about a
             sample programme;
     inside  nothing moves. The visitor is in the product;
     exit    the interface draws back into a framed window on the
             blueprint, the card closes around it, the page's header
             returns, and a line of type hands over to the rest of the
             page.

   Scrolling drives all of it and is never held: the page always moves
   with the wheel, a finger or the keyboard. "Ask Kaju yourself" and a
   click on the window go straight in; "Step out" and Escape go straight
   out; the conversation is kept, and "Back to Kaju" returns to it from
   anywhere further down.

   Geometry is written straight onto four elements once per frame
   (transform, clip-path and opacity only: nothing is laid out again).
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
import { Blueprint } from "../Blueprint";
import { HeroDemo } from "../HeroDemo";
import { HeroPerch } from "../HeroPerch";
import type { LiveProps } from "./KajuLive";
import "./passage.css";

const Live = dynamic<LiveProps>(() => import("./KajuLive"), { ssr: false, loading: () => <Opening /> });

type Phase = "hero" | "enter" | "inside" | "exit" | "out" | "past";
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const out3 = (t: number) => 1 - Math.pow(1 - t, 3);
/** How far each stretch of the passage runs, in screen heights: holding still on arrival (the scripted demo plays and
    its controls stay put), growing in, staying inside, drawing back. */
const RUN = { wide: [0.3, 0.85, 0.65, 1.0], narrow: [0.2, 0.7, 0.5, 0.85] } as const;

function Opening() {
  return <div className="kx-opening" role="status"><span className="kx-opening-side" aria-hidden /><span className="kx-opening-main"><KajuFace size={28} /><span>Opening Kaju…</span></span></div>;
}

/** An element's place inside an ancestor, from layout alone (transforms and animations do not move it). */
function placeIn(el: HTMLElement, root: HTMLElement) {
  let x = 0, y = 0, n: HTMLElement | null = el;
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

export function KajuPassage() {
  const track = useRef<HTMLDivElement>(null), pin = useRef<HTMLDivElement>(null), clip = useRef<HTMLDivElement>(null), card = useRef<HTMLDivElement>(null);
  const app = useRef<HTMLDivElement>(null), tilt = useRef<HTMLDivElement>(null), outro = useRef<HTMLDivElement>(null), glow = useRef<HTMLDivElement>(null), field = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("hero");
  const [mode, setMode] = useState<"off" | "motion" | "still">("off");
  const [want, setWant] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const [talk, setTalk] = useState({ turns: 0, busy: false, answered: false });
  const [news, setNews] = useState(false);
  const geo = useRef({ start: 0, vh: 1, e: 1, p: 1, x: 1 });
  const phaseRef = useRef<Phase>("hero");
  const pendingFocus = useRef(false), pendingOut = useRef(false), back = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = track.current, sticky = pin.current; if (!el || !sticky) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    let raf = 0, g = { vw: 1, vh: 1, vt: 0, start: 0, hold: 0, e: 1, p: 1, x: 1, wx: 0, wy: 0, s0: 1, cx: 0, cy: 0, cw: 0, ch: 0, head: 72, gut: 16, narrow: false, outH: 0 };
    let phone: HTMLElement | null = null;

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
      el.style.setProperty("--kx-top", `${vt}px`);
      const win = sticky.querySelector<HTMLElement>(".s4d-win"); phone = sticky.querySelector<HTMLElement>(".s4d-phone");
      const anchor = win && win.offsetWidth > 0 ? win : phone;
      const c = card.current;
      if (!anchor || !c) return;
      const a = placeIn(anchor, sticky), cc = placeIn(c, sticky);
      /* The page's own offset, read without the pin's stuck position: the track is not positioned by scrolling. */
      const top = el.getBoundingClientRect().top + window.scrollY;
      g = { vw, vh, vt, start: top + vt + hold * vh, hold: hold * vh, e: e * vh, p: p * vh, x: x * vh, wx: a.x, wy: a.y - vt, s0: a.w / vw, cx: cc.x, cy: cc.y - vt, cw: cc.w, ch: cc.h, head, gut: cc.x, narrow, outH: outro.current?.offsetHeight ?? 0 };
      geo.current = { start: g.start, vh, e: g.e, p: g.p, x: g.x };
    };

    const apply = () => {
      raf = 0;
      const s = window.scrollY - g.start;
      /* Within a pixel of an end counts as that end, so a stop at a rounded scroll position is the settled state. */
      const snap = (v: number) => (v > 0.998 ? 1 : v < 0.002 ? 0 : v);
      const pe = snap(clamp(s / g.e)), px = snap(clamp((s - g.e - g.p) / g.x));
      const next: Phase = s <= 0 ? "hero" : pe < 1 ? "enter" : px <= 0 ? "inside" : px < 1 ? "exit" : s > g.e + g.p + g.x + g.vh * 0.6 ? "past" : "out";
      if (next !== phaseRef.current) { phaseRef.current = next; setPhase(next); }
      root.classList.toggle("kx-inside", pe > 0.42 && px < 0.3);
      const A = app.current, T = tilt.current, C = card.current, K = clip.current, O = outro.current, G = glow.current, F = field.current;
      if (!A || !T || !C || !K || !O || !F) return;

      if (s <= 0) {
        /* Before the card holds: it grows a little as it arrives, as the hero always has. */
        const a = g.narrow ? 1 : clamp(1 + (s + g.hold) / Math.max(1, g.start - g.hold));
        const k = 0.955 + 0.045 * a;
        C.style.transform = a < 1 ? `translate3d(${((1 - k) * g.cw / 2).toFixed(2)}px, 0, 0) scale(${k.toFixed(4)})` : "";
        C.style.opacity = ""; C.style.visibility = "";
        K.style.visibility = "hidden"; F.style.visibility = "hidden"; O.style.visibility = "hidden"; if (phone) phone.style.translate = "";
        if (G) G.style.opacity = "0";
        return;
      }
      K.style.visibility = "visible"; F.style.visibility = "visible";
      const e = ease(pe), x = ease(px);
      /* The window: from the demo window's own place and size to the whole screen, then back to a framed window. */
      const s1 = g.narrow ? Math.min(0.8, (g.vw - 2 * g.gut - 24) / g.vw) : Math.min(0.7, (g.vw - 2 * g.gut - 160) / g.vw);
      const top1 = g.head + (g.narrow ? 12 : 16), bottom1 = g.narrow ? 12 : 20;
      const tx1 = (g.vw - g.vw * s1) / 2, ty1 = top1 + g.outH + (g.narrow ? 20 : 28);
      const sc = px > 0 ? lerp(1, s1, x) : lerp(g.s0, 1, e);
      const tx = px > 0 ? lerp(0, tx1, x) : lerp(g.wx, 0, e);
      const ty = px > 0 ? lerp(0, ty1, x) : lerp(g.wy, 0, e);
      const rest = pe >= 1 && px <= 0;
      A.style.transform = rest ? "none" : `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${sc.toFixed(5)})`;
      /* A short dissolve: the two windows are in register, so it reads as one window changing what it shows. */
      A.style.opacity = px > 0 ? "1" : clamp((pe - 0.26) / 0.18).toFixed(3);
      /* Depth: the window leans back a little while it travels and is flat at rest. */
      const lean = g.narrow ? 0 : px > 0 ? 6 * Math.sin(Math.PI * x) : 3.5 * Math.sin(Math.PI * e);
      T.style.transform = rest || lean < 0.02 ? "none" : `perspective(2200px) rotateX(${lean.toFixed(3)}deg)`;
      const round = rest ? 0 : (px > 0 ? lerp(0, 18, clamp(x * 3)) : lerp(16, 0, clamp((e - 0.7) / 0.3))) / sc;
      T.style.borderRadius = `${round.toFixed(2)}px`;
      T.style.boxShadow = rest ? "none" : `0 ${(40 / sc).toFixed(0)}px ${(90 / sc).toFixed(0)}px rgba(5, 14, 40, ${(px > 0 ? 0.5 * clamp(x * 2) : 0.5 * (1 - e)).toFixed(3)}), 0 0 0 ${(1 / sc).toFixed(2)}px rgba(255, 255, 255, .14)`;

      /* The hero card keeps the demo window registered with the growing product window, and gives way to it. */
      if (pe < 1) {
        const k = sc / g.s0;
        C.style.transform = `translate3d(${(tx - g.cx - k * (g.wx - g.cx)).toFixed(2)}px, ${(ty - g.cy - k * (g.wy - g.cy)).toFixed(2)}px, 0) scale(${k.toFixed(5)})`;
        C.style.opacity = (1 - clamp((pe - 0.44) / 0.12)).toFixed(3);
        C.style.visibility = pe > 0.56 ? "hidden" : "";
        if (phone) phone.style.translate = g.narrow ? "" : `${(out3(clamp(pe * 2.2)) * 360).toFixed(1)}px 0`;
      } else { C.style.visibility = "hidden"; }

      /* The blueprint ground: opens from the card to the whole screen, and closes back to a card on the way out. */
      const open = ease(clamp(pe * 1.25)), shut = ease(clamp((px - 0.22) / 0.78));
      const l0 = g.cx, t0 = Math.max(0, g.cy), r0 = Math.max(0, g.vw - g.cx - g.cw), b0 = Math.max(0, g.vh - g.cy - g.ch);
      const l = px > 0 ? lerp(0, g.gut, shut) : lerp(l0, 0, open), r = px > 0 ? lerp(0, g.gut, shut) : lerp(r0, 0, open);
      const t = px > 0 ? lerp(0, top1, shut) : lerp(t0, 0, open), b = px > 0 ? lerp(0, bottom1, shut) : lerp(b0, 0, open);
      const rad = px > 0 ? lerp(0, g.narrow ? 20 : 28, shut) : lerp(g.narrow ? 20 : 28, 0, open);
      /* The ground sits under the hero card and the product over it, so both are cut to the same shape. */
      K.style.clipPath = F.style.clipPath = l + r + t + b + rad < 0.5 ? "none" : `inset(${t.toFixed(1)}px ${r.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px round ${rad.toFixed(1)}px)`;
      if (G) { G.style.opacity = px > 0 ? shut.toFixed(3) : "0"; G.style.left = G.style.right = `${g.gut}px`; G.style.top = `${g.vt + top1}px`; G.style.height = `${Math.max(0, g.vh - top1 - bottom1)}px`; }

      /* The handover line arrives as the window settles. */
      const say = clamp((px - 0.6) / 0.34);
      O.style.opacity = say.toFixed(3);
      O.style.transform = say >= 1 ? "none" : `translate3d(0, ${((1 - out3(say)) * 28).toFixed(1)}px, 0)`;
      O.style.visibility = say > 0 ? "visible" : "hidden";
      O.style.top = `${top1}px`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const onResize = () => { measure(); onScroll(); };

    let ro: ResizeObserver | null = null;
    const start = () => {
      if (still.matches) { root.classList.add("kx-js", "kx-still"); root.classList.remove("kx-on", "kx-inside"); setMode("still"); return; }
      root.classList.add("kx-js", "kx-on"); root.classList.remove("kx-still"); setMode("motion");
      measure(); apply();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
      /* Anything that moves the hero on the page (the news bar closing, fonts arriving) changes where the passage starts. */
      ro = new ResizeObserver(onResize); ro.observe(sticky); ro.observe(document.body);
    };
    const stop = () => {
      window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); ro?.disconnect(); ro = null; cancelAnimationFrame(raf); raf = 0;
      for (const n of [app.current, tilt.current, card.current, clip.current, outro.current, glow.current, field.current]) n?.removeAttribute("style");
      if (phone) phone.style.translate = "";
    };
    const flip = () => { stop(); start(); };
    start();
    still.addEventListener("change", flip);
    return () => { still.removeEventListener("change", flip); stop(); root.classList.remove("kx-js", "kx-on", "kx-still", "kx-inside"); };
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
    const from = window.scrollY, dist = Math.max(0, Math.round(to)) - from, ms = Math.min(1500, Math.max(650, Math.abs(dist) * 0.75)), t0 = performance.now();
    let frame = 0, listening = 0, done = false;
    const stop = () => { if (done) return; done = true; cancelAnimationFrame(frame); window.clearTimeout(listening); window.removeEventListener("wheel", stop); window.removeEventListener("touchstart", stop); window.removeEventListener("keydown", stop); if (endGlide.current === stop) endGlide.current = null; };
    const step = (now: number) => { if (done) return; const t = clamp((now - t0) / ms); window.scrollTo({ top: from + dist * ease(t), behavior: "instant" as ScrollBehavior }); if (t < 1) frame = requestAnimationFrame(step); else stop(); };
    /* Listening starts after this turn, so the key or tap that asked for the move does not also cancel it. */
    listening = window.setTimeout(() => { if (done) return; window.addEventListener("wheel", stop, { passive: true }); window.addEventListener("touchstart", stop, { passive: true }); window.addEventListener("keydown", stop); }, 0);
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
    smooth(g.start + g.e + g.p * 0.18);
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
  }, [phase, focus]);

  const active = mode === "still" || phase === "inside";
  const onConversation = useCallback((s: { turns: number; busy: boolean; answered: boolean }) => setTalk(s), []);
  /* An answer that arrives while the visitor is elsewhere on the page is waiting for them, and the page says so. */
  const wasBusy = useRef(false);
  useEffect(() => { if (wasBusy.current && !talk.busy && !active) setNews(true); wasBusy.current = talk.busy; }, [talk.busy, active]);
  useEffect(() => { if (active) setNews(false); }, [active]);
  const away = mode === "motion" && (phase === "past" || phase === "hero") && talk.turns > 0;
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => { setHost(track.current?.closest(".s4-page") ?? document.body); }, []);

  return (
    <>
      <div ref={track} className="kx-track" data-phase={phase}>
        <div ref={pin} className="kx-pin" onKeyDown={(e) => { if (e.key === "Escape" && active && mode === "motion") exit(); }}>
          <div className="s4-wrap kx-cardwrap">
            <div ref={card} className="kx-card0">
              <div className="s6-canvas">
                <Blueprint tone="dark" />
                {/* a soft light follows the pointer across the blueprint */}
                <span className="s8-light" aria-hidden />
                <button type="button" className="kx-enter" onClick={enter}><Sparkles size={15} aria-hidden />Ask Kaju yourself<ArrowDown size={15} aria-hidden /></button>
                <div className="s4-hero-stage s6-stage" onClick={(e) => { if (mode !== "off" && !(e.target as HTMLElement).closest(".s4d-ctrl, button, a")) enter(); }}>
                  {/* Kaju rests on the product window: the agent lives inside the work. */}
                  <span className="s4-hero-perch" aria-hidden><HeroPerch /></span>
                  <HeroDemo hold={mode === "motion" && phase !== "hero" && phase !== "enter"} />
                </div>
              </div>
            </div>
          </div>

          <div ref={field} className="kx-field" aria-hidden><Blueprint tone="dark" /></div>
          <div ref={glow} className="kx-glow" aria-hidden />
          <div ref={clip} className="kx-clip" onClick={() => { if (mode === "motion" && (phase === "out" || phase === "past" || phase === "exit")) enter(); }}>
            <div ref={outro} className="kx-outro">
              <p className="kx-outro-k">That was Kaju, on a sample programme.</p>
              <p className="kx-outro-h" role="heading" aria-level={2}>Now meet the teams it works with.</p>
              <div className="kx-outro-a">
                <button ref={back} type="button" className="s4-btn is-white is-sm" onClick={(e) => { e.stopPropagation(); enter(); }}><KajuFace size={20} />{talk.turns ? "Back to your conversation" : "Back to Kaju"}</button>
                <Link href="/demo" className="kx-outro-l" onClick={(e) => e.stopPropagation()}>Put Kaju on your own records <ArrowRight size={16} aria-hidden /></Link>
              </div>
            </div>
            <div ref={app} id="kaju" className="kx-app" aria-hidden={!active || undefined} inert={!active}>
              <div ref={tilt} className="kx-tilt">{want ? <Live active={active} onExit={exit} focusKey={focusKey} onConversation={onConversation} /> : <Opening />}</div>
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
