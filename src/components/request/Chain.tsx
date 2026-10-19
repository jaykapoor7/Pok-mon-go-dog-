"use client";

/* ════════════════════════════════════════════════════════════════════
   02 · One Request. Press Send, and watch the system respond.

   It opens on how a rescue lives today: a dozen scraps of one animal's
   story in chats, sheets and calls, which spiral into one phone. There a
   resident's report is typed and waiting. Press Send (or simply keep
   scrolling) and one message sets off a chain reaction along a stitched
   line: it unfolds into a case; the case drops into a team's queue; a
   reply flies back to the resident; care is written into the animal's
   history; the history drops a mark on the map; the mark lights its
   locality in the city's live figures; the record becomes evidence.
   Each card lights as the message reaches it, and a pulse runs through
   the whole system at the end.

   One object travels the whole way and changes shape at every stop.
   Two drivers share one timeline: the scroll (it plays backwards too)
   and Send, which plays it through on its own and can be replayed. The
   conversation, case and animal are an example and say so; the map's
   areas and the city's figures are live.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Camera, CheckCheck, MapPin, RotateCcw, SendHorizontal } from "lucide-react";
import { useStage, span, ease } from "@/components/bindu/stage";
import { DOG_ART } from "@/lib/art/sources";

export type Area = { ring: number[]; open: number; crit: number; name: string };
type R = [number, number, number, number];
type Layout = { W: number; H: number; phone: R; case: R; work: R; profile: R; map: R; city: R; ev: R };

const WIDE: Layout = { W: 1520, H: 840, phone: [30, 60, 300, 660], case: [420, 30, 340, 250], work: [420, 340, 340, 340], profile: [850, 30, 300, 310], map: [850, 390, 300, 290], city: [1220, 30, 280, 310], ev: [1220, 390, 280, 290] };
const TALL: Layout = { W: 400, H: 900, phone: [10, 8, 186, 392], case: [206, 8, 184, 172], work: [206, 192, 184, 208], profile: [10, 414, 186, 226], map: [210, 414, 180, 226], city: [10, 654, 186, 238], ev: [210, 654, 180, 238] };

/* Scraps of one rescue, before: where the work lives today (examples). */
const FRAGS = [
  { t: "Fwd: dog near bus stand, bleeding??", k: "chat" }, { t: "Who is taking this one?", k: "chat" }, { t: "Sheet3: Gandhipuram | ? | ?", k: "sheet" },
  { t: "vet_bill_0412.jpg", k: "file" }, { t: "Same dog as last week?", k: "chat" }, { t: "Missed call (3)", k: "call" },
  { t: "Is he sterilised? Nobody knows", k: "chat" }, { t: "Shared location", k: "pin" }, { t: "Volunteers group 2: 46 unread", k: "chat" },
  { t: "Ward office: report by Friday", k: "mail" }, { t: "rescues_FINAL_v3.xlsx", k: "sheet" }, { t: "Recheck? Which dog?", k: "chat" },
];
const SPOT: [number, number][] = [[8, 8], [32, 4], [56, 9], [80, 6], [93, 22], [88, 50], [94, 78], [70, 92], [44, 88], [16, 92], [4, 62], [8, 36]];
const MSG = "Hi, there's a brown dog near the bus stand. Its back leg is bleeding.";

/* The timeline. Below `send` the scroll leads; Send plays from there to the end on its own. */
const T = { gather: [0.04, 0.17], arrive: [0.12, 0.22], type: [0.2, 0.26], send: [0.28, 0.31], f1: [0.31, 0.38], f2: [0.39, 0.45], f3: [0.45, 0.49], f4: [0.5, 0.56], f5: [0.58, 0.64], f6: [0.67, 0.73], f7: [0.76, 0.82], pulse: [0.86, 1] } as const;
const STEPS = ["Message", "Case", "Workspace", "History", "Map", "City", "Evidence"];
const SAY = ["It becomes a case.", "A team takes it on.", "The resident hears back.", "The animal’s history grows.", "The map updates.", "The city sees it.", "It becomes evidence."];
const DUR = 6400;
const fmt = (n: number) => n.toLocaleString("en-IN");

export function Chain({ areas, city }: { areas: Area[]; city: string }) {
  const { p, listen, still } = useStage();
  const stage = useRef<HTMLDivElement>(null), tok = useRef<HTMLDivElement>(null), linksRef = useRef<SVGGElement>(null), fragRef = useRef<HTMLDivElement>(null);
  const [tall, setTall] = useState(false);
  const [k, setK] = useState(1);
  const [qq, setQq] = useState(still ? 1 : 0);
  const [mode, setMode] = useState<"scroll" | "auto">("scroll");
  const auto = useRef<{ t0: number; from: number } | null>(null);
  const kick = useRef<() => void>(() => {});
  const written = useRef<Record<string, string>>({});
  const L = tall ? TALL : WIDE;

  /* the focus: the locality with the most open requests on the live record */
  const focus = useMemo(() => [...areas].sort((a, b) => b.open - a.open || b.crit - a.crit)[0] ?? null, [areas]);
  const place = focus?.name || "the bus stand";
  const top = useMemo(() => {
    const by = new Map<string, number>();
    for (const a of areas) if (a.name) by.set(a.name, (by.get(a.name) ?? 0) + a.open);
    return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [areas]);
  const maxTop = Math.max(1, ...top.map((x) => x[1]));

  /* the map card: the city's real areas, round, projected into the card */
  const plate = useMemo(() => {
    if (!areas.length) return null;
    const pts = areas.map((a) => { let x = 0, y = 0; const n = a.ring.length / 2; for (let i = 0; i < a.ring.length; i += 2) { x += a.ring[i]; y += a.ring[i + 1]; } return [x / n, y / n] as [number, number]; });
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const w = Math.min(...xs), e = Math.max(...xs), s = Math.min(...ys), n = Math.max(...ys), kx = Math.cos(((s + n) / 2) * Math.PI / 180);
    const sc = 260 / Math.max((e - w) * kx, n - s, 0.001);
    return { vb: `-10 -10 ${((e - w) * kx * sc + 20).toFixed(0)} ${((n - s) * sc + 20).toFixed(0)}`, dots: pts.map(([x, y], i) => ({ x: (x - w) * kx * sc, y: (n - y) * sc, a: areas[i], r: 3.2 + Math.min(5, Math.sqrt(areas[i].open + 1) * 1.6) })) };
  }, [areas]);
  const fdot = plate?.dots.find((d) => d.a === focus) ?? plate?.dots[0];

  /* fit the virtual canvas to the frame */
  useEffect(() => {
    const el = stage.current?.closest<HTMLElement>(".bs-frame"); if (!el) return;
    const fit = () => {
      const t = el.clientWidth < 760; setTall(t);
      const Lx = t ? TALL : WIDE, headroom = t ? 196 : 200;
      setK(Math.min((el.clientWidth * 0.96) / Lx.W, (el.clientHeight - headroom) / Lx.H));
    };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* anchors, in canvas units */
  const c = (r: R): [number, number] => [r[0] + r[2] / 2, r[1] + r[3] / 2];
  const geo = useMemo(() => {
    const ph = L.phone, cs = L.case, wk = L.work, pr = L.profile, mp = L.map, ct = L.city, ev = L.ev;
    const mapPt: [number, number] = fdot && plate ? (() => { const [, , vw, vh] = plate.vb.split(" ").map(Number); const s = Math.min((mp[2] - 24) / vw, (mp[3] - 70) / vh); return [mp[0] + 12 + (fdot.x + 10) * s + ((mp[2] - 24) - vw * s) / 2, mp[1] + 52 + (fdot.y + 10) * s]; })() : c(mp);
    const bubble: R = tall ? [ph[0] + 10, ph[1] + 60, ph[2] - 28, 56] : [ph[0] + 14, ph[1] + 86, ph[2] - 50, 70];
    const flights: { seg: readonly [number, number]; from: R; to: R; bend: number; kind: string; label: string }[] = [
      { seg: T.f1, from: bubble, to: [cs[0] + 14, cs[1] + 44, cs[2] - 28, tall ? 44 : 56], bend: -0.35, kind: "case", label: "Brown dog, back leg bleeding" },
      { seg: T.f2, from: [cs[0] + 14, cs[1] + 44, cs[2] - 28, 44], to: [wk[0] + 12, wk[1] + (tall ? 44 : 58), wk[2] - 24, tall ? 30 : 44], bend: 0.4, kind: "row", label: `Leg wound · ${place}` },
      { seg: T.f3, from: [wk[0] + 12, wk[1] + 58, wk[2] - 24, 40], to: tall ? [ph[0] + 40, ph[1] + 200, ph[2] - 50, 40] : [ph[0] + 80, ph[1] + 330, ph[2] - 94, 46], bend: -0.3, kind: "reply", label: "A team is on the way." },
      { seg: T.f4, from: [wk[0] + 12, wk[1] + 58, wk[2] - 24, 40], to: [pr[0] + 12, pr[1] + (tall ? 138 : 188), pr[2] - 24, tall ? 26 : 34], bend: -0.45, kind: "hist", label: "Leg wound treated" },
      { seg: T.f5, from: [pr[0] + pr[2] / 2 - 9, pr[1] + pr[3] - 30, 18, 18], to: [mapPt[0] - 9, mapPt[1] - 9, 18, 18], bend: 0.5, kind: "dot", label: "" },
      { seg: T.f6, from: [mapPt[0] - 9, mapPt[1] - 9, 18, 18], to: [ct[0] + 12, ct[1] + (tall ? 50 : 66), ct[2] - 24, tall ? 22 : 30], bend: -0.4, kind: "pill", label: place },
      { seg: T.f7, from: [ct[0] + 12, ct[1] + ct[3] - 60, ct[2] - 24, 30], to: [ev[0] + 12, ev[1] + (tall ? 50 : 62), ev[2] - 24, tall ? 26 : 32], bend: 0.45, kind: "line", label: "Treated · recheck booked" },
    ];
    const ctr = (r: R): [number, number] => [r[0] + r[2] / 2, r[1] + r[3] / 2];
    const links = flights.map((f) => { const a = ctr(f.from), b = ctr(f.to), mx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * f.bend, my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * f.bend; return { d: `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`, a, b, m: [mx, my] as [number, number] }; });
    return { flights, links };
  }, [L, tall, fdot, plate, place]);

  /* the frame: continuous motion straight to the DOM; discrete state through React, only on change */
  const draw = useCallback((P: number) => {
    const r = Math.round(P * 100) / 100;
    setQq((v) => (v === r ? v : r));
    const root = stage.current; if (!root) return;
    const vars: [string, number][] = [["--gather", ease.inOut(span(P, T.gather[0], T.gather[1]))], ["--arrive", ease.out(span(P, T.arrive[0], T.arrive[1]))], ["--pulse", span(P, T.pulse[0], T.pulse[1])]];
    for (const [key, v] of vars) { const s = v.toFixed(3); if (written.current[key] !== s) { written.current[key] = s; root.style.setProperty(key, s); } }
    /* scraps spiral into the phone */
    const g = ease.inOut(span(P, T.gather[0], T.gather[1])), ph = c(L.phone);
    if (!(g === 1 && written.current.frags === "1")) {
      fragRef.current?.querySelectorAll<HTMLElement>(".cv-frag").forEach((n, i) => {
        const [sx, sy] = SPOT[i], x0 = (sx / 100) * L.W, y0 = (sy / 100) * L.H, gi = Math.max(0, Math.min(1, g * 1.4 - i * 0.03)), ang = (1 - gi) * 1.6 + i;
        const x = x0 + (ph[0] - x0) * gi + Math.sin(ang) * 40 * gi * (1 - gi), y = y0 + (ph[1] - y0) * gi + Math.cos(ang) * 40 * gi * (1 - gi);
        n.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) rotate(${((1 - gi) * ((i % 5) - 2) * 5).toFixed(1)}deg) scale(${(1 - gi * 0.75).toFixed(3)})`;
        n.style.opacity = String(gi > 0.96 ? 0 : 1);
      });
      written.current.frags = g === 1 ? "1" : "0";
    }
    /* the message being typed */
    const typed = Math.round(MSG.length * span(P, T.type[0], T.type[1]));
    const tk = P >= T.send[0] ? "sent" : String(typed), tx = root.querySelector<HTMLElement>(".cv-typed");
    if (tx && written.current.typed !== tk) { written.current.typed = tk; tx.textContent = tk === "sent" ? "" : MSG.slice(0, typed); }
    /* vines grow as the message travels along them; leaves open behind it */
    const segs = geo.flights.map((f) => span(P, f.seg[0], f.seg[1]));
    linksRef.current?.querySelectorAll<SVGPathElement>(".cv-vine, .cv-vine-gap").forEach((n) => { const i = Number(n.dataset.i); n.style.strokeDashoffset = String(1 - segs[i]); });
    /* the one object, wherever it is */
    const t = tok.current; if (!t) return;
    const i = segs.findIndex((s) => s > 0 && s < 1);
    if (i < 0) { if (t.style.opacity !== "0") t.style.opacity = "0"; return; }
    const f = geo.flights[i], s = ease.inOut(segs[i]), l = geo.links[i];
    const u = 1 - s, x = u * u * l.a[0] + 2 * u * s * l.m[0] + s * s * l.b[0], y = u * u * l.a[1] + 2 * u * s * l.m[1] + s * s * l.b[1];
    const w = f.from[2] + (f.to[2] - f.from[2]) * s, h = f.from[3] + (f.to[3] - f.from[3]) * s;
    t.style.opacity = "1"; t.style.width = `${w}px`; t.style.height = `${h}px`;
    t.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${(Math.sin(s * Math.PI) * (f.bend > 0 ? 5 : -5)).toFixed(2)}deg) scale(${(1 + Math.sin(s * Math.PI) * 0.1).toFixed(3)})`;
    if (t.dataset.kind !== f.kind) t.dataset.kind = f.kind;
    if (t.textContent !== f.label) t.textContent = f.label;
  }, [L, geo]);

  /* two drivers, one timeline */
  useEffect(() => {
    if (still) { draw(1); return; }
    let raf = 0;
    const frame = () => {
      raf = 0;
      const a = auto.current;
      if (a) {
        const P = Math.min(1, a.from + ((performance.now() - a.t0) / DUR) * (1 - a.from));
        draw(P); if (P < 1) raf = requestAnimationFrame(frame);
        return;
      }
      draw(p.current);
    };
    const off = listen(() => {
      /* leaving the section hands the timeline back to the scroll */
      if (auto.current && (p.current <= 0.01 || p.current >= 0.995)) { auto.current = null; setMode("scroll"); }
      if (auto.current) return;
      if (!raf) raf = requestAnimationFrame(frame);
    });
    frame();
    kick.current = () => { if (!raf) raf = requestAnimationFrame(frame); };
    return () => { off(); cancelAnimationFrame(raf); };
  }, [draw, listen, p, still]);

  const send = () => {
    if (still) return;
    auto.current = { t0: performance.now(), from: T.send[0] }; setMode("auto"); kick.current();
  };
  const replay = () => { if (still) return; auto.current = { t0: performance.now(), from: T.send[0] }; setMode("auto"); kick.current(); };

  const LAND = [T.send[1], T.f1[1], T.f2[1], T.f4[1], T.f5[1], T.f6[1], T.f7[1]];
  const on = (n: number) => qq >= LAND[n];
  const step = LAND.reduce((v, at, i) => (qq >= at ? i : v), -1);
  const nodeCls = (n: number) => `cv-node${on(n) ? " is-on" : ""}${step === n ? " is-now" : ""}`;
  const replied = qq >= T.f3[1];
  const sent = qq >= T.send[0];
  const ready = qq >= T.type[1] - 0.01 && !sent;
  const phase = qq < T.gather[1] - 0.01 ? "a" : !sent ? "b" : qq < T.pulse[0] ? "c" : "d";
  const box = (r: R) => ({ left: r[0], top: r[1], width: r[2], height: r[3] });
  const live = phase === "c" ? SAY[Math.max(0, Math.min(SAY.length - 1, step))] : "";

  return (
    <div className={`cv${tall ? " is-tall" : ""}${mode === "auto" ? " is-auto" : ""}`} data-phase={phase}>
      <header className="cv-head">
        <div className="cv-say">
          <h2>
            <span className="is-a">Today, one rescue lives in <em>twelve places.</em></span>
            <span className="is-b">On StrayPaw it starts with <em>one message.</em></span>
            <span className="is-c">Watch the system <em>respond.</em></span>
            <span className="is-d">One report. <em>The whole system responds.</em></span>
          </h2>
          <p className="cv-sub">
            <span className="is-a">Chats, sheets, calls and notebooks. Nobody owns it, and the next person starts from nothing.</span>
            <span className="is-b">Press Send. The conversation is an example; everything it touches is what StrayPaw does.</span>
            <span className="is-c" aria-live="polite">{live}</span>
            <span className="is-d">Case, team, reply, history, map, city, evidence. One record, kept.</span>
          </p>
        </div>
        <button type="button" className="cv-replay" onClick={replay} disabled={still || !sent} aria-label="Replay the chain from the message">
          <RotateCcw size={15} aria-hidden />Replay
        </button>
      </header>

      <div className="cv-fit" style={{ width: L.W * k, height: L.H * k }}>
        <div className="cv-canvas" ref={stage} style={{ width: L.W, height: L.H, transform: `scale(${k})` }}>
          <svg className="cv-links" viewBox={`0 0 ${L.W} ${L.H}`} aria-hidden>
            <g ref={linksRef}>
              {geo.links.map((l, i) => <path key={`v${i}`} d={l.d} pathLength={1} data-i={i} className="cv-vine" />)}
              {geo.links.map((l, i) => <path key={`g${i}`} d={l.d} pathLength={1} data-i={i} className="cv-vine-gap" />)}
              {geo.links.map((l, i) => <circle key={`n${i}`} cx={l.b[0]} cy={l.b[1]} r={7} className={`cv-node-dot${on(i + 1) ? " is-on" : ""}`} />)}
            </g>
            {geo.links.map((l, i) => <circle key={`p${i}`} r="5" className="cv-spark" style={{ offsetPath: `path("${l.d}")` } as CSSProperties} />)}
          </svg>

          <div className="cv-frags" ref={fragRef} aria-hidden>
            {FRAGS.map((f, i) => <span key={i} className={`cv-frag is-${f.k}`}>{f.t}</span>)}
          </div>

          {/* the resident's phone: a report, typed and waiting */}
          <section className={`${nodeCls(0)} cv-phone is-from-l`} style={box(L.phone)} aria-label="WhatsApp, an example conversation">
            <header><i>SP</i><span><b>StrayPaw Rescue</b><small>WhatsApp · example</small></span></header>
            <ol>
              <li className={`is-them${sent ? " is-in" : ""}`}><p>{MSG}</p><small>8:42</small></li>
              <li className={`is-them${sent ? " is-in" : ""}`}><p className="cv-photo"><Camera size={13} aria-hidden /> Photo · may show an injury</p></li>
              <li className={`is-them${sent ? " is-in" : ""}`}><p className="cv-pin"><MapPin size={13} aria-hidden /> {place}</p></li>
              <li className={`is-us${replied ? " is-in" : ""}`}><p>A team is on the way.</p><small>8:51 <CheckCheck size={12} aria-hidden /></small></li>
            </ol>
            <div className={`cv-compose${sent ? " is-sent" : ""}${ready ? " is-ready" : ""}`}>
              <div className="cv-field"><span className="cv-typed" />{!sent && <i className="cv-caret" aria-hidden />}<span className="cv-chips"><em><Camera size={11} aria-hidden /> 1</em><em><MapPin size={11} aria-hidden /> {place}</em></span></div>
              <button type="button" className="cv-send" onClick={send} disabled={still || sent} aria-label="Send the example report and watch StrayPaw respond">
                <SendHorizontal size={tall ? 16 : 20} aria-hidden />
              </button>
              {ready && mode === "scroll" && <span className="cv-hint" aria-hidden>Press Send</span>}
            </div>
          </section>

          <section className={`${nodeCls(1)} cv-case is-from-t`} style={box(L.case)} aria-label="The case">
            <p className="cv-tag"><span className={on(1) ? "is-urgent" : ""}>{on(1) ? "Urgent" : "Waiting"}</span><code>{on(1) ? "Case SP-24117 · example" : "No case yet"}</code></p>
            <b className="cv-big">{on(1) ? "Brown dog, back leg bleeding" : ""}</b>
            <dl>
              <div className={on(1) ? "is-on" : ""}><dt>Place</dt><dd>{place} · area</dd></div>
              <div className={on(1) ? "is-on" : ""}><dt>Photo</dt><dd>1, veiled</dd></div>
              <div className={on(2) ? "is-on" : ""}><dt>Held by</dt><dd>{on(2) ? "Field team" : "Nobody yet"}</dd></div>
              <div className={on(3) ? "is-on" : ""}><dt>Next</dt><dd>{on(3) ? "Recheck Friday" : "Not yet"}</dd></div>
            </dl>
          </section>

          <section className={`${nodeCls(2)} cv-work is-from-b`} style={box(L.work)} aria-label="The NGO workspace queue">
            <p className="cv-h"><b>Today&rsquo;s work</b><small>NGO workspace</small></p>
            <ol>
              {on(2) && <li className="is-new is-crit"><b>Leg wound</b><span>{place}</span><em>Field team</em></li>}
              <li className="is-crit"><b>Road accident</b><span>Waiting</span><em>2d</em></li>
              <li><b>Skin infection</b><span>Waiting</span><em>3d</em></li>
              <li><b>Recheck due</b><span>Today</span><em>Vet</em></li>
              {!tall && <li><b>Feeding point</b><span>Weekly</span><em>Vol.</em></li>}
            </ol>
          </section>

          <section className={`${nodeCls(3)} cv-profile is-from-tr`} style={box(L.profile)} aria-label="The animal's history, an example">
            <p className="cv-who">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={DOG_ART[3].src} alt="" style={{ background: DOG_ART[3].ground }} /><span><b>SP-D-7KQ2</b><small>Male · adult · example</small></span></p>
            <ol>
              <li><time>Mar 2025</time>First seen</li>
              <li><time>Aug 2025</time>Sterilised</li>
              {on(3) && <li className="is-new"><time>Today</time>Leg wound treated</li>}
              {on(3) && <li className="is-next"><time>Friday</time>Recheck</li>}
            </ol>
          </section>

          <section className={`${nodeCls(4)} cv-map is-from-z`} style={box(L.map)} aria-label={`Recorded areas in ${city}`}>
            <p className="cv-h"><b>{city}</b><small>{areas.length ? `${fmt(areas.length)} areas · live` : "live"}</small></p>
            {plate && (
              <svg viewBox={plate.vb} preserveAspectRatio="xMidYMin meet" aria-hidden>
                {plate.dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} className={d.a.crit ? "is-crit" : d.a.open ? "is-open" : ""} />)}
                {fdot && on(4) && <><circle cx={fdot.x} cy={fdot.y} r={9} className="cv-hit" /><circle cx={fdot.x} cy={fdot.y} r={9} className="cv-ripple" /><circle cx={fdot.x} cy={fdot.y} r={9} className="cv-ripple is-2" /></>}
              </svg>
            )}
          </section>

          <section className={`${nodeCls(5)} cv-city is-from-r`} style={box(L.city)} aria-label={`Open requests by locality in ${city}, live`}>
            <p className="cv-h"><b>Open requests</b><small>by locality · live</small></p>
            <ol>
              {top.map(([name, n]) => (
                <li key={name} className={on(5) && name === place ? "is-hit" : ""}><span>{name}</span><b>{fmt(n)}</b><i style={{ width: `${(n / maxTop) * 100}%` }} /></li>
              ))}
            </ol>
          </section>

          <section className={`${nodeCls(6)} cv-ev is-from-br`} style={box(L.ev)} aria-label="Evidence of work, an example">
            <p className="cv-h"><b>Evidence of work</b><small>example</small></p>
            <ol>
              <li className={on(1) ? "is-on" : ""}>Report received <time>8:42</time></li>
              <li className={on(2) ? "is-on" : ""}>Owner assigned <time>8:51</time></li>
              <li className={on(3) ? "is-on" : ""}>Treated <time>13:10</time></li>
              <li className={on(6) ? "is-on" : ""}>Recheck booked <time>Fri</time></li>
            </ol>
            <span className={`cv-stamp${on(6) ? " is-on" : ""}`} aria-hidden>On the record</span>
          </section>

          <div className="cv-tok" ref={tok} aria-hidden />
        </div>
      </div>

      <ol className="cv-steps" aria-label="The chain">
        {STEPS.map((s, i) => <li key={s} className={step > i ? "is-done" : step === i ? "is-now" : ""}>{s}</li>)}
      </ol>
      <ol className="sr-only">
        <li>A resident sends a WhatsApp report with a photo and a place (an example).</li>
        <li>It becomes a rescue case with an urgency and a place.</li>
        <li>The case enters an NGO workspace queue and a field team takes it on.</li>
        <li>The resident gets a reply: a team is on the way.</li>
        <li>The treatment is written into the animal&rsquo;s persistent history.</li>
        <li>The record adds a mark to the map of {city}, whose areas are live.</li>
        <li>The locality&rsquo;s open requests update in the city&rsquo;s live figures.</li>
        <li>Each step is kept as evidence of work.</li>
      </ol>
    </div>
  );
}
