"use client";

/* ════════════════════════════════════════════════════════════════════
   The register: one profile, dealt from the crowd.

   Every dog on StrayPaw gets a public profile, so the section shows one
   as the real object it is: a registration card on warm paper, the one
   lifted thing on the night ground. Photo, name (or where it lives),
   record id, locality, on the register since, sightings, its ABC/ARV
   marks drawn honestly (filled = done, hollow = not, dotted = not
   examined) and its care on record, with the "on file" stamp landing as
   the card is dealt.

   Every few seconds the card is filed back into the register and the next
   real dog's card is dealt from the deck. Behind it the crowd of profiles
   drifts past in three depth bands, never stopping, and the dog on the
   card is ringed where it sits in the crowd: one profile, out of many.

   Holding the pointer or focus on the card holds the deal (only the card;
   the crowd keeps moving). Off screen, nothing deals. Under reduced
   motion nothing moves on its own: the card changes with the arrows and
   the crowd becomes scrollable strips.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { FramedPhoto } from "./FramedPhoto";
import { cleanPlace } from "@/lib/utils";
import type { AnimalRegister as Data, RegisterFocus } from "@/lib/landing/story";
import { RegisterPlate, type RegisterPlateData } from "./RegisterPlate";

const DEAL_MS = 5200;
const fmt = (n: number) => n.toLocaleString("en-IN");

/* "Mar 2023". Day zero (2000-01-01) means no date, so it never prints. */
function monthYear(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime()) || d.getUTCFullYear() <= 2000) return null;
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
}

type Mark = "yes" | "no" | "unknown";
const sterMark = (s: string | null): Mark => (s === "sterilised" ? "yes" : s === "not_sterilised" ? "no" : "unknown");
const vacMark = (s: string | null): Mark => (s === "vaccinated" ? "yes" : s === "not_vaccinated" ? "no" : "unknown");
const STER_TEXT: Record<Mark, string> = { yes: "Sterilised", no: "Not sterilised", unknown: "Not examined" };
const VAC_TEXT: Record<Mark, string> = { yes: "Vaccinated", no: "Not vaccinated", unknown: "Not examined" };
const careClass = (k: string) => (k === "sterilisation" ? "abc" : k === "vaccination" ? "arv" : "care");

/* How much of a profile is filled in. The deck deals the fullest records
   first, so the card opens on what a profile can hold; every value shown
   is still the dog's own. */
function richness(c: RegisterFocus): number {
  const known = (m: Mark) => (m === "yes" ? 2 : m === "no" ? 1 : 0);
  return known(sterMark(c.sterilisation)) + known(vacMark(c.vaccination))
    + Math.min(c.care.length, 4) + (c.sightings > 1 ? 1 : 0) + (c.sightings > 5 ? 1 : 0)
    + (c.first_seen ? 1 : 0) + (c.name?.trim() ? 1 : 0);
}

const PLACEHOLDER_NAME = /^(unknown|unnamed|none|na|n\/a|-+|dog)$/i;
function headline(c: RegisterFocus): string {
  const name = c.name?.trim();
  if (name && !PLACEHOLDER_NAME.test(name) && name !== c.straypaw_id) return name;
  const place = cleanPlace(c.zone);
  return place ? `The dog at ${place}` : "A resident-reported dog";
}

function Card({ c, out }: { c: RegisterFocus; out?: boolean }) {
  const ster = sterMark(c.sterilisation);
  const vac = vacMark(c.vaccination);
  const since = monthYear(c.first_seen);
  const where = [cleanPlace(c.zone), c.city].filter(Boolean).join(", ");
  const care = c.care.slice(0, 10).reverse();
  return (
    <article className={`rx-card ${out ? "is-out" : "is-in"}`} aria-hidden={out || undefined}>
      <header className="rx-card-head">
        <span>StrayPaw register</span>
        <b>{c.straypaw_id ?? "On file"}</b>
      </header>
      <div className="rx-card-photo">
        <FramedPhoto src={sized(c.cover_photo, 720)} alt={`${headline(c)}, photographed by a resident`} sid={c.straypaw_id} priority />
      </div>
      <div className="rx-card-body">
        <span className="rx-stamp" aria-hidden><small>On file</small><b>{c.city ?? "India"}</b></span>
        <h3>{headline(c)}</h3>
        <dl>
          {where && <div className="is-wide"><dt>Locality</dt><dd>{where}</dd></div>}
          {since && <div><dt>On register since</dt><dd>{since}</dd></div>}
          {c.sightings > 0 && <div><dt>Seen</dt><dd>{fmt(c.sightings)} {c.sightings === 1 ? "time" : "times"}</dd></div>}
          <div className="is-wide">
            <dt>ABC · ARV</dt>
            <dd className="rx-card-marks">
              <span><i className={`rx-mk is-${ster}`} />{STER_TEXT[ster]}</span>
              <span><i className={`rx-mk is-vac is-${vac}`} />{VAC_TEXT[vac]}</span>
            </dd>
          </div>
          {care.length > 0 && (
            <div className="is-wide">
              <dt>Care on record</dt>
              <dd className="rx-care">
                <span>
                  {care.map((e, i) => {
                    const when = monthYear(e.at);
                    return <i key={i} className={`is-${careClass(e.kind)}`} title={`${e.kind.replace(/_/g, " ")}${when ? `, ${when}` : ""}`} />;
                  })}
                </span>
                <small>{c.care.length} {c.care.length === 1 ? "event" : "events"}</small>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </article>
  );
}

function Tile({ c, feat, dup }: { c: RegisterFocus; feat: boolean; dup: boolean }) {
  return (
    <Link
      href={`/dog/${c.id}`}
      className={`rx-tile${feat ? " is-feat" : ""}`}
      aria-label={dup ? undefined : `${headline(c)}, ${c.straypaw_id ?? "on the register"}`}
      aria-hidden={dup || undefined}
      tabIndex={dup ? -1 : undefined}
    >
      <FramedPhoto src={sized(c.cover_photo, 320)} alt="" sid={c.straypaw_id} lazy />
      <span className="rx-tile-id sys-mono">{c.straypaw_id}</span>
    </Link>
  );
}

function Band({ cards, depth, dir, featId }: { cards: RegisterFocus[]; depth: "front" | "mid" | "back"; dir: "l" | "r"; featId: string }) {
  if (!cards.length) return null;
  return (
    <div className={`rx-band d-${depth} is-${dir}`}>
      <div className="rx-track" style={{ ["--n" as string]: cards.length }}>
        {[...cards, ...cards].map((c, i) => (
          <Tile key={`${c.id}-${i}`} c={c} feat={c.id === featId} dup={i >= cards.length} />
        ))}
      </div>
    </div>
  );
}

export function AnimalRegister({ data, total, plate }: { data: Data; total: number; plate?: RegisterPlateData | null }) {
  const cards = data.cards;
  const n = cards.length;
  /* A callback ref, so the observer attaches whenever the section actually
     mounts — never to a ref that was still empty when an effect ran. */
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [calm, setCalm] = useState(false);
  const [seen, setSeen] = useState(false);
  const [hold, setHold] = useState(false);
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const [prev, setPrev] = useState<RegisterFocus | null>(null);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setCalm(m.matches);
    sync(); m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  /* Deal only while the section is on screen. */
  useEffect(() => {
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [el]);

  /* The filed card leaves, then is dropped. */
  useEffect(() => {
    if (!prev) return;
    const t = setTimeout(() => setPrev(null), 650);
    return () => clearTimeout(t);
  }, [prev, tick]);

  /* Three depth bands; adjacent bands begin on different dogs. */
  const bands = useMemo(() => {
    const per = Math.ceil(n / 3);
    return [cards.slice(0, per), cards.slice(per, per * 2), cards.slice(per * 2)];
  }, [cards, n]);
  const deck = useMemo(() => [...cards].sort((a, b) => richness(b) - richness(a)), [cards]);

  if (!n || total <= 0) return null;
  const cur = deck[idx % n];
  const go = (d: number) => {
    setPrev(cur);
    setIdx((i) => (i + d + n) % n);
    setTick((t) => t + 1);
  };
  const running = !calm && seen && !hold;

  return (
    <section ref={setEl} className={`rx${calm ? " is-calm" : ""}`} aria-labelledby="rx-title">
      {plate && <RegisterPlate plate={plate} running={seen} calm={calm} />}
      <div className="rx-rail">
        <p className="rx-kicker sys-mono">The register<span className="rx-live" aria-hidden /></p>
        <h2 id="rx-title"><span className="rx-n">{fmt(total)}</span> dogs on file. <span className="rx-lbl">Every one gets a profile like&nbsp;this.</span></h2>
        <Link href="/map" className="rx-cta">Live map <ArrowUpRight size={14} aria-hidden /></Link>
      </div>

      <div className="rx-stage">
        <div className="rx-crowd" role="group" aria-label={`More of the ${fmt(total)} dogs on the register`}>
          <Band cards={bands[0]} depth="mid" dir="r" featId={cur.id} />
          <Band cards={bands[1]} depth="front" dir="l" featId={cur.id} />
          <Band cards={bands[2]} depth="back" dir="r" featId={cur.id} />
        </div>

        <div
          className="rx-deck"
          onMouseEnter={() => setHold(true)}
          onMouseLeave={() => setHold(false)}
          onFocus={() => setHold(true)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false); }}
        >
          <div className="rx-stack">
            <span className="rx-sheet is-b" aria-hidden />
            <span className="rx-sheet is-a" aria-hidden />
            <Card key={`in-${cur.id}-${tick}`} c={cur} />
            {prev && <Card key={`out-${prev.id}-${tick}`} c={prev} out />}
          </div>

          <div className="rx-deck-foot">
            <span className="rx-prog-track" aria-hidden>
              {!calm && (
                <i
                  key={tick}
                  className="rx-prog"
                  style={{ animationDuration: `${DEAL_MS}ms`, animationPlayState: running ? "running" : "paused" }}
                  onAnimationEnd={() => go(1)}
                />
              )}
            </span>
            <div className="rx-deck-row">
              <button type="button" className="rx-nav" aria-label="Previous dog" onClick={() => go(-1)}><ChevronLeft size={16} aria-hidden /></button>
              <button type="button" className="rx-nav" aria-label="Next dog" onClick={() => go(1)}><ChevronRight size={16} aria-hidden /></button>
              <span className="rx-count sys-mono">{String((idx % n) + 1).padStart(2, "0")} / {n}</span>
              <Link href={`/dog/${cur.id}`} className="rx-open">Open profile <ArrowUpRight size={14} aria-hidden /></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
