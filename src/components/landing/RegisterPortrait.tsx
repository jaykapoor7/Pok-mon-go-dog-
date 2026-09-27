"use client";

/* ════════════════════════════════════════════════════════════════════
   The register, in portraits: every animal on the public record as one
   point of light, and the photographed ones opening into their files.

   Each city is a tower of marks, one per animal, tallest first, so the
   whole register stands like a skyline on the night ground. Inside each
   tower the marks settle in layers by what is known: the animals needing
   help at the foot in flame, then the ones whose sterilisation has been
   examined in blue, then, faint, the ones nobody has examined yet. The
   photographed animals glint in cream among them, wherever their record
   put them.

   One at a time, a photographed animal's mark opens: a ring finds it, a
   thread runs from it, and its portrait and file come up beside the
   skyline (where, since when, how often seen, what it was reported for,
   what is known and what is not). The lenses above light one kind of
   mark at a time. Hovering a tower names its city and its counts.

   Nothing finer than a city leaves the server; no place, no person.
   Under reduced motion the towers stand without rising and the tour
   moves only when asked.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";
import type { RegisterPortrait as Data, PortraitPhoto } from "@/lib/landing/story";

type Lens = "all" | "help" | "unexamined" | "photo";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const date = (iso: string | null) => { if (!iso) return null; const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const fmt = (n: number) => n.toLocaleString("en-IN");
const labelOf = (p: PortraitPhoto) => (p.name && p.name.trim()) || `A dog near ${cleanPlace(p.zone) || p.city || "the reported spot"}`;
type Check = "yes" | "no" | "unknown";
const checkOf = (v: string | null): Check => { const s = (v ?? "").toLowerCase(); return ["yes", "true", "sterilised", "sterilized", "vaccinated", "done"].includes(s) ? "yes" : ["no", "false", "not_sterilised", "not_vaccinated", "intact"].includes(s) ? "no" : "unknown"; };
const CHECK_TEXT: Record<Check, string> = { yes: "Recorded", no: "Recorded as not done", unknown: "Not examined" };
const HOLD = 6500;

/* The marks' colours on the night ground: attention, examined (two
   blues), not examined, and the photographed animals' cream. */
const COL = { help: "240,91,64", ster: "143,183,255", notster: "91,130,220", none: "239,231,218", photo: "255,244,224" };

type Group = { name: string; n: number; help: number; examined: number; photos: number; members: number[]; cx: number; cy: number; R: number; spin: number };
type Layout = { c: number; m: number; groups: Group[]; rad: Float32Array; ang: Float32Array; grp: Uint8Array };

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/* The places: the largest each stand alone, the rest share one. Each is a
   sunflower of its own marks, one per animal, laid from the centre out:
   needing help at the core, then examined, then never examined at the
   rim, so every place reads as a share drawn outward. The flowers are
   packed together, the largest first, into the space left of the file. */
function layout(data: Data, W: number, H: number, phone: boolean): Layout {
  const keep = phone ? 7 : 15;
  const groups: Group[] = [];
  let k = 0;
  data.cities.forEach((c, ci) => {
    const members = Array.from({ length: c.n }, (_, j) => k + j);
    k += c.n;
    if (ci < keep || data.cities.length === keep + 1) groups.push({ ...c, members, cx: 0, cy: 0, R: 0, spin: 0 });
    else {
      const o = groups[keep] ?? (groups[keep] = { name: "", n: 0, help: 0, examined: 0, photos: 0, members: [], cx: 0, cy: 0, R: 0, spin: 0 });
      o.n += c.n; o.help += c.help; o.examined += c.examined; o.photos += c.photos; o.members.push(...members);
    }
  });
  if (groups[keep]) groups[keep].name = `${data.cities.length - keep} other places`;
  const rank = (i: number) => { const ch = data.marks[i]; return ch !== ch.toLowerCase() ? 0 : ch === "a" ? 2 : 1; };
  for (const g of groups) g.members.sort((x, y) => rank(x) - rank(y) || x - y);

  /* Pack in unit spacing: each flower's radius is sqrt(n), plus room for
     its name; each new one takes the first free place on a spiral out
     from the first. */
  /* Each flower keeps room for its name: estimate the final scale first,
     then pad every flower by its label's size in those units. */
  groups.forEach((g, gi) => { g.R = Math.sqrt(g.n) + 0.8; g.spin = gi % 2 ? -1 : 1; });
  const cEst = Math.sqrt((0.42 * W * H) / (Math.PI * groups.reduce((t, g) => t + g.R * g.R, 0)));
  const labW = (phone ? 34 : 46) / cEst, labH = (phone ? 26 : 32) / cEst;
  const room = (g: Group) => Math.max(g.R, labW) + labH * 0.55;
  groups.forEach((g, gi) => {
    if (gi === 0) return;
    for (let t = 0; t < 6000; t++) {
      const th = t * 0.18, d = 0.5 * th + groups[0].R * 0.1;
      const x = Math.cos(th) * d * 1.4, y = Math.sin(th) * d * 0.8;
      if (groups.slice(0, gi).every((o) => Math.hypot(o.cx - x, o.cy - y) >= room(o) + room(g) + 0.6)) { g.cx = x; g.cy = y; break; }
    }
  });
  const lab = phone ? 14 : 18;
  const minX = Math.min(...groups.map((g) => g.cx - Math.max(g.R, labW))), maxX = Math.max(...groups.map((g) => g.cx + Math.max(g.R, labW)));
  const minY = Math.min(...groups.map((g) => g.cy - g.R)), maxY = Math.max(...groups.map((g) => g.cy + g.R + labH));
  const c = Math.min((W - 8) / (maxX - minX), (H - lab) / (maxY - minY));
  const ox = (W - (maxX - minX) * c) / 2 - minX * c, oy = (H - (maxY - minY) * c) / 2 - minY * c;
  for (const g of groups) { g.cx = ox + g.cx * c; g.cy = oy + g.cy * c; g.R *= c; }
  const rad = new Float32Array(data.marks.length), ang = new Float32Array(data.marks.length), grp = new Uint8Array(data.marks.length);
  groups.forEach((g, gi) => g.members.forEach((i, j) => { rad[i] = c * Math.sqrt(j + 0.5); ang[i] = j * GOLDEN; grp[i] = gi; }));
  return { c, m: Math.max(1, Math.min(4.2, c * 1.05)), groups, rad, ang, grp };
}

export function RegisterPortrait({ data }: { data: Data }) {
  const tour = useMemo(() => data.photos.slice(0, 40), [data.photos]);
  const photoAt = useMemo(() => new Map(data.photos.map((p) => [p.i, p])), [data.photos]);
  const [at, setAt] = useState(0);
  const [lens, setLens] = useState<Lens>("all");
  const [live, setLive] = useState(false);
  const [calm, setCalm] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; city: number } | null>(null);
  const sec = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLElement>(null);
  const geo = useRef<Layout | null>(null);
  const posOf = useRef<(i: number) => [number, number]>(() => [0, 0]);
  const state = useRef({ lens: "all" as Lens, mix: 1, from: "all" as Lens, t0: 0, rise: 0, riseStart: -1, focus: -1 });

  const totals = useMemo(() => {
    const help = data.cities.reduce((s, c) => s + c.help, 0), examined = data.cities.reduce((s, c) => s + c.examined, 0);
    return { help, unexamined: data.total - examined, photo: data.photos.length };
  }, [data]);

  const cur = tour[at];
  /* The portrait that blooms out of its mark in the field. */
  const thumb = useRef<{ img: HTMLImageElement; at: number } | null>(null);
  useEffect(() => {
    state.current.focus = cur?.i ?? -1;
    if (!cur) return;
    const img = new Image();
    img.src = sized(cur.cover_photo, 128);
    thumb.current = { img, at: performance.now() };
  }, [cur]);
  useEffect(() => { const s = state.current; if (s.lens !== lens) { s.from = s.lens; s.lens = lens; s.mix = 0; s.t0 = performance.now(); } }, [lens]);

  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const node = sec.current; if (!node) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.2 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  /* The tour: one portrait at a time while the section is on screen. */
  const held = useRef(0);
  useEffect(() => {
    if (calm || !live || tour.length < 2) return;
    const id = window.setInterval(() => { if (Date.now() - held.current > 14_000) setAt((i) => (i + 1) % tour.length); }, HOLD);
    return () => window.clearInterval(id);
  }, [calm, live, tour.length]);
  const go = useCallback((i: number) => { held.current = Date.now(); setAt(((i % tour.length) + tour.length) % tour.length); }, [tour.length]);

  /* The skyline. */
  useEffect(() => {
    const canvas = cv.current, box = stage.current;
    if (!canvas || !box || !data.marks.length) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, dead = false, W = 0, H = 0, phone = false, last = 0;
    const s = state.current;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight; phone = W < 700;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* Room above for the counts and below for the names. */
      /* The flowers take the sky left of the file; on a phone, all of it. */
      const cardW = !phone && card.current ? card.current.offsetWidth + 40 : 0;
      geo.current = layout(data, W - cardW, H, phone);
    };
    const lit = (ch: string, i: number, l: Lens) =>
      l === "all" ? 1 : l === "help" ? (ch >= "A" && ch <= "Z" ? 1 : 0) : l === "unexamined" ? (ch.toLowerCase() === "a" ? 1 : 0) : (photoAt.has(i) ? 1 : 0);
    /* Where a mark is now: its flower turns, very slowly. */
    const xy = (g: Layout, i: number, now: number): [number, number] => {
      const G = g.groups[g.grp[i]], a = g.ang[i] + (reduce ? 0 : (now / 1000) * 0.018 * G.spin);
      return [G.cx + Math.cos(a) * g.rad[i], G.cy + Math.sin(a) * g.rad[i]];
    };
    posOf.current = (i: number) => (geo.current ? xy(geo.current, i, performance.now()) : [0, 0]);
    const draw = (now: number) => {
      const g = geo.current; if (!g) return;
      ctx.clearRect(0, 0, W, H);
      if (s.riseStart < 0) s.riseStart = now;
      const rise = reduce ? 1 : Math.min(1, (now - s.riseStart) / 2600);
      s.mix = reduce ? 1 : Math.min(1, (now - s.t0) / 420);
      const { m } = g;
      g.groups.forEach((grp, gi) => {
        /* Each flower opens from its core, the largest a little first. */
        const open = Math.max(0, Math.min(1, rise * 1.3 - gi * 0.015));
        const show = Math.ceil(grp.members.length * (1 - Math.pow(1 - open, 2.4)));
        for (let j = 0; j < show; j++) {
          const i = grp.members[j], ch = data.marks[i];
          const [x, y] = xy(g, i, now);
          const a0 = lit(ch, i, s.from), a1 = lit(ch, i, s.lens), on = a0 + (a1 - a0) * s.mix;
          const photo = photoAt.has(i), lo = ch.toLowerCase();
          const col = photo ? COL.photo : ch !== lo ? COL.help : lo === "b" ? COL.ster : lo === "c" ? COL.notster : COL.none;
          const base = photo ? 1 : ch !== lo ? 0.95 : lo === "a" ? 0.34 : 0.85;
          ctx.fillStyle = `rgba(${col},${(base * (0.08 + 0.92 * on)).toFixed(3)})`;
          if (photo) {
            const tw = reduce ? 1 : 0.7 + 0.3 * Math.sin(now / 420 + i);
            ctx.beginPath(); ctx.arc(x, y, Math.max(1.4, m * 0.62) * (0.8 + 0.4 * tw), 0, Math.PI * 2); ctx.fill();
          } else { ctx.beginPath(); ctx.arc(x, y, m / 2, 0, Math.PI * 2); ctx.fill(); }
        }
        /* The place's name and count, under its flower. */
        if (open >= 1 && grp.R > (phone ? 7 : 9)) {
          ctx.textAlign = "center";
          ctx.font = `600 ${phone ? 10 : 12}px "DM Sans", system-ui, sans-serif`;
          ctx.fillStyle = "rgba(239,231,218,0.85)";
          /* Kept inside the canvas at either edge. */
          const half = ctx.measureText(grp.name).width / 2 + 3;
          const lx = Math.max(half, Math.min(W - half, grp.cx));
          ctx.fillText(grp.name, lx, grp.cy + grp.R + (phone ? 12 : 15));
          ctx.font = `500 ${phone ? 9 : 10.5}px "DM Mono", ui-monospace, monospace`;
          ctx.fillStyle = "rgba(239,231,218,0.5)";
          ctx.fillText(fmt(grp.n), lx, grp.cy + grp.R + (phone ? 23 : 29));
          ctx.textAlign = "start";
        }
      });
      /* The animal in the portrait: a ring on its mark, and a thread to its file. */
      const f = s.focus;
      if (f >= 0 && rise >= 1) {
        const [x, y] = xy(g, f, now);
        const beat = reduce ? 0.5 : (now % 1800) / 1800;
        ctx.strokeStyle = `rgba(255,244,224,${(0.9 - beat * 0.9).toFixed(3)})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 6 + beat * 18, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "rgba(255,244,224,0.95)";
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
        /* Its portrait rises out of the mark on a stem, and settles. */
        const th = thumb.current;
        if (th && th.img.complete && th.img.naturalWidth) {
          const k = reduce ? 1 : Math.min(1, (now - th.at) / 700), e = 1 - Math.pow(1 - k, 3);
          const r = (phone ? 17 : 24) * e, lift = (phone ? 30 : 44) * e;
          const px = Math.max(r + 4, Math.min(W - r - 4, x)), py = Math.max(r + 4, y - lift);
          ctx.strokeStyle = "rgba(255,244,224,0.7)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(px, py + r); ctx.stroke();
          if (r > 1) {
            ctx.save(); ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.clip();
            const iw = th.img.naturalWidth, ih = th.img.naturalHeight, sq = Math.min(iw, ih);
            ctx.drawImage(th.img, (iw - sq) / 2, (ih - sq) / 2, sq, sq, px - r, py - r, r * 2, r * 2);
            ctx.restore();
            ctx.strokeStyle = "rgba(255,244,224,0.95)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
          }
        }
        const cr = card.current?.getBoundingClientRect(), sr = canvas.getBoundingClientRect();
        if (cr && !phone) {
          const tx = cr.left - sr.left, ty = cr.top - sr.top + Math.min(cr.height * 0.35, 150);
          if (tx > x + 20) {
            ctx.strokeStyle = "rgba(255,244,224,0.5)"; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(x + 7, y); ctx.bezierCurveTo(x + (tx - x) * 0.55, y, tx - (tx - x) * 0.35, ty, tx, ty); ctx.stroke(); ctx.setLineDash([]);
          }
        }
      }
    };
    const loop = (now: number) => {
      if (dead) return;
      raf = requestAnimationFrame(loop);
      if (!live && s.riseStart >= 0) return;
      if (!live) return;
      if (now - last < 33) return;
      last = now;
      draw(now);
    };
    size();
    if (reduce) { s.riseStart = 0; draw(performance.now()); }
    raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => { size(); draw(performance.now()); });
    ro.observe(canvas);
    return () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); };
  }, [data, photoAt, live]);

  /* Hover: the tower under the pointer names its city; a photographed
     mark under it can be chosen. */
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = geo.current, r = e.currentTarget.getBoundingClientRect(); if (!g) return;
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const ci = g.groups.findIndex((G) => Math.hypot(G.cx - x, G.cy - y) <= G.R + 4);
    setTip(ci >= 0 ? { x, y, city: ci } : null);
  };
  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const g = geo.current, r = e.currentTarget.getBoundingClientRect(); if (!g) return;
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = -1, bd = 14;
    tour.forEach((p, k) => { const [px, py] = posOf.current(p.i); const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = k; } });
    if (best >= 0) go(best);
  };

  if (!data.marks.length || !cur) return null;
  const ster = checkOf(cur.sterilisation_status), vac = checkOf(cur.vaccination_status);
  const city = tip ? geo.current?.groups[tip.city] ?? null : null;
  const lenses: { id: Lens; label: string; n: number }[] = [
    { id: "all", label: "Every animal", n: data.total },
    { id: "help", label: "Need help", n: totals.help },
    { id: "unexamined", label: "Never examined", n: totals.unexamined },
    { id: "photo", label: "Photographed", n: totals.photo },
  ];

  return (
    <section ref={sec} className={`rgp ${live ? "is-live" : ""}`} aria-labelledby="rgp-title">
      <div className="rgp-in">
        <header className="rgp-head">
          <p className="rgp-kicker sys-mono">The register · one mark per animal</p>
          <h2 id="rgp-title">{fmt(data.total)} animals on the record. <em>{fmt(totals.photo)} of them, in their own photographs.</em></h2>
          <div className="rgp-lenses" role="group" aria-label="Light up">
            {lenses.map((l) => (
              <button key={l.id} type="button" aria-pressed={lens === l.id} className={`rgp-lens is-${l.id} ${lens === l.id ? "is-on" : ""}`} onClick={() => setLens(l.id)}>
                <i aria-hidden /> {l.label} <b className="sys-mono">{fmt(l.n)}</b>
              </button>
            ))}
          </div>
        </header>

        <div ref={stage} className="rgp-stage">
          <div className="rgp-sky">
            <canvas ref={cv} className="rgp-canvas" onPointerMove={onMove} onPointerLeave={() => setTip(null)} onClick={onClick}
              role="img" aria-label={`${fmt(data.total)} animals on the public record in ${data.cities.length} places, one mark each: ${fmt(totals.help)} need help, ${fmt(totals.unexamined)} have never been examined for sterilisation, ${fmt(totals.photo)} are photographed.`} />
            {city && tip && (
              <p className="rgp-tip" style={{ left: Math.min(tip.x + 14, (stage.current?.clientWidth ?? 600) - 200), top: Math.max(0, tip.y - 70) }}>
                <b>{city.name}</b>
                <span className="sys-mono">{fmt(city.n)} on record · {fmt(city.help)} need help · {fmt(city.n - city.examined)} never examined{city.photos ? ` · ${city.photos} photographed` : ""}</span>
              </p>
            )}
          </div>

          <article ref={card} className="rgp-card" aria-live="polite">
            <Link href={`/dog/${cur.id}`} className="rgp-photo" key={cur.id} aria-label={`${labelOf(cur)}: open the record`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sized(cur.cover_photo, 720)} alt={`${labelOf(cur)}, photographed on the street`} />
              <span className="rgp-crop" aria-hidden><i /><i /><i /><i /></span>
              <span className="rgp-stamp sys-mono">{cur.straypaw_id ?? "ID pending"}</span>
            </Link>
            <div className="rgp-file" key={`f-${cur.id}`}>
              <h3>{labelOf(cur)}</h3>
              <p className="rgp-where">{[cleanPlace(cur.zone), cur.city].filter(Boolean).join(", ") || "Place not recorded"}</p>
              <dl className="rgp-rows">
                <div><dt>On the record</dt><dd className="sys-mono">{date(cur.first_seen) ?? "—"}</dd></div>
                <div><dt>Sightings</dt><dd className="sys-mono">{cur.sightings_count ?? 1}</dd></div>
                <div><dt>Requests for help</dt><dd>{cur.requests ? `${cur.requests}${cur.conditions.length ? ` · ${cur.conditions.slice(0, 2).join(", ")}` : ""}` : "None"}</dd></div>
                <div><dt>Reported by</dt><dd>{cur.source === "resident" ? "A resident, from a phone" : "Recorded on StrayPaw"}</dd></div>
              </dl>
              <ul className="rgp-checks" aria-label="Health checks on the record">
                <li className={`is-${ster}`}><i aria-hidden /><b>Sterilised</b><span>{CHECK_TEXT[ster]}</span></li>
                <li className={`is-${vac}`}><i aria-hidden /><b>Vaccinated</b><span>{CHECK_TEXT[vac]}</span></li>
              </ul>
              <div className="rgp-ctl">
                <button type="button" className="rgp-btn" onClick={() => go(at - 1)} aria-label="Previous animal"><ArrowLeft size={16} /></button>
                <span className="rgp-count sys-mono">{String(at + 1).padStart(2, "0")} / {String(tour.length).padStart(2, "0")}</span>
                <button type="button" className="rgp-btn" onClick={() => go(at + 1)} aria-label="Next animal"><ArrowRight size={16} /></button>
                <Link href={`/dog/${cur.id}`} className="rgp-go">Open the record <ArrowUpRight size={14} aria-hidden /></Link>
              </div>
            </div>
          </article>
        </div>

        <p className="rgp-foot sys-mono">Recorded animals, not population · grouped by city, never placed finer · {data.cities.length} places</p>
      </div>
    </section>
  );
}
