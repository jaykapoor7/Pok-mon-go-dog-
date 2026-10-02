"use client";

/* ════════════════════════════════════════════════════════════════════
   The register, drawn as what it actually is: a kept archive.

   Not a wall of pretty cards — a living contact sheet of filed records.
   Across the night ground, rows of real resident photographs advance in
   an endless loop (adjacent rows drift opposite ways). Each frame is an
   entry in the register: a contact-sheet frame number, the dog's StrayPaw
   record id, and — the moment it has your attention — the record itself
   slides up: where it was found, when it was first seen, and its honest
   ABC/ARV marks (filled = done, hollow = not, dashed = not examined).

   The dogs and their records are the whole point; nothing here is
   decoration. Each row duplicates its entries so the loop is seamless and
   pauses on hover or focus. Under reduced motion the rows hold still as a
   scrollable strip, so every record stays reachable.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";
import type { AnimalRegister as Data, RegisterFocus } from "@/lib/landing/story";

const fmt = (n: number) => n.toLocaleString("en-IN");
const placeOf = (c: RegisterFocus) => [cleanPlace(c.zone), c.city].filter(Boolean).join(" · ") || "On the record";

/* first_seen → a short ledger year, "'19". Guards the day-zero sentinel. */
function sinceYear(iso: string | null): string | null {
  if (!iso) return null;
  const y = new Date(iso).getFullYear();
  return Number.isFinite(y) && y > 1990 ? `’${String(y).slice(2)}` : null;
}

type Mark = "yes" | "no" | "unknown";
const sterMark = (s: string | null): Mark => (s === "sterilised" ? "yes" : s === "not_sterilised" ? "no" : "unknown");
const vacMark = (s: string | null): Mark => (s === "vaccinated" ? "yes" : s === "not_vaccinated" ? "no" : "unknown");

function Entry({ c, no }: { c: RegisterFocus; no: string }) {
  const place = placeOf(c);
  const since = sinceYear(c.first_seen);
  const ster = sterMark(c.sterilisation);
  const vac = vacMark(c.vaccination);
  return (
    <Link href={`/dog/${c.id}`} className="rx-entry" aria-label={`${c.straypaw_id ?? "A recorded dog"} — ${place}`}>
      <div className="rx-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sized(c.cover_photo, 420)}
          alt={`A dog on the register near ${cleanPlace(c.zone) || c.city || "the reported spot"}, photographed by a resident`}
          loading="lazy"
        />
        <span className="rx-no sys-mono" aria-hidden>{no}</span>
        {/* Resting: the one value every screen agrees on — the record id. */}
        <span className="rx-tag sys-mono">{c.straypaw_id ?? "ON FILE"}</span>
        {/* The record slip, revealed on attention. */}
        <div className="rx-slip" aria-hidden>
          <span className="rx-slip-place">{place}</span>
          <span className="rx-marks">
            <i className={`rx-mk is-${ster}`} />ABC
            <i className={`rx-mk is-vac is-${vac}`} />ARV
            {since && <em>since {since}{c.sightings ? ` · ${fmt(c.sightings)} seen` : ""}</em>}
          </span>
        </div>
      </div>
    </Link>
  );
}

function Row({ cards, dir, start }: { cards: RegisterFocus[]; dir: "l" | "r"; start: number }) {
  if (!cards.length) return null;
  const no = (i: number) => String(start + (i % cards.length) + 1).padStart(4, "0");
  return (
    <div className={`rx-row is-${dir}`}>
      <div className="rx-track" style={{ ["--n" as string]: cards.length }}>
        {[...cards, ...cards].map((c, i) => <Entry key={`${c.id}-${i}`} c={c} no={no(i)} />)}
      </div>
    </div>
  );
}

export function AnimalRegister({ data, total }: { data: Data; total: number }) {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setCalm(m.matches);
    sync(); m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  const cards = data.cards;
  if (!cards.length || total <= 0) return null;
  /* Three rows; split so adjacent rows don't begin on the same dog. With few
     cards it falls back to one or two rows. */
  const per = Math.ceil(cards.length / 3);
  const rows = [cards.slice(0, per), cards.slice(per, per * 2), cards.slice(per * 2)].filter((r) => r.length >= 2);

  return (
    <section className={`rx ${calm ? "is-calm" : ""}`} aria-labelledby="rx-title">
      <div className="rx-rail">
        <p className="rx-kicker sys-mono">The register<span className="rx-live" aria-hidden /></p>
        <h2 id="rx-title"><span className="rx-n">{fmt(total)}</span> <span className="rx-lbl">dogs on file, one profile each</span></h2>
        <Link href="/map" className="rx-cta">Live map <ArrowUpRight size={14} aria-hidden /></Link>
      </div>

      <div className="rx-wall" role="list" aria-label={`A sample of the ${fmt(total)} dogs on the register`}>
        {rows.map((r, i) => <Row key={i} cards={r} dir={i % 2 === 0 ? "l" : "r"} start={i * per} />)}
        <span className="rx-edge is-left" aria-hidden />
        <span className="rx-edge is-right" aria-hidden />
      </div>
    </section>
  );
}
