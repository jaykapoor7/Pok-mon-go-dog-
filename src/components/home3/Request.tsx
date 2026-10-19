"use client";

/* ════════════════════════════════════════════════════════════════════
   One request. Watch the whole system respond.

   It opens on the way rescue work arrives today: a dozen fragments of
   one rescue scattered across chats, sheets and calls. They spiral into
   one phone. One message is sent, and the system answers it in a chain:
   the message flies out of the chat and becomes a case; the case drops
   into a team's queue and a reply flies back to the resident; care is
   written into the animal's history; the history drops a point onto the
   map, which ripples; the point lights its locality in the city's live
   figures; the city's record is written into evidence. Every link draws
   itself as the thing travels along it, and at the end a pulse runs
   through the whole system.

   One persistent object (the message) changes shape at each node. The
   timeline is a pure function of scroll, so it plays backwards too; a
   Play button runs it on its own, without scrolling. Layout is a fixed
   virtual canvas (wide, or tall on a phone) scaled to fit, so paths and
   flights land exactly. The conversation, case and animal are an
   example; the map's areas and the city's figures are live.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Camera, CheckCheck, MapPin, Play, RotateCcw } from "lucide-react";
import { useStage, span, ease } from "@/components/bindu/stage";

export type Area = { ring: number[]; open: number; crit: number; name: string };
type R = [number, number, number, number];
type Layout = { W: number; H: number; phone: R; case: R; work: R; profile: R; map: R; city: R; ev: R };

const WIDE: Layout = { W: 1520, H: 820, phone: [40, 70, 270, 600], case: [400, 40, 340, 250], work: [400, 340, 340, 330], profile: [830, 40, 300, 300], map: [830, 390, 300, 280], city: [1220, 40, 270, 300], ev: [1220, 390, 270, 280] };
const TALL: Layout = { W: 400, H: 860, phone: [12, 10, 180, 360], case: [204, 10, 184, 170], work: [204, 192, 184, 178], profile: [12, 386, 184, 210], map: [208, 386, 180, 210], city: [12, 612, 184, 236], ev: [208, 612, 180, 236] };

/* Fragments of one rescue, before: where the work lives today (examples). */
const FRAGS = [
  { t: "Fwd: dog near bus stand, bleeding??", k: "chat" }, { t: "Who is taking this one?", k: "chat" }, { t: "Sheet3: Gandhipuram | ? | ?", k: "sheet" },
  { t: "vet_bill_0412.jpg", k: "file" }, { t: "Same dog as last week?", k: "chat" }, { t: "Missed call (3)", k: "call" },
  { t: "Is he sterilised? Nobody knows", k: "chat" }, { t: "Shared location", k: "pin" }, { t: "Volunteers group 2: 46 unread", k: "chat" },
  { t: "Ward office: report by Friday", k: "mail" }, { t: "rescues_FINAL_v3.xlsx", k: "sheet" }, { t: "Recheck? Which dog?", k: "chat" },
];
const SPOT: [number, number][] = [[6, 8], [30, 4], [55, 9], [80, 6], [93, 22], [88, 50], [94, 78], [70, 92], [44, 88], [16, 92], [4, 62], [8, 36]];

/* The chain, in scroll time. */
const T = { gather: [0.06, 0.2], arrive: [0.14, 0.24], send: [0.22, 0.26], f1: [0.26, 0.33], f2: [0.35, 0.41], f3: [0.41, 0.45], f4: [0.47, 0.53], f5: [0.56, 0.62], f6: [0.67, 0.73], f7: [0.78, 0.84], pulse: [0.88, 1] } as const;
const STEPS = ["Message", "Case", "Workspace", "History", "Map", "City", "Evidence"];

const fmt = (n: number) => n.toLocaleString("en-IN");

export function Request({ areas, city }: { areas: Area[]; city: string }) {
  const { p, listen, still } = useStage();
  const stage = useRef<HTMLDivElement>(null);
  const tok = useRef<HTMLDivElement>(null);
  const linksRef = useRef<SVGGElement>(null);
  const fragRef = useRef<HTMLDivElement>(null);
  const [tall, setTall] = useState(false);
  const [k, setK] = useState(1);
  /* the timeline, coarsely, for what React draws: which nodes have been reached */
  const [qq, setQq] = useState(still ? 1 : 0);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef<() => void>(() => {});
  const auto = useRef<{ t0: number; from: number } | null>(null);
  const written = useRef<Record<string, string>>({});
  const L = tall ? TALL : WIDE;

  /* The focus area: the locality with the most open requests on the live record. */
  const focus = useMemo(() => [...areas].sort((a, b) => b.open - a.open || b.crit - a.crit)[0] ?? null, [areas]);
  const place = focus?.name || "the bus stand";
  const top = useMemo(() => {
    const by = new Map<string, number>();
    for (const a of areas) if (a.name) by.set(a.name, (by.get(a.name) ?? 0) + a.open);
    return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [areas]);
  const maxTop = Math.max(1, ...top.map((x) => x[1]));

  /* The map tile: real areas, drawn round, projected into the tile. */
  const plate = useMemo(() => {
    if (!areas.length) return null;
    const pts = areas.map((a) => { let x = 0, y = 0; const n = a.ring.length / 2; for (let i = 0; i < a.ring.length; i += 2) { x += a.ring[i]; y += a.ring[i + 1]; } return [x / n, y / n] as [number, number]; });
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const w = Math.min(...xs), e = Math.max(...xs), s = Math.min(...ys), n = Math.max(...ys), kx = Math.cos(((s + n) / 2) * Math.PI / 180);
    const sc = 260 / Math.max((e - w) * kx, n - s, 0.001);
    return { vb: `-10 -10 ${((e - w) * kx * sc + 20).toFixed(0)} ${((n - s) * sc + 20).toFixed(0)}`, dots: pts.map(([x, y], i) => ({ x: (x - w) * kx * sc, y: (n - y) * sc, a: areas[i], r: 3.2 + Math.min(5, Math.sqrt(areas[i].open + 1) * 1.6) })) };
  }, [areas]);
  const fdot = plate?.dots.find((d) => d.a === focus) ?? plate?.dots[0];

  /* Fit the virtual canvas to the frame. */
  useEffect(() => {
    const el = stage.current?.closest<HTMLElement>(".bs-frame"); if (!el) return;
    const fit = () => {
      const t = el.clientWidth < 760; setTall(t);
      const Lx = t ? TALL : WIDE, headroom = t ? 220 : 210;
      setK(Math.min(el.clientWidth * 0.96 / Lx.W, (el.clientHeight - headroom) / Lx.H));
    };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Anchors in canvas units. */
  const c = (r: R): [number, number] => [r[0] + r[2] / 2, r[1] + r[3] / 2];
  const geo = useMemo(() => {
    const ph = L.phone, cs = L.case, wk = L.work, pr = L.profile, mp = L.map, ct = L.city, ev = L.ev;
    const mapPt: [number, number] = fdot && plate ? (() => { const [, , vw, vh] = plate.vb.split(" ").map(Number); const s = Math.min((mp[2] - 24) / vw, (mp[3] - 70) / vh); return [mp[0] + 12 + (fdot.x + 10) * s + ((mp[2] - 24) - vw * s) / 2, mp[1] + 52 + (fdot.y + 10) * s]; })() : c(mp);
    const bubble: R = tall ? [ph[0] + 10, ph[1] + 64, ph[2] - 30, 54] : [ph[0] + 14, ph[1] + 90, ph[2] - 50, 64];
    const flights: { seg: readonly [number, number]; from: R; to: R; bend: number; kind: string; label: string }[] = [
      { seg: T.f1, from: bubble, to: [cs[0] + 14, cs[1] + 44, cs[2] - 28, tall ? 44 : 56], bend: -0.35, kind: "case", label: "Brown dog, back leg bleeding" },
      { seg: T.f2, from: [cs[0] + 14, cs[1] + 44, cs[2] - 28, 44], to: [wk[0] + 12, wk[1] + (tall ? 44 : 58), wk[2] - 24, tall ? 30 : 44], bend: 0.4, kind: "row", label: `Leg wound · ${place}` },
      { seg: T.f3, from: [wk[0] + 12, wk[1] + 58, wk[2] - 24, 40], to: tall ? [ph[0] + 40, ph[1] + 190, ph[2] - 50, 40] : [ph[0] + 70, ph[1] + 300, ph[2] - 84, 46], bend: -0.3, kind: "reply", label: "A team is on the way." },
      { seg: T.f4, from: [wk[0] + 12, wk[1] + 58, wk[2] - 24, 40], to: [pr[0] + 12, pr[1] + (tall ? 130 : 178), pr[2] - 24, tall ? 26 : 34], bend: -0.45, kind: "hist", label: "Leg wound treated" },
      { seg: T.f5, from: [pr[0] + pr[2] / 2 - 9, pr[1] + pr[3] - 30, 18, 18], to: [mapPt[0] - 9, mapPt[1] - 9, 18, 18], bend: 0.5, kind: "dot", label: "" },
      { seg: T.f6, from: [mapPt[0] - 9, mapPt[1] - 9, 18, 18], to: [ct[0] + 12, ct[1] + (tall ? 50 : 66), ct[2] - 24, tall ? 22 : 30], bend: -0.4, kind: "pill", label: place },
      { seg: T.f7, from: [ct[0] + 12, ct[1] + ct[3] - 60, ct[2] - 24, 30], to: [ev[0] + 12, ev[1] + (tall ? 50 : 62), ev[2] - 24, tall ? 26 : 32], bend: 0.45, kind: "line", label: "Treated · recheck booked" },
    ];
    const ctr = (r: R): [number, number] => [r[0] + r[2] / 2, r[1] + r[3] / 2];
    const links = flights.map((f) => { const a = ctr(f.from), b = ctr(f.to), mx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * f.bend, my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * f.bend; return { d: `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`, a, b, m: [mx, my] as [number, number] }; });
    return { flights, links, mapPt, bubble };
  }, [L, tall, fdot, plate, place]);

  /* The frame: continuous motion straight to the DOM; discrete state through React, only on change. */
  const draw = useCallback((P: number) => {
    const r = Math.round(P * 100) / 100;
    setQq((v) => (v === r ? v : r));
    const root = stage.current; if (!root) return;
    /* custom properties restyle the whole subtree: write them only when they change */
    const vars: [string, number][] = [["--q", P], ["--gather", ease.inOut(span(P, T.gather[0], T.gather[1]))], ["--arrive", ease.out(span(P, T.arrive[0], T.arrive[1]))], ["--pulse", span(P, T.pulse[0], T.pulse[1])]];
    for (const [k, v] of vars) { const s = v.toFixed(3); if (written.current[k] !== s) { written.current[k] = s; root.style.setProperty(k, s); } }
    /* fragments spiral into the phone */
    const g = ease.inOut(span(P, T.gather[0], T.gather[1]));
    const ph = c(L.phone);
    if (!(g === 1 && written.current.frags === "1")) {
    fragRef.current?.querySelectorAll<HTMLElement>(".rq-frag").forEach((n, i) => {
      const [sx, sy] = SPOT[i]; const x0 = (sx / 100) * L.W, y0 = (sy / 100) * L.H;
      const gi = Math.max(0, Math.min(1, g * 1.4 - i * 0.03));
      const ang = (1 - gi) * 1.6 + i;
      const x = x0 + (ph[0] - x0) * gi + Math.sin(ang) * 40 * gi * (1 - gi), y = y0 + (ph[1] - y0) * gi + Math.cos(ang) * 40 * gi * (1 - gi);
      n.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) rotate(${((1 - gi) * ((i % 5) - 2) * 4).toFixed(1)}deg) scale(${(1 - gi * 0.75).toFixed(3)})`;
      n.style.opacity = String(gi > 0.96 ? 0 : 1);
    });
    written.current.frags = g === 1 ? "1" : "0"; }
    /* links draw as the thing travels along them */
    const segs = geo.flights.map((f) => span(P, f.seg[0], f.seg[1]));
    linksRef.current?.querySelectorAll<SVGPathElement>(".rq-link").forEach((n, i) => { n.style.strokeDashoffset = String(1 - segs[i]); });
    /* the one object: whichever flight is under way */
    const t = tok.current; if (!t) return;
    const i = segs.findIndex((s) => s > 0 && s < 1);
    if (i < 0) { t.style.opacity = "0"; return; }
    const f = geo.flights[i], s = ease.inOut(segs[i]), l = geo.links[i];
    const u = 1 - s, x = u * u * l.a[0] + 2 * u * s * l.m[0] + s * s * l.b[0], y = u * u * l.a[1] + 2 * u * s * l.m[1] + s * s * l.b[1];
    const w = f.from[2] + (f.to[2] - f.from[2]) * s, h = f.from[3] + (f.to[3] - f.from[3]) * s;
    t.style.opacity = "1";
    t.style.width = `${w}px`; t.style.height = `${h}px`;
    t.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${(Math.sin(s * Math.PI) * (f.bend > 0 ? 4 : -4)).toFixed(2)}deg) scale(${(1 + Math.sin(s * Math.PI) * 0.08).toFixed(3)})`;
    if (t.dataset.kind !== f.kind) t.dataset.kind = f.kind;
    if (t.textContent !== f.label) t.textContent = f.label;
  }, [L, geo]);

  useEffect(() => {
    if (still) { draw(1); return; }
    let raf = 0;
    const frame = () => {
      raf = 0;
      if (auto.current) {
        const P = Math.min(1, auto.current.from + (performance.now() - auto.current.t0) / 7000);
        draw(P);
        if (P >= 1) { auto.current = null; setPlaying(false); } else raf = requestAnimationFrame(frame);
        return;
      }
      draw(p.current);
    };
    const off = listen(() => { if (auto.current) return; if (!raf) raf = requestAnimationFrame(frame); });
    frame();
    playRef.current = () => { auto.current = { t0: performance.now(), from: 0.06 }; setPlaying(true); if (!raf) raf = requestAnimationFrame(frame); };
    return () => { off(); cancelAnimationFrame(raf); };
  }, [draw, listen, p, still]);
  /* A scroll stops a replay and hands the timeline back to the page. */
  useEffect(() => {
    if (!playing) return;
    const stop = () => { auto.current = null; setPlaying(false); };
    const t = window.setTimeout(() => { window.addEventListener("wheel", stop, { once: true, passive: true }); window.addEventListener("touchstart", stop, { once: true, passive: true }); }, 300);
    return () => { window.clearTimeout(t); window.removeEventListener("wheel", stop); window.removeEventListener("touchstart", stop); };
  }, [playing]);

  /* node n is lit once its flight has landed; node 0, the phone, once the message is sent */
  const LAND = [T.send[1], T.f1[1], T.f2[1], T.f4[1], T.f5[1], T.f6[1], T.f7[1]];
  const on = (n: number) => qq >= LAND[n];
  const step = LAND.reduce((v, at, i) => (qq >= at ? i : v), -1);
  const nodeCls = (n: number) => `rq-node${on(n) ? " is-on" : ""}${step === n ? " is-now" : ""}`;
  const replied = qq >= T.f3[1];
  const box = (r: R) => ({ left: r[0], top: r[1], width: r[2], height: r[3] });

  return (
    <div className={`rq${tall ? " is-tall" : ""}${playing ? " is-playing" : ""}`}>
      <header className="rq-head" data-phase={qq < T.gather[1] - 0.02 ? "a" : qq < T.pulse[0] ? "b" : "c"}>
        <h2 className="rq-say" aria-live="polite">
          <span className="is-a">Today, one rescue lives in <em>twelve places.</em></span>
          <span className="is-b">On StrayPaw it starts with <em>one message.</em></span>
          <span className="is-c">One report. <em>The whole system responds.</em></span>
        </h2>
        <button type="button" className="rq-play" onClick={() => playRef.current()} disabled={still}>
          {playing ? <RotateCcw size={15} aria-hidden /> : <Play size={15} aria-hidden />}{playing ? "Playing" : "Play the chain"}
        </button>
      </header>

      <div className="rq-fit" style={{ width: L.W * k, height: L.H * k }}>
        <div className="rq-canvas" ref={stage} style={{ width: L.W, height: L.H, transform: `scale(${k})` }}>
          <svg className="rq-links" viewBox={`0 0 ${L.W} ${L.H}`} aria-hidden>
            <g ref={linksRef}>{geo.links.map((l, i) => <path key={i} d={l.d} pathLength={1} className={`rq-link${on(i + 1) ? " is-done" : ""}`} />)}</g>
            {geo.links.map((l, i) => <circle key={`p${i}`} r="5" className="rq-spark" style={{ offsetPath: `path("${l.d}")`, ["--d" as string]: `${i * 0.12}s` } as CSSProperties} />)}
          </svg>

          <div className="rq-frags" ref={fragRef} aria-hidden>
            {FRAGS.map((f, i) => <span key={i} className={`rq-frag is-${f.k}`}>{f.t}</span>)}
          </div>

          {/* The resident's phone */}
          <section className={`${nodeCls(0)} rq-phone is-from-l`} style={box(L.phone)} aria-label="WhatsApp, an example conversation">
            <header><i>SP</i><span><b>StrayPaw Rescue</b><small>WhatsApp · example</small></span></header>
            <ol>
              <li className={`is-them${qq >= T.send[0] ? " is-in" : ""} rq-first`}><p>Hi, there&rsquo;s a brown dog near the bus stand. Its back leg is bleeding.</p><small>8:42</small></li>
              <li className={`is-them${qq >= T.send[0] + 0.01 ? " is-in" : ""}`}><p className="rq-photo"><Camera size={13} aria-hidden /> Photo · may show an injury</p></li>
              <li className={`is-them${qq >= T.send[0] + 0.02 ? " is-in" : ""}`}><p className="rq-pin"><MapPin size={13} aria-hidden /> {place}</p></li>
              <li className={`is-us${replied ? " is-in" : ""}`}><p>A team is on the way.</p><small>8:51 <CheckCheck size={12} aria-hidden /></small></li>
            </ol>
          </section>

          {/* The case */}
          <section className={`${nodeCls(1)} rq-case is-from-t`} style={box(L.case)} aria-label="The case">
            <p className="rq-tag"><span className={on(1) ? "is-urgent" : ""}>{on(1) ? "Urgent" : "Waiting"}</span><code>{on(1) ? "Case SP-24117" : "No case yet"}</code></p>
            <b className="rq-big">{on(1) ? "Brown dog, back leg bleeding" : ""}</b>
            <dl>
              <div className={on(1) ? "is-on" : ""}><dt>Place</dt><dd>{place} · area</dd></div>
              <div className={on(1) ? "is-on" : ""}><dt>Photo</dt><dd>1, veiled</dd></div>
              <div className={on(2) ? "is-on" : ""}><dt>Held by</dt><dd>{on(2) ? "Field team" : "Nobody yet"}</dd></div>
              <div className={on(3) ? "is-on" : ""}><dt>Next</dt><dd>{on(3) ? "Recheck Friday" : "Not yet"}</dd></div>
            </dl>
          </section>

          {/* The team's queue */}
          <section className={`${nodeCls(2)} rq-work is-from-b`} style={box(L.work)} aria-label="The NGO workspace queue">
            <p className="rq-h"><b>Today&rsquo;s work</b><small>NGO workspace</small></p>
            <ol>
              {on(2) && <li className="is-new is-crit"><b>Leg wound</b><span>{place}</span><em>Field team</em></li>}
              <li className="is-crit"><b>Road accident</b><span>Waiting</span><em>2d</em></li>
              <li><b>Skin infection</b><span>Waiting</span><em>3d</em></li>
              <li><b>Recheck due</b><span>Today</span><em>Vet</em></li>
              {!tall && <li><b>Feeding point</b><span>Weekly</span><em>Vol.</em></li>}
            </ol>
          </section>

          {/* The animal */}
          <section className={`${nodeCls(3)} rq-profile is-from-tr`} style={box(L.profile)} aria-label="The animal's history, an example">
            <p className="rq-who"><i aria-hidden /><span><b>SP-D-7KQ2</b><small>Male · adult · example</small></span></p>
            <ol>
              <li><time>Mar 2025</time>First seen</li>
              <li><time>Aug 2025</time>Sterilised</li>
              {on(3) && <li className="is-new"><time>Today</time>Leg wound treated</li>}
              {on(3) && <li className="is-next"><time>Friday</time>Recheck</li>}
            </ol>
          </section>

          {/* The map: real areas */}
          <section className={`${nodeCls(4)} rq-map is-from-z`} style={box(L.map)} aria-label={`Recorded areas in ${city}`}>
            <p className="rq-h"><b>{city}</b><small>{areas.length ? `${fmt(areas.length)} areas · live` : "live"}</small></p>
            {plate && (
              <svg viewBox={plate.vb} preserveAspectRatio="xMidYMin meet" aria-hidden>
                {plate.dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} className={d.a.crit ? "is-crit" : d.a.open ? "is-open" : ""} />)}
                {fdot && on(4) && <><circle cx={fdot.x} cy={fdot.y} r={9} className="rq-hit" /><circle cx={fdot.x} cy={fdot.y} r={9} className="rq-ripple" /><circle cx={fdot.x} cy={fdot.y} r={9} className="rq-ripple is-2" /></>}
              </svg>
            )}
          </section>

          {/* The city: live figures by locality */}
          <section className={`${nodeCls(5)} rq-city is-from-r`} style={box(L.city)} aria-label={`Open requests by locality in ${city}, live`}>
            <p className="rq-h"><b>Open requests</b><small>by locality · live</small></p>
            <ol>
              {top.map(([name, n]) => (
                <li key={name} className={on(5) && name === place ? "is-hit" : ""}><span>{name}</span><b>{fmt(n)}</b><i style={{ width: `${(n / maxTop) * 100}%` }} /></li>
              ))}
            </ol>
          </section>

          {/* The evidence */}
          <section className={`${nodeCls(6)} rq-ev is-from-br`} style={box(L.ev)} aria-label="Evidence of work, an example">
            <p className="rq-h"><b>Evidence of work</b><small>example</small></p>
            <ol>
              <li className={on(1) ? "is-on" : ""}>Report received <time>8:42</time></li>
              <li className={on(2) ? "is-on" : ""}>Owner assigned <time>8:51</time></li>
              <li className={on(3) ? "is-on" : ""}>Treated <time>13:10</time></li>
              <li className={on(6) ? "is-on" : ""}>Recheck booked <time>Fri</time></li>
            </ol>
            <span className={`rq-stamp${on(6) ? " is-on" : ""}`} aria-hidden>On the record</span>
          </section>

          <div className="rq-tok" ref={tok} aria-hidden />
        </div>
      </div>

      <ol className="rq-steps" aria-label="The chain">
        {STEPS.map((s, i) => <li key={s} className={step > i ? "is-done" : step === i ? "is-now" : ""}>{s}</li>)}
      </ol>
    </div>
  );
}
