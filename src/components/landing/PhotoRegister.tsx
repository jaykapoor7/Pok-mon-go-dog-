"use client";

/* ════════════════════════════════════════════════════════════════════
   Photographed onto the record: the register, in portraits.

   The landing already shows the city twice on a map, so this section is
   about the animals themselves. Each photographed animal is a record card
   on a small deck: the resident's photograph in a viewfinder, its
   StrayPaw ID stamped onto it as the card lands, and beside it the file
   as the register keeps it (where, since when, how often seen, who
   reported it) with sterilisation and vaccination drawn in their real
   state, hatched where nobody has examined the animal yet.

   The deck deals itself while it is on screen: a thin rule under the card
   runs down and the next card comes to the top. Hovering holds it. Under
   the deck every photographed animal runs past in two slow rows, in the
   record's blue until chosen. Under reduced motion nothing deals or runs:
   the deck moves only when asked and the rows are a still contact sheet.
   It does not exist below four photographs.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";

export type PhotoRow = {
  id: string; name: string | null; straypaw_id: string | null; cover_photo: string; zone: string | null; city: string | null;
  first_seen: string | null; last_seen: string | null; sightings_count: number | null; source: string | null;
  sterilisation_status: string | null; vaccination_status: string | null;
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const date = (iso: string | null) => { if (!iso) return null; const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const place = (r: PhotoRow) => cleanPlace(r.zone) || null;
const label = (r: PhotoRow) => (r.name && r.name.trim()) || `A dog near ${place(r) || r.city || "the reported spot"}`;
const pad = (n: number) => String(n).padStart(2, "0");

/* The three states a check can be in. Nobody having looked is its own
   state, drawn hatched, never counted as "no". */
type Check = "yes" | "no" | "unknown";
const checkOf = (v: string | null): Check => {
  const s = (v ?? "").toLowerCase();
  if (["yes", "true", "done", "sterilised", "sterilized", "vaccinated", "confirmed"].includes(s)) return "yes";
  if (["no", "false", "not_sterilised", "not_vaccinated", "intact", "none"].includes(s)) return "no";
  return "unknown";
};
const CHECK_TEXT: Record<Check, string> = { yes: "Recorded", no: "Recorded as not done", unknown: "Not examined" };
const SOURCE_TEXT: Record<string, string> = { resident: "A resident, from a phone", ngo: "A field team", import: "An imported register" };

export function PhotoRegister({ rows, total }: { rows: PhotoRow[]; total?: number }) {
  const deck = useMemo(() => rows.slice(0, 24), [rows]);
  const n = deck.length;
  const [at, setAt] = useState(0);
  const [live, setLive] = useState(false);
  const [calm, setCalm] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const node = wrap.current; if (!node) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.3 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  if (n < 4) return null;
  const go = (i: number) => setAt(((i % n) + n) % n);
  /* The cards in play: the one that just left, the top card, and the two
     under it. Keyed by animal, so each card slides between places. */
  const hand = [-1, 0, 1, 2].map((k) => ({ k, r: deck[(at + k + n) % n] }));
  const rowA = deck.filter((_, i) => i % 2 === 0), rowB = deck.filter((_, i) => i % 2 === 1);

  return (
    <div className={`pr ${live ? "is-live" : ""} ${calm ? "is-calm" : ""}`} ref={wrap}>
      <div className="pr-head">
        <h2 className="pr-title">Photographed <em>onto the&nbsp;record.</em></h2>
        <p className="sys-mono">{total && total > n ? `${total.toLocaleString("en-IN")} photographed by residents` : "Photographed by residents"} · each with its own ID</p>
      </div>

      <div className="pr-stage">
        <div className="pr-deck" aria-live="polite">
          {hand.map(({ k, r }) => {
            const ster = checkOf(r.sterilisation_status), vac = checkOf(r.vaccination_status);
            const idx = (at + k + n) % n;
            return (
              <article key={r.id} className={`pr-card is-${k < 0 ? "gone" : `p${k}`}`} aria-hidden={k !== 0} inert={k !== 0 ? true : undefined}>
                <Link href={`/dog/${r.id}`} className="pr-photo" tabIndex={k === 0 ? 0 : -1} aria-label={`${label(r)}: open the record`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sized(r.cover_photo, 720)} alt={k === 0 ? `${label(r)}, photographed on the street` : ""} loading={k <= 1 ? "eager" : "lazy"} />
                  <span className="pr-crop" aria-hidden><i /><i /><i /><i /></span>
                  <span className="pr-stamp sys-mono">{r.straypaw_id ?? "ID pending"}</span>
                </Link>
                <div className="pr-file">
                  <p className="pr-no sys-mono">Record {pad(idx + 1)} <span>/ {pad(n)}</span></p>
                  <h3>{label(r)}</h3>
                  <dl className="pr-rows">
                    <div><dt>Place</dt><dd>{[place(r), r.city].filter(Boolean).join(", ") || "Not recorded"}</dd></div>
                    <div><dt>On the record since</dt><dd className="sys-mono">{date(r.first_seen) ?? "Not recorded"}</dd></div>
                    <div><dt>Last seen</dt><dd className="sys-mono">{date(r.last_seen) ?? "Not recorded"}</dd></div>
                    <div><dt>Sightings</dt><dd className="sys-mono">{r.sightings_count ?? 1}</dd></div>
                    <div><dt>Reported by</dt><dd>{SOURCE_TEXT[r.source ?? ""] ?? "Recorded on StrayPaw"}</dd></div>
                  </dl>
                  <ul className="pr-checks" aria-label="Health checks on the record">
                    <li className={`is-${ster}`}><i aria-hidden /><b>Sterilised</b><span>{CHECK_TEXT[ster]}</span></li>
                    <li className={`is-${vac}`}><i aria-hidden /><b>Vaccinated</b><span>{CHECK_TEXT[vac]}</span></li>
                  </ul>
                  <Link href={`/dog/${r.id}`} className="pr-go" tabIndex={k === 0 ? 0 : -1}>Open the record <ArrowUpRight size={14} aria-hidden /></Link>
                </div>
              </article>
            );
          })}
        </div>
        <div className="pr-ctl">
          <button type="button" className="pr-btn" onClick={() => go(at - 1)} aria-label="Previous animal"><ArrowLeft size={17} /></button>
          <span className="pr-run" aria-hidden>
            {!calm && <i key={at} onAnimationEnd={() => go(at + 1)} />}
          </span>
          <button type="button" className="pr-btn" onClick={() => go(at + 1)} aria-label="Next animal"><ArrowRight size={17} /></button>
        </div>
      </div>

      <div className="pr-sheet" aria-label="Every photographed animal">
        {[rowA, rowB].map((row, ri) => (
          <div key={ri} className={`pr-row ${ri ? "is-back" : ""}`}>
            <ol>
              {[...row, ...row].map((p, i) => {
                const di = deck.indexOf(p);
                const dup = i >= row.length;
                return (
                  <li key={`${p.id}-${i}`} aria-hidden={dup || undefined}>
                    <button type="button" onClick={() => go(di)} tabIndex={dup ? -1 : 0} aria-pressed={di === at} aria-label={label(p)} className={di === at ? "is-on" : ""}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sized(p.cover_photo, 160)} alt="" loading="lazy" />
                      <span className="sys-mono">{p.straypaw_id?.slice(-6) ?? ""}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
