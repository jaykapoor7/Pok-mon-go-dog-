"use client";

/* ════════════════════════════════════════════════════════════════════
   Profiles: what StrayPaw keeps for each animal, shown with real ones.

   On the left, a wall of the photographs residents took, one tile per
   animal. On the right, the chosen animal's profile laid out the way the
   record holds it: its StrayPaw ID, where it lives (to its locality),
   when it was first and last seen, what it was reported for, what care
   it has had, and the two checks a programme is measured on. Every line
   is either filled from the record or drawn as not recorded yet, so the
   profile shows how it grows as more people see the animal.

   The wall moves through the animals on its own while it is on screen and
   waits while someone is choosing. Under the wall, the register's totals
   in plain words. Under reduced motion nothing moves on its own.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";
import type { ProfileWall as Data, WallProfile } from "@/lib/landing/story";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const date = (iso: string | null) => { if (!iso) return null; const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const fmt = (n: number) => n.toLocaleString("en-IN");
const place = (p: WallProfile) => cleanPlace(p.zone) || null;
const labelOf = (p: WallProfile) => (p.name && p.name.trim()) || `A dog near ${place(p) || p.city || "the reported spot"}`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const careWord = (k: string) => k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
type Check = "yes" | "no" | "unknown";
const checkOf = (v: string | null): Check => { const s = (v ?? "").toLowerCase(); return ["yes", "true", "sterilised", "sterilized", "vaccinated", "done"].includes(s) ? "yes" : ["no", "false", "not_sterilised", "not_vaccinated", "intact"].includes(s) ? "no" : "unknown"; };
const HOLD = 5200;
const WALL = 36;

/* One line of the profile: filled from the record, or not recorded yet. */
type Line = { k: string; what: string; value: string; known: boolean };
function linesOf(p: WallProfile): Line[] {
  const seen = p.sightings_count ?? 1;
  const first = date(p.first_seen), last = date(p.last_seen);
  const ster = checkOf(p.sterilisation_status), vac = checkOf(p.vaccination_status);
  return [
    { k: "seen", what: "Seen", known: true, value: `${plural(seen, "sighting")} · first ${first ?? "—"}${last && last !== first ? `, last ${last}` : ""}` },
    { k: "where", what: "Lives around", known: !!(place(p) || p.city), value: [place(p), p.city].filter(Boolean).join(", ") || "Not recorded" },
    { k: "asked", what: "Reported for", known: true, value: p.requests.length ? p.requests.map((r) => `${r.condition ?? "Help"} · ${date(r.at)}${r.closed ? " · closed" : ""}`).join("; ") : p.help ? "Flagged as needing help" : "Nothing wrong reported" },
    { k: "care", what: "Care given", known: p.care.length > 0, value: p.care.length ? p.care.slice(-3).map((c) => `${careWord(c.kind)} · ${date(c.at)}`).join("; ") : "None recorded yet" },
    { k: "ster", what: "Sterilised", known: ster !== "unknown", value: ster === "yes" ? "Yes, recorded" : ster === "no" ? "Recorded as not yet" : "Not examined yet" },
    { k: "vac", what: "Vaccinated", known: vac !== "unknown", value: vac === "yes" ? "Yes, recorded" : vac === "no" ? "Recorded as not yet" : "Not examined yet" },
  ];
}

export function ProfileWall({ data }: { data: Data }) {
  const wall = data.photos.slice(0, WALL);
  const [at, setAt] = useState(0);
  const [live, setLive] = useState(false);
  const [seen, setSeen] = useState(false);
  const [calm, setCalm] = useState(false);
  const held = useRef(0);
  const sec = useRef<HTMLElement>(null);

  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const node = sec.current; if (!node) return;
    const io = new IntersectionObserver(([e]) => { setLive(e.isIntersecting); if (e.isIntersecting) setSeen(true); }, { threshold: 0.25 });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (calm || !live || wall.length < 2) return;
    const id = window.setInterval(() => { if (Date.now() - held.current > 12_000) setAt((i) => (i + 1) % wall.length); }, HOLD);
    return () => window.clearInterval(id);
  }, [calm, live, wall.length]);
  const choose = useCallback((i: number) => { held.current = Date.now(); setAt(i); }, []);

  if (wall.length < 4) return null;
  const p = wall[at];
  const lines = linesOf(p);

  return (
    <section ref={sec} className={`pw ${seen ? "is-seen" : ""}`} aria-labelledby="pw-title">
      <div className="pw-in">
        <header className="pw-head">
          <p className="pw-kicker sys-mono">Animal profiles</p>
          <h2 id="pw-title">Every dog on the record has a profile. <em>These are real ones.</em></h2>
          <p className="pw-lede">One StrayPaw ID for each animal. Every sighting, request for help and treatment lands on it, whoever records it, so the next person sees what was already done. These photographs were taken by residents.</p>
        </header>

        <div className="pw-stage">
          <ol className="pw-wall" aria-label="Photographed animals on the record">
            {wall.map((w, i) => (
              <li key={w.id} style={{ ["--i" as string]: i }}>
                <button type="button" aria-pressed={i === at} aria-label={labelOf(w)} className={`${i === at ? "is-on" : ""} ${w.help ? "is-help" : ""}`}
                  onClick={() => choose(i)} onMouseEnter={() => { held.current = Date.now(); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sized(w.cover_photo, 240)} alt="" loading="lazy" />
                </button>
              </li>
            ))}
          </ol>

          <article className="pw-card" aria-live="polite">
            <Link href={`/dog/${p.id}`} className="pw-photo" key={`ph-${p.id}`} aria-label={`${labelOf(p)}: open the profile`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sized(p.cover_photo, 720)} alt={`${labelOf(p)}, photographed by a resident`} />
              <span className="pw-stamp sys-mono">{p.straypaw_id ?? "ID pending"}</span>
            </Link>
            <div className="pw-file" key={`f-${p.id}`}>
              <p className="pw-id sys-mono">StrayPaw profile · {p.source === "resident" ? "reported by a resident" : "on the record"}</p>
              <h3>{labelOf(p)}</h3>
              <ul className="pw-lines">
                {lines.map((l, i) => (
                  <li key={l.k} className={l.known ? "is-known" : "is-open"} style={{ ["--i" as string]: i }}>
                    <i aria-hidden />
                    <span className="pw-what">{l.what}</span>
                    <span className="pw-val">{l.value}</span>
                  </li>
                ))}
              </ul>
              <p className="pw-grow">Hatched lines fill in as field teams and residents add to this ID.</p>
              <Link href={`/dog/${p.id}`} className="pw-go">Open this profile <ArrowUpRight size={14} aria-hidden /></Link>
            </div>
          </article>
        </div>

        <dl className="pw-figs">
          <div><dt>animals have a profile</dt><dd>{fmt(data.total)}</dd></div>
          <div className="is-hot"><dt>are flagged as needing help</dt><dd>{fmt(data.help)}</dd></div>
          <div className="is-open"><dt>have never been examined for sterilisation</dt><dd>{fmt(data.unexamined)}</dd></div>
          <div><dt>have a resident&apos;s photograph</dt><dd>{fmt(data.photos.length)}</dd></div>
        </dl>
        <p className="pw-foot sys-mono">Recorded animals, not population · places shown to the locality, never an address</p>
      </div>
    </section>
  );
}
