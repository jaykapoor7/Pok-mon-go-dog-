"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GlobeScene } from "./Globe";

/* ─────────────────────────────────────────────────────────────────────────
   Hero + Globe — one unified sticky section.
   The globe is visible from the moment the page loads, overlaid on the
   branded aerial photo. It runs its cinematic sequence (spin → India zoom
   → particle burst) while the hero text fades in. Scrolling through the
   300vh section keeps the globe in view through the full burst, then
   releases into the community section below.
───────────────────────────────────────────────────────────────────────── */
function HeroGlobeSection() {
  const wrapperRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);
  const [stage, setStage] = useState(-1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setActive(e.isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Text stages timed to Globe's cinematic sequence:
  // 0–1 s  free rotation  →  stage 0 (headline visible)
  // 1–1.8 s ease to India →  stage 1 (body copy)
  // 2.3–2.9 s burst       →  stage 2 (payoff line)
  useEffect(() => {
    if (!active) {
      setStage(-1);
      return;
    }
    const a = setTimeout(() => setStage(0), 120);
    const b = setTimeout(() => setStage(1), 1150);
    const c = setTimeout(() => setStage(2), 2400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [active]);

  const vis = (s: number, delay = "0s") => ({
    opacity: stage >= s ? 1 : 0,
    transform: stage >= s ? "translateY(0px)" : "translateY(14px)",
    transition: `opacity 0.75s ease ${delay}, transform 0.75s ease ${delay}`,
  });

  return (
    <section ref={wrapperRef} className="relative min-h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Branded aerial photo background */}
        <div
          className="absolute inset-0 scale-[1.04] bg-cover bg-center"
          style={{ backgroundImage: "url(/hero/street-branded.jpg)" }}
        />

        {/* Dark vignettes so text + globe both read clearly */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/88 via-ink/38 to-ink/14" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/78 via-ink/22 to-transparent" />

        {/* Globe — transparent canvas so photo shows through the sphere */}
        <div className="absolute inset-0">
          <GlobeScene active={active} transparent />
        </div>

        {/* Hero copy — left side */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 max-w-lg px-8 sm:px-14 lg:px-20">
          <p
            className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400/75"
            style={vis(0)}
          >
            StrayPaw — Delhi
          </p>
          <h1
            className="font-display text-5xl font-extrabold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl"
            style={vis(0, "0.05s")}
          >
            Every stray
            <br />
            has a story.
          </h1>
          <p
            className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/60 sm:text-base"
            style={vis(1, "0.1s")}
          >
            17,400 preventable deaths a year. India carries most of the global
            rabies burden — because the infrastructure to protect street animals
            doesn&apos;t exist yet.
          </p>
          <p
            className="mt-4 text-base font-semibold text-white"
            style={vis(2, "0.12s")}
          >
            <span className="text-amber-400">
              StrayPaw is the infrastructure.
            </span>
          </p>
          <div
            className="mt-8 flex flex-wrap gap-3"
            style={vis(0, "0.18s")}
          >
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Open the app
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/75 transition hover:border-white/40 hover:text-white"
            >
              See the data
            </Link>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-7 right-7 z-10 flex flex-col items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
            Scroll
          </span>
          <div className="h-10 w-px bg-gradient-to-b from-white/25 to-transparent" />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Community — ParticulerCube port.
   Follows directly after the globe burst. The green node lattice echoes
   the burst cluster colour (both use #4ade80) for visual continuity.
───────────────────────────────────────────────────────────────────────── */
function ParticleCubeCanvas({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    if (!canvas) return;
    startRef.current = performance.now();

    const G = 6,
      S = 34;
    const half = (G - 1) / 2;
    const pts: { x: number; y: number; z: number }[] = [];
    for (let x = 0; x < G; x++)
      for (let y = 0; y < G; y++)
        for (let z = 0; z < G; z++)
          pts.push({
            x: (x - half) * S,
            y: (y - half) * S,
            z: (z - half) * S,
          });

    let raf = 0;
    let canW = 0,
      canH = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nW = rect.width,
        nH = rect.height;
      if (canW !== nW || canH !== nH) {
        canW = nW;
        canH = nH;
        canvas.width = (nW * dpr) | 0;
        canvas.height = (nH * dpr) | 0;
      }
      const ctx = canvas.getContext("2d")!;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canW, canH);

      const t = (now - startRef.current) * 5e-4;
      const aX = t * 0.72,
        aY = t * 1.05;
      const cx = canW / 2,
        cy = canH / 2,
        fov = 400;

      const proj = pts.map(({ x, y, z }) => {
        const rx = x * Math.cos(aY) + z * Math.sin(aY);
        let rz = -x * Math.sin(aY) + z * Math.cos(aY);
        const ry = y * Math.cos(aX) - rz * Math.sin(aX);
        rz = y * Math.sin(aX) + rz * Math.cos(aX);
        const sc = fov / (fov + rz + 100);
        return { px: cx + rx * sc, py: cy + ry * sc, pz: rz, sc };
      });

      proj.sort((a, b) => b.pz - a.pz);

      for (const p of proj) {
        const alpha = Math.max(0.08, Math.min(1, (p.pz + 160) / 320));
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.arc(p.px, p.py, Math.max(0.7, 2.7 * p.sc), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

function CommunitySection() {
  const wrapperRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setActive(e.isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={wrapperRef} className="relative min-h-[200vh]">
      <div className="sticky top-0 h-screen overflow-hidden bg-[#030810]">
        <ParticleCubeCanvas active={active} />

        {/* Radial mask so centre text reads cleanly */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 52% 62% at 50% 50%, rgba(3,8,16,0.84) 0%, transparent 100%)",
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-xl px-8 text-center">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400/70">
              The network
            </p>
            <h2 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl">
              One report.
              <br />
              One connection.
              <br />
              <span className="text-emerald-400">One rescue.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/55 sm:text-base">
              Every sighting feeds a community network — rescuers, vets,
              volunteers, and NGOs all connected through the same
              infrastructure.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Image Tunnel — InfiniteImageTunnel reference port.
   CSS 3D perspective tunnel, real photos rushing toward the viewer.
───────────────────────────────────────────────────────────────────────── */
const PHOTOS = ["/hero/street-branded.jpg", "/hero/street-real.jpg"];
const N_FRAMES = 14;
const DEPTH = 5400;
const SPEED = 300;
const NEAR = -380;

function TunnelSection() {
  const wrapperRef = useRef<HTMLElement>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const depthsRef = useRef(new Float32Array(N_FRAMES));
  const rafRef = useRef(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    for (let i = 0; i < N_FRAMES; i++) {
      depthsRef.current[i] = (i / N_FRAMES) * DEPTH;
    }
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setActive(e.isIntersecting),
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    let last = 0;
    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const d = depthsRef.current;
      for (let i = 0; i < N_FRAMES; i++) {
        d[i] -= SPEED * dt;
        if (d[i] < NEAR) d[i] += DEPTH;
        const el = frameRefs.current[i];
        if (!el) continue;
        const z = d[i];
        const fade =
          z > DEPTH * 0.68
            ? Math.max(0, 1 - (z - DEPTH * 0.68) / (DEPTH * 0.32))
            : 1;
        el.style.transform = `translate3d(-50%, -50%, ${-z}px)`;
        el.style.opacity = fade.toFixed(3);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return (
    <section
      ref={wrapperRef}
      className="relative h-screen min-h-[580px] overflow-hidden bg-ink"
    >
      <div
        className="absolute inset-0"
        style={{ perspective: "820px", perspectiveOrigin: "50% 50%" }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
          }}
        >
          {Array.from({ length: N_FRAMES }, (_, i) => (
            <div
              key={i}
              ref={(el) => {
                frameRefs.current[i] = el;
              }}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: "86vw",
                height: "64vh",
                transform: `translate3d(-50%, -50%, ${-((i / N_FRAMES) * DEPTH)}px)`,
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PHOTOS[i % PHOTOS.length]}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
                draggable={false}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(10,14,22,0.55) 0%, transparent 60%)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Radial vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 20%, rgba(10,14,22,0.92) 82%)",
        }}
      />

      {/* Text */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="px-8 text-center">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">
            The reality
          </p>
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Real dogs.
            <br />
            Real Delhi.
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-white/55 sm:text-base">
            Not statistics. Street animals living alongside 20 million
            people — invisible to the system that should protect them.
          </p>
          <Link
            href="/map"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            See the live map
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   LandingJourney — main export
───────────────────────────────────────────────────────────────────────── */
export function LandingJourney() {
  return (
    <>
      <HeroGlobeSection />
      <CommunitySection />
      <TunnelSection />
    </>
  );
}
