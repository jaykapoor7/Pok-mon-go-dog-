"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Dog, Sighting } from "@/lib/types";

/* ════════════════════════════════════════════════════════════════════
   The console's charts.

   Three bare integers stood here — recorded, needing help, care status
   known — set in large type with a caption under each. A number on its
   own tells somebody nothing: 9 animals is either most of a street or
   almost none of a city, and the reader has no way to know which. Every
   figure below sits inside a shape that carries its own scale.

   PALETTE. Two hues, and they were validated rather than chosen by eye:
   #2457ce and #c1391c, run through the six checks against both console
   surfaces (#fffdf9 panels and the #f3ede4 ground). Lightness band,
   chroma floor, CVD separation (worst adjacent pair ΔE 27.2 protan),
   normal-vision floor (ΔE 33.8) and contrast all pass.

   There is deliberately no third hue for "not examined". A neutral fails
   the chroma floor by construction — that is what being neutral means —
   and the attempt to force one through produced a grey that also failed
   contrast. The correct reading is that "not examined" is not a category
   at all: it is the part of the bar nobody has filled in yet. So it is
   drawn as the unfilled track, which is both honest and one fewer colour
   to explain.

   Sparse data is the normal case here and none of these hide it. A
   register with four animals in it draws four animals' worth of bar.
   ════════════════════════════════════════════════════════════════════ */

function pct(n: number, of: number) {
  if (!of) return "0%";
  return `${Math.round((n / of) * 100)}%`;
}

/* ── Care coverage ─────────────────────────────────────────────────
   The product's whole thesis in one bar: of the animals on this map,
   how many has anybody actually examined? */
export function CoverageBar({ dogs }: { dogs: Dog[] }) {
  const total = dogs.length;
  const sterilised = dogs.filter((d) => d.sterilisation_status === "sterilised").length;
  const notSterilised = dogs.filter((d) => d.sterilisation_status === "not_sterilised").length;
  const unexamined = total - sterilised - notSterilised;

  return (
    <figure className="cc cc-coverage">
      <figcaption>
        <b>Care status</b>
        <span>{total === 0 ? "No animals in view" : `${total} animal${total === 1 ? "" : "s"} in view`}</span>
      </figcaption>

      {/* The track IS "not examined". A 2px gap separates the two filled
          segments, per the mark spec — adjacent fills never touch. */}
      <div className="cc-bar" role="img"
        aria-label={`${sterilised} sterilised, ${notSterilised} not sterilised, ${unexamined} not examined, of ${total}`}>
        {total > 0 && (
          <>
            <i className="seg-ster" style={{ width: `${(sterilised / total) * 100}%` }} />
            <i className="seg-not" style={{ width: `${(notSterilised / total) * 100}%` }} />
          </>
        )}
      </div>

      {/* Legend and direct labels both: identity is never colour alone. */}
      <ul className="cc-legend">
        <li>
          <i className="seg-ster" />
          <span>Sterilised</span>
          <b>{sterilised}</b>
        </li>
        <li>
          <i className="seg-not" />
          <span>Not sterilised</span>
          <b>{notSterilised}</b>
        </li>
        <li>
          <i className="seg-none" />
          <span>Not examined</span>
          <b>{unexamined}</b>
        </li>
      </ul>

      <p className="cc-note">
        {total === 0
          ? "The first record starts this."
          : `${pct(unexamined, total)} of the animals here have never been checked.`}
      </p>
    </figure>
  );
}

/* ── Reports over time ─────────────────────────────────────────────
   Twelve weeks, one series, so no legend — the caption names it. An
   area rather than a line because the quantity is a count of events,
   and the filled shape reads as accumulation. */
export function ReportsOverTime({ sightings }: { sightings: Sighting[] }) {
  return (
    <WeeklyTrend
      dates={sightings.map((s) => s.created_at)}
      title="Reports, last 12 weeks"
      noun="filed"
      empty="This fills in as people report what they see."
    />
  );
}

/* The same twelve-week shape, for anything with a date on it — and the
   one chart on the site you can actually interrogate.

   A sparkline answers "is it going up?". The question somebody running
   field work actually has is "what happened in the week of the 12th?",
   and a static shape cannot answer it. So this one carries a cursor:
   move along it and the readout names the week, its date range and its
   count. It opens on the most recent week rather than blank, because the
   first frame should already show the value most people came for.

   TIME IS QUANTISED TO THE UTC DAY, deliberately. This component renders
   on the server and again when it hydrates, and a raw Date.now() taken
   milliseconds apart can land either side of a week boundary — which
   silently produces a different set of buckets on the client than the
   markup the server sent, and React then has to patch a chart that looked
   correct. Flooring to the day makes both passes agree.

   The marker and the guideline are HTML, not SVG. The plot uses
   preserveAspectRatio="none" so the path stretches to whatever width it
   is given, which is right for a line and wrong for a circle — an SVG dot
   in here renders as an ellipse, wider the wider the panel. Positioning
   them as absolutely-placed HTML in percentages keeps the dot round. */
export function WeeklyTrend({
  dates,
  title,
  noun,
  empty,
}: {
  dates: (string | null | undefined)[];
  title: string;
  noun: string;
  empty: string;
}) {
  const WEEKS = 12;
  const DAY = 24 * 60 * 60 * 1000;
  const week = 7 * DAY;

  const { buckets, peak, spans, total } = useMemo(() => {
    const now = Math.floor(Date.now() / DAY) * DAY;
    const b = Array.from({ length: WEEKS }, () => 0);
    for (const d of dates) {
      const t = d ? Date.parse(d) : NaN;
      if (Number.isNaN(t)) continue;
      const back = Math.floor((now - t) / week);
      if (back >= 0 && back < WEEKS) b[WEEKS - 1 - back] += 1;
    }
    /* Explicit UTC, for the same reason the origin is floored: the server
       formats in UTC and the reader's browser would otherwise format in
       its own zone, and the two labels would disagree. */
    const fmt = (ms: number) =>
      new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
    const sp = b.map((_, i) => {
      const endMs = now - (WEEKS - 1 - i) * week;
      return `${fmt(endMs - week)} – ${fmt(endMs - DAY)}`;
    });
    return { buckets: b, peak: Math.max(1, ...b), spans: sp, total: b.reduce((x, y) => x + y, 0) };
  }, [dates, DAY, week]);

  const W = 300;
  const H = 64;
  const PAD = 6;
  const plotW = W - PAD;
  const step = plotW / (WEEKS - 1);
  const pointY = (v: number) => H - (v / peak) * (H - 8) - 3;
  const line = buckets.map((v, i) => `${i * step},${pointY(v)}`).join(" ");
  const area = `0,${H} ${line} ${plotW},${H}`;

  /* The cursor rests on the latest week. null is never a state here —
     "nothing selected" would mean the readout has to empty itself, and a
     panel that goes blank when your finger leaves it reads as broken. */
  const [at, setAt] = useState(WEEKS - 1);
  const plot = useRef<HTMLDivElement>(null);

  const pick = useCallback((clientX: number) => {
    const el = plot.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const ratio = (clientX - r.left) / r.width;
    const i = Math.round(ratio * (WEEKS - 1));
    setAt(Math.min(WEEKS - 1, Math.max(0, i)));
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (d) {
      e.preventDefault();
      setAt((v) => Math.min(WEEKS - 1, Math.max(0, v + d)));
      return;
    }
    if (e.key === "Home") { e.preventDefault(); setAt(0); }
    if (e.key === "End") { e.preventDefault(); setAt(WEEKS - 1); }
  };

  /* Percentages, so the overlay tracks the stretched plot exactly. */
  const leftPct = (at * step / W) * 100;
  const topPct = (pointY(buckets[at]) / H) * 100;
  const count = buckets[at];

  return (
    <figure className="cc cc-time">
      <figcaption>
        <b>{title}</b>
        <span>{total === 0 ? "Nothing yet" : `${total} ${noun}`}</span>
      </figcaption>

      <div
        ref={plot}
        className="cc-plot"
        role="slider"
        tabIndex={0}
        aria-label={`${title}, by week. Move to read a week.`}
        aria-valuemin={0}
        aria-valuemax={WEEKS - 1}
        aria-valuenow={at}
        aria-valuetext={`${spans[at]}: ${count} ${count === 1 ? noun.replace(/s$/, "") : noun}`}
        onKeyDown={onKey}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setAt(WEEKS - 1)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="cc-spark" aria-hidden>
          <line x1="0" y1={H - 1} x2={W} y2={H - 1} className="cc-axis" />
          <polygon points={area} className="cc-area" />
          <polyline points={line} className="cc-line" />
        </svg>

        <span className="cc-guide" style={{ left: `${leftPct}%` }} aria-hidden />
        <span className="cc-marker" style={{ left: `${leftPct}%`, top: `${topPct}%` }} aria-hidden />
      </div>

      {/* One live region, so a screen reader hears the week change rather
          than being read the whole chart again. */}
      <p className="cc-readout" aria-live="polite">
        {total === 0 ? (
          empty
        ) : (
          <>
            <b>{count}</b> {count === 1 ? noun.replace(/s$/, "") : noun}
            <span>{spans[at]}</span>
          </>
        )}
      </p>
    </figure>
  );
}

/* ── Records per locality ──────────────────────────────────────────
   Magnitude with identity attached, so: horizontal bars, longest first,
   labels on the left where the eye starts. One hue — this is a single
   measure, not six categories. */
export function ByLocality({ dogs }: { dogs: Dog[] }) {
  const counts = dogs.reduce<Record<string, number>>((acc, d) => {
    const z = (d.zone || "").trim();
    if (z) acc[z] = (acc[z] ?? 0) + 1;
    return acc;
  }, {});
  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const peak = rows[0]?.[1] ?? 1;

  return (
    <figure className="cc cc-zones">
      <figcaption>
        <b>Where the records are</b>
        <span>{rows.length ? "busiest localities" : "no localities yet"}</span>
      </figcaption>

      {rows.length > 0 ? (
        <ul>
          {rows.map(([zone, n], i) => (
            <li key={zone} style={{ "--i": i } as React.CSSProperties}>
              <span className="cc-z-name" title={zone}>{zone}</span>
              <span className="cc-z-track">
                <i style={{ "--w": `${(n / peak) * 100}%` } as React.CSSProperties} />
              </span>
              <b>{n}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cc-note">A locality is recorded with every sighting.</p>
      )}
    </figure>
  );
}
