"use client";

/* ════════════════════════════════════════════════════════════════════
   The animal register: the live total, then the field of animals it is
   made of, then one of them, then its history, then the field again.

   A self-contained section, driven only by its own scroll. It holds while
   it scrolls, and as it goes:

     the total        the same live count the hero shows, over the field
     the field        one mark per animal on the record: every resident
                      photograph, real StrayPaw IDs, and plain marks for
                      the animals nobody has photographed
     one animal       the field spreads apart and one real animal comes
                      forward out of its own place in it, its photograph
                      growing large
     its history      its ID, where it lives and when it was seen, then
                      lines drawn out to what its record holds: sightings,
                      requests for help, care, the organisation working it,
                      the two checks; "not recorded yet" where it is not
     the field again  it goes back to its place and the register closes
                      around it: one of the total

   Nothing here is invented: the marks are the count, the IDs are real,
   the history is the animal's public record. Under reduced motion the
   section does not hold: it shows the field with the animal forward and
   its history written in.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";
import type { AnimalRegister as Data } from "@/lib/landing/story";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null, year = true) => { if (!iso) return null; const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ""}`; };
const fmt = (n: number) => n.toLocaleString("en-IN");
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const seeded = (s: number) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const checkText = (v: string | null) => { const s = (v ?? "").toLowerCase(); return ["yes", "true", "sterilised", "sterilized", "vaccinated"].includes(s) ? "recorded" : ["no", "false", "not_sterilised", "not_vaccinated"].includes(s) ? "recorded as not yet" : "not examined yet"; };

type Mark = { x: number; y: number; kind: 0 | 1 | 2; ref: number; a: number };

/* The field: one mark per animal, laid irregularly (denser in drifts, as
   records gather where people look), photographs spread through it. */
function buildField(n: number, photos: number, ids: number, W: number, H: number, focusAt: [number, number], quiet: [number, number]) {
  const rnd = seeded(20260929);
  const cell = Math.sqrt((W * H * 0.94) / n);
  const cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
  const pts: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const nx = c / cols, ny = r / rows;
    /* A slow warp, so the field reads as drifts rather than a grid. */
    const wx = Math.sin(ny * 7.1 + 1.3) * 0.9 + Math.sin((nx + ny) * 13.7) * 0.5;
    const wy = Math.cos(nx * 6.3 + 0.4) * 0.9 + Math.sin((nx - ny) * 11.3) * 0.5;
    pts.push([(c + 0.5 + (rnd() - 0.5) * 0.9 + wx) * cell, (r + 0.5 + (rnd() - 0.5) * 0.9 + wy) * cell]);
  }
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  /* The headline's corner stays quiet: plain marks only, and fainter. */
  const hush = (x: number, y: number) => x < quiet[0] && y < quiet[1];
  const marks: Mark[] = pts.slice(0, n).map(([x, y]) => ({ x, y, kind: 0, ref: 0, a: (0.14 + rnd() * 0.22) * (hush(x, y) ? 0.35 : 1) }));
  /* Photographs first, spaced out; the chosen animal sits at its place. */
  let placed = 0, fi = -1;
  const taken: [number, number][] = [];
  const gap = cell * 3.2;
  const order = marks.map((_, i) => i).sort((a, b) => Math.hypot(marks[a].x - focusAt[0], marks[a].y - focusAt[1]) - Math.hypot(marks[b].x - focusAt[0], marks[b].y - focusAt[1]));
  fi = order[0]; marks[fi].kind = 1; marks[fi].ref = 0; taken.push([marks[fi].x, marks[fi].y]); placed = 1;
  for (const i of marks.map((_, k) => k)) {
    if (placed >= photos) break;
    const m = marks[i]; if (m.kind) continue;
    if (m.x < cell || m.y < cell || m.x > W - cell || m.y > H - cell || hush(m.x, m.y)) continue;
    if (taken.some(([x, y]) => Math.hypot(x - m.x, y - m.y) < gap)) continue;
    m.kind = 1; m.ref = placed++; taken.push([m.x, m.y]);
  }
  let labelled = 0;
  for (const m of marks) { if (labelled >= ids) break; if (m.kind || hush(m.x, m.y)) continue; if (taken.some(([x, y]) => Math.hypot(x - m.x, y - m.y) < gap * 1.3)) continue; m.kind = 2; m.ref = labelled++; taken.push([m.x, m.y]); }
  return { marks, focus: fi, cell };
}

export function AnimalRegister({ data, total }: { data: Data; total: number }) {
  const f = data.focus;
  const sec = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const big = useRef<HTMLDivElement>(null);
  const [calm, setCalm] = useState(false);

  /* The focus photograph first, so the one that comes forward is the one
     sitting in the field. */
  const photos = useMemo(() => (f ? [{ id: f.id, cover_photo: f.cover_photo }, ...data.photos.filter((p) => p.id !== f.id)] : data.photos), [data.photos, f]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCalm(reduce);
    const canvas = cv.current, box = stage.current, s = sec.current, card = big.current;
    if (!canvas || !box || !s || !card || !f || total <= 0) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let W = 0, H = 0, phone = false, field: ReturnType<typeof buildField> | null = null, raf = 0, dead = false;
    const imgs = photos.map((p) => { const im = new Image(); im.decoding = "async"; im.src = sized(p.cover_photo, 96); im.onload = () => on(); return im; });
    const target = () => {
      const S = phone ? Math.min(W * 0.62, H * 0.36) : Math.min(H * 0.58, W * 0.34);
      return { S, cx: phone ? W * 0.5 : W * 0.3, cy: phone ? H * 0.3 : H * 0.53 };
    };
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = box.clientWidth; H = box.clientHeight; phone = W < 760;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = target();
      field = buildField(total, Math.min(photos.length, phone ? 40 : photos.length), phone ? 26 : 90, W, H, [t.cx + (phone ? W * 0.18 : W * 0.12), t.cy + (phone ? H * 0.2 : H * 0.12)], phone ? [W, H * 0.34] : [Math.min(W * 0.62, 820), H * 0.42]);
    };
    const tile = () => (field ? Math.max(12, field.cell * (phone ? 2.4 : 2.3)) : 20);

    const frame = () => {
      raf = 0;
      if (!field) return;
      const r = s.getBoundingClientRect(), vh = window.innerHeight;
      const p = reduce ? 0.55 : clamp(-r.top / Math.max(1, r.height - vh));
      /* The timeline, all inside this section. */
      const come = smooth((p - 0.1) / 0.24), back = smooth((p - 0.8) / 0.16), k = come * (1 - back);
      const fade = 1 - clamp((p - 0.72) / 0.06);
      const idOn = reduce ? 1 : clamp((p - 0.32) / 0.07) * fade;
      box.style.setProperty("--head", String(reduce ? 1 : 1 - smooth(k * 1.8)));
      box.style.setProperty("--id", String(idOn));
      for (let i = 0; i < 5; i++) box.style.setProperty(`--h${i}`, String(reduce ? 1 : clamp((p - 0.4 - i * 0.055) / 0.07) * fade));
      box.style.setProperty("--end", String(reduce ? 0 : clamp((p - 0.9) / 0.06)));

      const fm = field.marks[field.focus], T = target(), t0 = tile();
      /* The field spreads away from the animal as it comes forward. */
      const spread = 1 + (phone ? 1.6 : 2.2) * k, dim = 1 - 0.72 * k;
      ctx.clearRect(0, 0, W, H);
      const pad = t0 * 0.08;
      for (let i = 0; i < field.marks.length; i++) {
        if (i === field.focus) continue;
        const m = field.marks[i];
        const x = fm.x + (m.x - fm.x) * spread, y = fm.y + (m.y - fm.y) * spread;
        if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
        if (m.kind === 0) {
          const sz = field.cell * 0.36;
          ctx.fillStyle = `rgba(11,30,61,${(m.a * dim).toFixed(3)})`;
          ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
        } else if (m.kind === 1) {
          const im = imgs[m.ref];
          ctx.globalAlpha = Math.max(0.15, dim);
          ctx.fillStyle = "#fffdf9"; ctx.fillRect(x - t0 / 2 - pad, y - t0 / 2 - pad, t0 + pad * 2, t0 + pad * 2);
          if (im?.complete && im.naturalWidth) {
            const sq = Math.min(im.naturalWidth, im.naturalHeight);
            ctx.drawImage(im, (im.naturalWidth - sq) / 2, (im.naturalHeight - sq) / 2, sq, sq, x - t0 / 2, y - t0 / 2, t0, t0);
          } else { ctx.fillStyle = "#e3d9ca"; ctx.fillRect(x - t0 / 2, y - t0 / 2, t0, t0); }
          ctx.globalAlpha = 1;
        } else {
          const id = data.ids[m.ref % Math.max(1, data.ids.length)] ?? "";
          ctx.font = `500 ${phone ? 7.5 : 9}px "DM Mono", ui-monospace, monospace`;
          const w = ctx.measureText(id).width;
          ctx.fillStyle = `rgba(244,238,229,${(0.9 * dim).toFixed(3)})`; ctx.fillRect(x - w / 2 - 3, y - 7, w + 6, 12);
          ctx.fillStyle = `rgba(36,87,206,${(0.62 * dim).toFixed(3)})`; ctx.fillText(id, x - w / 2, y + 2.5);
        }
      }
      /* The animal: from its tile to large, as a real image over the field. */
      const S = t0 + (T.S - t0) * k, cx = fm.x + (T.cx - fm.x) * k, cy = fm.y + (T.cy - fm.y) * k;
      card.style.transform = `translate3d(${(cx - S / 2).toFixed(1)}px, ${(cy - S / 2).toFixed(1)}px, 0)`;
      card.style.width = `${S.toFixed(1)}px`; card.style.height = `${S.toFixed(1)}px`;
      box.style.setProperty("--big", String(k));
      box.style.setProperty("--bx", `${(T.cx + T.S / 2).toFixed(0)}px`);
      box.style.setProperty("--by", `${(T.cy - T.S / 2).toFixed(0)}px`);
      box.style.setProperty("--bs", `${T.S.toFixed(0)}px`);
      box.style.setProperty("--bl", `${(T.cx - T.S / 2).toFixed(0)}px`);
      box.style.setProperty("--bb", `${(T.cy + T.S / 2).toFixed(0)}px`);
      /* Before anything moves, the one that will come forward is marked. */
      box.style.setProperty("--hint", String(reduce ? 0 : 1 - clamp(p / 0.1)));
    };
    const on = () => { if (!raf && !dead) raf = requestAnimationFrame(frame); };
    size(); frame();
    window.addEventListener("scroll", on, { passive: true });
    const ro = new ResizeObserver(() => { size(); on(); });
    ro.observe(box);
    return () => { dead = true; cancelAnimationFrame(raf); window.removeEventListener("scroll", on); ro.disconnect(); };
  }, [data.ids, photos, total, f]);

  if (!f || total <= 0) return null;
  const where = [cleanPlace(f.zone), f.city].filter(Boolean).join(" · ") || "Place not recorded";
  const seen = day(f.last_seen, false);
  const history: { k: string; what: string; value: string; known: boolean }[] = [
    { k: "s", what: "Sightings", known: true, value: `${plural(f.sightings, "sighting")} · first ${day(f.first_seen) ?? "—"}${f.last_seen && day(f.last_seen) !== day(f.first_seen) ? `, last ${day(f.last_seen)}` : ""}` },
    { k: "r", what: "Requests for help", known: f.requests.length > 0, value: f.requests.length ? f.requests.map((r) => `${r.condition ?? "Help"} · ${day(r.at)}${r.closed ? " · closed" : ""}`).join("; ") : "None: reported as seen, not in need" },
    { k: "c", what: "Care", known: f.care.length > 0, value: f.care.length ? f.care.slice(-3).map((c) => `${c.kind.replace(/_/g, " ")} · ${day(c.at)}`).join("; ") : "None recorded yet" },
    { k: "o", what: "Organisation", known: !!f.org, value: f.org ?? "Not yet taken on by one" },
    { k: "x", what: "Checks", known: false, value: `Sterilisation ${checkText(f.sterilisation)} · vaccination ${checkText(f.vaccination)}` },
  ];

  return (
    <section ref={sec} className={`ar ${calm ? "is-calm" : ""}`} aria-labelledby="ar-title">
      <div ref={stage} className="ar-stage">
        <canvas ref={cv} className="ar-field" aria-hidden />

        <header className="ar-head">
          <p className="ar-kicker sys-mono">The animal register</p>
          <h2 id="ar-title"><span className="ar-n">{fmt(total)}</span> animals on the&nbsp;record.</h2>
          <p className="ar-sub">Each mark is one of them: a resident&apos;s photograph, a StrayPaw ID, or a record not yet photographed.</p>
        </header>

        <div ref={big} className="ar-big" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sized(f.cover_photo, 720)} alt="" />
          <span className="ar-hint" />
        </div>

        <div className="ar-id" aria-live="off">
          <p className="ar-sp sys-mono">{f.straypaw_id ?? "ID pending"}</p>
          <p className="ar-where">{where}</p>
          {seen && <p className="ar-seen">Seen {seen}</p>}
        </div>

        <ol className="ar-hist" aria-label={`The public record of ${f.straypaw_id ?? "this animal"}`}>
          {history.map((h, i) => (
            <li key={h.k} className={h.known ? "is-known" : "is-open"} style={{ ["--o" as string]: `var(--h${i})`, ["--row" as string]: i }}>
              <svg className="ar-line" aria-hidden><line x1="0" y1="50%" x2="100%" y2="50%" pathLength={1} /></svg>
              <span className="ar-what">{h.what}</span>
              <span className="ar-val">{h.value}</span>
            </li>
          ))}
          <li className="ar-open" style={{ ["--o" as string]: "var(--h4)" }}>
            <Link href={`/dog/${f.id}`}>Open {f.straypaw_id ?? "this record"} <ArrowUpRight size={14} aria-hidden /></Link>
          </li>
        </ol>

        <p className="ar-end">{f.straypaw_id ?? "This animal"} is one of <b>{fmt(total)}</b>. Every one has a record like it.</p>
      </div>
    </section>
  );
}
