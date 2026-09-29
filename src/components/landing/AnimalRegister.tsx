"use client";

/* ════════════════════════════════════════════════════════════════════
   The animal register: a camera through the record.

   A self-contained section, driven only by its own scroll. It holds while
   it scrolls and a camera moves over the register drawn as a filing wall:
   one card per animal on the record, in rows, like an archive index (a
   resident's photograph where there is one, hatched where nobody has
   photographed the animal, its StrayPaw ID on the card). It is not a map:
   a card's place on the wall says nothing about where the animal lives.

     the total   the whole wall, under the same live count the hero shows
     zoom in     the camera dives into one real animal's card on the wall
                 until its photograph fills the frame; its ID, where it lives and
                 when it was seen come up, then faint lines out to what its
                 record holds (sightings, requests for help, care, the
                 organisation working it, the two checks)
     zoom out    the camera pulls back across the wall to the next animal
                 and dives again, one profile after another
     the total   it pulls all the way back out: every mark is a profile

   Nothing is invented: the cards are the count, the IDs are real, each
   history is the animal's public record, "not recorded yet" where it is
   not. Under reduced motion the section does not hold: it shows the first
   animal forward with its history written in.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";
import type { AnimalRegister as Data, RegisterFocus } from "@/lib/landing/story";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null, year = true) => { if (!iso) return null; const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ""}`; };
const fmt = (n: number) => n.toLocaleString("en-IN");
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const t = clamp(x); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const seeded = (s: number) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const checkText = (v: string | null) => { const s = (v ?? "").toLowerCase(); return ["yes", "true", "sterilised", "sterilized", "vaccinated"].includes(s) ? "recorded" : ["no", "false", "not_sterilised", "not_vaccinated"].includes(s) ? "recorded as not yet" : "not examined yet"; };

type Card = { x: number; y: number; photo: number; id: number };
type Cam = { ax: number; ay: number; bx: number; by: number; z: number };

/* The wall: one card per animal, in rows, filling the frame. Photographs
   are spread evenly through it (none under the headline); real StrayPaw
   IDs go on the cards they belong to, the rest carry a blank ID line
   rather than an invented one. */
function buildWall(n: number, photos: number, ids: number, W: number, H: number, quiet: [number, number]) {
  const rnd = seeded(20260929);
  const pitch = Math.sqrt((W * H) / n);
  const cols = Math.max(1, Math.round(W / pitch)), rows = Math.ceil(n / cols);
  const pw = W / cols, phh = H / rows, cell = Math.min(pw, phh);
  const cards: Card[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    cards.push({ x: (c + 0.5) * pw, y: (r + 0.5) * phh, photo: -1, id: -1 });
  }
  const hush = (x: number, y: number) => x < quiet[0] && y < quiet[1];
  const open = cards.map((_, i) => i).filter((i) => { const k = cards[i]; return !hush(k.x, k.y) && k.x > cell * 2 && k.y > cell * 2 && k.x < W - cell * 2 && k.y < H - cell * 2; });
  /* Evenly through the open cards, with a little shuffle so the wall does
     not read as a pattern. */
  const step = open.length / Math.max(1, photos);
  for (let p = 0; p < photos; p++) {
    const at = open[Math.min(open.length - 1, Math.floor(p * step + rnd() * step * 0.8))];
    if (at !== undefined && cards[at].photo < 0) cards[at].photo = p;
  }
  const rest = cards.map((_, i) => i).filter((i) => cards[i].photo < 0);
  for (let k = 0; k < ids && rest.length; k++) cards[rest.splice(Math.floor(rnd() * rest.length), 1)[0]].id = k;
  const photoAt = new Map<number, number>();
  cards.forEach((k, i) => { if (k.photo >= 0) photoAt.set(k.photo, i); });
  return { cards, cell, photoAt };
}

function historyOf(f: RegisterFocus) {
  return [
    { k: "s", what: "Sightings", known: true, value: `${plural(f.sightings, "sighting")} · first ${day(f.first_seen) ?? "—"}${f.last_seen && day(f.last_seen) !== day(f.first_seen) ? `, last ${day(f.last_seen)}` : ""}` },
    { k: "r", what: "Requests for help", known: f.requests.length > 0, value: f.requests.length ? f.requests.map((r) => `${r.condition ?? "Help"} · ${day(r.at)}${r.closed ? " · closed" : ""}`).join("; ") : "None: reported as seen, not in need" },
    { k: "c", what: "Care", known: f.care.length > 0, value: f.care.length ? f.care.slice(-3).map((c) => `${c.kind.replace(/_/g, " ")} · ${day(c.at)}`).join("; ") : "None recorded yet" },
    { k: "o", what: "Organisation", known: !!f.org, value: f.org ?? "Not yet taken on by one" },
    { k: "x", what: "Checks", known: false, value: `Sterilisation ${checkText(f.sterilisation)} · vaccination ${checkText(f.vaccination)}` },
  ];
}

export function AnimalRegister({ data, total }: { data: Data; total: number }) {
  const sec = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const big = useRef<HTMLImageElement>(null);
  const [calm, setCalm] = useState(false);
  const [phone, setPhone] = useState(false);
  const [cur, setCur] = useState(0);

  /* The tour's animals first in the photo list, so each one visited is a
     photograph sitting in the field. */
  const tour = useMemo(() => data.tour.slice(0, phone ? 4 : 5), [data.tour, phone]);
  const photos = useMemo(() => {
    const ids = new Set(tour.map((t) => t.id));
    return [...tour.map((t) => ({ id: t.id, cover_photo: t.cover_photo, straypaw_id: t.straypaw_id })), ...data.photos.filter((p) => !ids.has(p.id))];
  }, [data.photos, tour]);

  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setPhone(window.innerWidth < 760);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = cv.current, box = stage.current, s = sec.current, img = big.current;
    if (!canvas || !box || !s || !img || !tour.length || total <= 0) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let W = 0, H = 0, ph = false, field: ReturnType<typeof buildWall> | null = null, raf = 0, dead = false, shown = -1;
    const thumbs = photos.map((p) => { const im = new Image(); im.decoding = "async"; im.src = sized(p.cover_photo, 96); im.onload = () => on(); return im; });
    const hires = tour.map((t) => { const im = new Image(); im.src = sized(t.cover_photo, 720); return im; });

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = box.clientWidth; H = box.clientHeight; ph = W < 760;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      field = buildWall(total, photos.length, data.ids.length, W, H, ph ? [W, H * 0.34] : [Math.min(W * 0.62, 820), H * 0.42]);
    };
    const tile = () => (field ? field.cell * 0.86 : 10);
    /* Where a visited animal sits when it fills the frame. */
    const frameOf = () => {
      const S = ph ? Math.min(W * 0.64, H * 0.34) : Math.min(H * 0.58, W * 0.34);
      return { S, x: ph ? W * 0.5 : W * 0.3, y: ph ? H * 0.28 : H * 0.53 };
    };
    const overview = (): Cam => ({ ax: W / 2, ay: H / 2, bx: W / 2, by: H / 2, z: 1 });
    const onDog = (i: number): Cam => {
      const m = field!.cards[field!.photoAt.get(i) ?? 0], F = frameOf();
      return { ax: m.x, ay: m.y, bx: F.x, by: F.y, z: F.S / tile() };
    };
    /* Between two framings: position eased, zoom through a dip, so each
       move pulls back over the field before it dives again. */
    const between = (a: Cam, b: Cam, t: number, dip: number): Cam => {
      const e = ease(t), lz = Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * e - dip * Math.sin(Math.PI * t);
      return { ax: a.ax + (b.ax - a.ax) * e, ay: a.ay + (b.ay - a.ay) * e, bx: a.bx + (b.bx - a.bx) * e, by: a.by + (b.by - a.by) * e, z: Math.max(0.9, Math.exp(lz)) };
    };

    /* The timeline, in units: hold on the total, dive into the first,
       hold, move to the next (pull back and dive), …, pull back to the
       total, hold. */
    const N = tour.length;
    const segs: { kind: "hold" | "move"; len: number; from?: number; to?: number; dog?: number }[] = [
      { kind: "hold", len: 0.7, dog: -1 },
      { kind: "move", len: 1.1, from: -1, to: 0 },
    ];
    for (let i = 0; i < N; i++) {
      segs.push({ kind: "hold", len: 1.25, dog: i });
      segs.push({ kind: "move", len: 1.1, from: i, to: i + 1 < N ? i + 1 : -1 });
    }
    segs.push({ kind: "hold", len: 0.9, dog: -1 });
    const units = segs.reduce((t, g) => t + g.len, 0);
    s.style.height = reduce ? "" : `${Math.round((units / 2) * 100 + 100)}svh`;

    const frame = () => {
      raf = 0;
      if (!field) return;
      const r = s.getBoundingClientRect(), vh = window.innerHeight;
      const p = reduce ? 0 : clamp(-r.top / Math.max(1, r.height - vh));
      let u = reduce ? 0.7 + 1.1 + 0.6 : p * units, gi = 0;
      while (gi < segs.length - 1 && u > segs[gi].len) { u -= segs[gi].len; gi++; }
      const g = segs[gi], t = clamp(u / g.len);
      const camOf = (d: number) => (d < 0 ? overview() : onDog(d));
      let cam: Cam, dog = -1, info = 0;
      if (g.kind === "hold") {
        cam = camOf(g.dog!); dog = g.dog!;
        info = dog >= 0 ? Math.min(clamp(t / 0.18), clamp((1 - t) / 0.12)) : 0;
      } else {
        const dip = g.from! >= 0 && g.to! >= 0 ? (ph ? 2.2 : 2.6) : 0;
        cam = between(camOf(g.from!), camOf(g.to!), t, dip);
        dog = t < 0.5 ? g.from! : g.to!;
      }
      if (reduce) info = 1;
      if (dog >= 0 && dog !== shown) { shown = dog; setCur(dog); if (hires[dog]?.src) img.src = hires[dog].src; }

      const F = frameOf(), Zd = F.S / tile();
      const zk = clamp(Math.log(cam.z) / Math.log(Zd)); // 0 at the whole field, 1 on an animal
      box.style.setProperty("--head", String(reduce ? 0.15 : 1 - clamp(zk * 3)));
      box.style.setProperty("--info", String(info));
      for (let i = 0; i < 5; i++) box.style.setProperty(`--h${i}`, String(reduce ? 1 : g.kind === "hold" && dog >= 0 ? Math.min(clamp((t - 0.16 - i * 0.07) / 0.1), clamp((1 - t) / 0.12)) : 0));
      box.style.setProperty("--end", String(reduce ? 0 : gi === segs.length - 1 ? clamp(t / 0.35) : 0));
      box.style.setProperty("--bx", `${(F.x + F.S / 2).toFixed(0)}px`);
      box.style.setProperty("--by", `${(F.y - F.S / 2).toFixed(0)}px`);
      box.style.setProperty("--bb", `${(F.y + F.S / 2).toFixed(0)}px`);

      /* Draw the wall through the camera. Far away a card is a square of
         ink or its photograph's colour; closer, it is a card: paper, its
         photograph or a hatch where there is none, and its ID. */
      const sx = (x: number) => (x - cam.ax) * cam.z + cam.bx, sy = (y: number) => (y - cam.ay) * cam.z + cam.by;
      const t0 = tile(), cs = t0 * cam.z, dimOthers = 1 - 0.9 * zk;
      ctx.clearRect(0, 0, W, H);
      const focusCard = dog >= 0 ? field.photoAt.get(dog) : undefined;
      const detail = cs >= 16, label = cs >= 54;
      if (detail) { ctx.font = `500 ${Math.min(13, cs * 0.1).toFixed(1)}px "DM Mono", ui-monospace, monospace`; ctx.textBaseline = "middle"; }
      for (let i = 0; i < field.cards.length; i++) {
        const k = field.cards[i], x = sx(k.x) - cs / 2, y = sy(k.y) - cs / 2;
        if (x > W || y > H || x + cs < 0 || y + cs < 0) continue;
        const im = k.photo >= 0 ? thumbs[k.photo] : undefined;
        const a = i === focusCard ? 1 : dimOthers;
        if (!detail) {
          if (im?.complete && im.naturalWidth) {
            ctx.globalAlpha = Math.max(0.25, a);
            const sq = Math.min(im.naturalWidth, im.naturalHeight);
            ctx.drawImage(im, (im.naturalWidth - sq) / 2, (im.naturalHeight - sq) / 2, sq, sq, x, y, cs, cs);
            ctx.globalAlpha = 1;
          } else {
            ctx.fillStyle = k.id >= 0 ? `rgba(36,87,206,${(0.34 * a).toFixed(3)})` : `rgba(11,30,61,${(0.13 * a).toFixed(3)})`;
            ctx.fillRect(x + cs * 0.1, y + cs * 0.1, cs * 0.8, cs * 0.8);
          }
          continue;
        }
        ctx.globalAlpha = Math.max(0.08, a);
        ctx.fillStyle = "#fffdf9"; ctx.fillRect(x, y, cs, cs);
        ctx.strokeStyle = "rgba(11,30,61,0.14)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
        const inset = cs * 0.07, ph2 = label ? cs * 0.68 : cs - inset * 2;
        if (im?.complete && im.naturalWidth) {
          const sq = Math.min(im.naturalWidth, im.naturalHeight);
          ctx.drawImage(im, (im.naturalWidth - sq) / 2, (im.naturalHeight - sq) / 2, sq, sq * (ph2 / (cs - inset * 2)), x + inset, y + inset, cs - inset * 2, ph2);
        } else {
          /* Not photographed: drawn as not recorded, never left blank. */
          ctx.save(); ctx.beginPath(); ctx.rect(x + inset, y + inset, cs - inset * 2, ph2); ctx.clip();
          ctx.fillStyle = "#f4eee5"; ctx.fillRect(x + inset, y + inset, cs - inset * 2, ph2);
          ctx.strokeStyle = "rgba(11,30,61,0.16)"; ctx.lineWidth = Math.max(0.6, cs * 0.012);
          const gap = Math.max(3, cs * 0.07);
          ctx.beginPath();
          for (let d = -ph2; d < cs; d += gap) { ctx.moveTo(x + inset + d, y + inset + ph2); ctx.lineTo(x + inset + d + ph2, y + inset); }
          ctx.stroke(); ctx.restore();
        }
        if (label) {
          const idText = k.photo >= 0 ? photos[k.photo]?.straypaw_id : k.id >= 0 ? data.ids[k.id] : null;
          const ty = y + inset + ph2 + (cs - inset - ph2) / 2;
          if (idText) { ctx.fillStyle = "rgba(36,87,206,0.85)"; ctx.fillText(idText, x + inset, ty); }
          else { ctx.fillStyle = "rgba(11,30,61,0.12)"; ctx.fillRect(x + inset, ty - 2, (cs - inset * 2) * 0.62, 4); }
        }
        ctx.globalAlpha = 1;
      }
      /* The visited animal's own photograph, sharp, over its tile once the
         camera is close enough for the thumbnail to blur. */
      if (focusCard !== undefined) {
        const m = field.cards[focusCard], sz = t0 * cam.z;
        img.style.transform = `translate3d(${(sx(m.x) - sz / 2).toFixed(1)}px, ${(sy(m.y) - sz / 2).toFixed(1)}px, 0)`;
        img.style.width = img.style.height = `${sz.toFixed(1)}px`;
        img.style.opacity = String(clamp((zk - 0.45) / 0.3));
        img.style.borderWidth = `${Math.max(1, sz * 0.012).toFixed(1)}px`;
      } else img.style.opacity = "0";
    };
    const on = () => { if (!raf && !dead) raf = requestAnimationFrame(frame); };
    size(); frame();
    window.addEventListener("scroll", on, { passive: true });
    const ro = new ResizeObserver(() => { size(); on(); });
    ro.observe(box);
    return () => { dead = true; cancelAnimationFrame(raf); window.removeEventListener("scroll", on); ro.disconnect(); };
  }, [data.ids, photos, tour, total]);

  if (!tour.length || total <= 0) return null;
  const f = tour[Math.min(cur, tour.length - 1)];
  const where = [cleanPlace(f.zone), f.city].filter(Boolean).join(" · ") || "Place not recorded";
  const seen = day(f.last_seen, false);
  const history = historyOf(f);

  return (
    <section ref={sec} className={`ar ${calm ? "is-calm" : ""}`} aria-labelledby="ar-title">
      <div ref={stage} className="ar-stage">
        <canvas ref={cv} className="ar-field" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={big} className="ar-big" alt="" aria-hidden src={sized(tour[0].cover_photo, 720)} />

        <header className="ar-head">
          <p className="ar-kicker sys-mono">The animal register</p>
          <h2 id="ar-title"><span className="ar-n">{fmt(total)}</span> animals on the&nbsp;record.</h2>
          <p className="ar-sub">One card for each of them, kept like an index: a resident&apos;s photograph where there is one, hatched where nobody has photographed the animal yet. Scroll, and look closer.</p>
        </header>

        <div className="ar-panel">
        <div className="ar-id" key={`id-${f.id}`}>
          <p className="ar-count sys-mono">Profile {cur + 1} of {tour.length} shown · {fmt(total)} on the record</p>
          <p className="ar-sp sys-mono">{f.straypaw_id ?? "ID pending"}</p>
          <p className="ar-where">{where}</p>
          {seen && <p className="ar-seen">Seen {seen}</p>}
        </div>

        <ol className="ar-hist" key={`h-${f.id}`} aria-label={`The public record of ${f.straypaw_id ?? "this animal"}`}>
          {history.map((h, i) => (
            <li key={h.k} className={h.known ? "is-known" : "is-open"} style={{ ["--o" as string]: `var(--h${i})` }}>
              <svg className="ar-line" aria-hidden><line x1="0" y1="50%" x2="100%" y2="50%" pathLength={1} /></svg>
              <span className="ar-what">{h.what}</span>
              <span className="ar-val">{h.value}</span>
            </li>
          ))}
          <li className="ar-open" style={{ ["--o" as string]: "var(--h4)" }}>
            <Link href={`/dog/${f.id}`}>Open {f.straypaw_id ?? "this record"} <ArrowUpRight size={14} aria-hidden /></Link>
          </li>
        </ol>
        </div>

        <p className="ar-end">Every card is a profile like these. <b>{fmt(total)}</b> of them, each kept on its own StrayPaw ID.</p>
      </div>
    </section>
  );
}
