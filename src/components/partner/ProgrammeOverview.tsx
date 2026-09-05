"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { programmeStats, type ProgrammeStats } from "@/lib/programme";

/* ════════════════════════════════════════════════════════════════════
   ABC and rabies programme, at the top of the organisation's dashboard.

   These come from org_programme_stats(), which counts the same table and
   the same columns the animal list filters on, so a number here and the
   list behind it cannot drift apart. Each figure links to its own filtered
   list, which is also the fastest way to check one.

   Two percentages, deliberately. Coverage of the animals whose status was
   actually established is the honest ABC figure; coverage of everything
   recorded is the one that gets quoted. Showing both, labelled, stops the
   unknowns from silently becoming negatives.
   ════════════════════════════════════════════════════════════════════ */

function Figure({
  value,
  label,
  href,
  tone,
}: {
  value: number | string;
  label: string;
  href?: string;
  tone?: "good" | "warn" | "muted";
}) {
  const body = (
    <>
      <b className={`pgm-value ${tone ?? ""}`}>{value}</b>
      <span>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="pgm-figure">
      {body}
    </Link>
  ) : (
    <div className="pgm-figure">{body}</div>
  );
}

export function ProgrammeOverview() {
  const [stats, setStats] = useState<ProgrammeStats | null | "loading">("loading");

  useEffect(() => {
    let live = true;
    programmeStats()
      .then((s) => live && setStats(s))
      .catch(() => live && setStats(null));
    return () => {
      live = false;
    };
  }, []);

  if (stats === "loading") {
    return (
      <div className="pgm-loading">
        <Loader2 size={16} className="imp-spin" /> Loading programme totals…
      </div>
    );
  }

  /* No organisation on this account, or no backend. The dashboard's other
     panels already explain signing in, so this stays quiet rather than
     repeating it. */
  if (!stats) return null;

  const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

  return (
    <section className="pgm" aria-label="Programme totals">
      <div className="pgm-block">
        <h2>
          Sterilisation <span>ABC programme</span>
        </h2>
        <div className="pgm-grid">
          <Figure value={stats.total} label="Animals recorded" href="/partner/animals" />
          <Figure
            value={stats.sterilised}
            label="Sterilised"
            tone="good"
            href="/partner/animals?ster=sterilised"
          />
          <Figure
            value={stats.not_sterilised}
            label="Not sterilised"
            tone="warn"
            href="/partner/animals?ster=not_sterilised"
          />
          <Figure
            value={stats.ster_unknown}
            label="Status unknown"
            tone="muted"
            href="/partner/animals?ster=unknown"
          />
        </div>
        <p className="pgm-pct">
          <b>{pct(stats.ster_pct_of_known)}</b> of the animals whose status you
          have established are sterilised.
          {stats.ster_unknown > 0 && (
            <>
              {" "}
              Across everything recorded it is{" "}
              <b>{pct(stats.ster_pct_of_all)}</b>, because {stats.ster_unknown}{" "}
              {stats.ster_unknown === 1 ? "animal has" : "animals have"} not been
              checked yet.
            </>
          )}
        </p>
      </div>

      <div className="pgm-block">
        <h2>
          Rabies <span>vaccination</span>
        </h2>
        <div className="pgm-grid">
          <Figure
            value={stats.vaccinated}
            label="Vaccinated"
            tone="good"
            href="/partner/animals?vacc=vaccinated"
          />
          <Figure
            value={stats.not_vaccinated}
            label="Not vaccinated"
            tone="warn"
            href="/partner/animals?vacc=not_vaccinated"
          />
          <Figure
            value={stats.vacc_unknown}
            label="Status unknown"
            tone="muted"
            href="/partner/animals?vacc=unknown"
          />
          <Figure value={pct(stats.vacc_pct_of_known)} label="Of those checked" />
        </div>
      </div>

      <div className="pgm-strip">
        <Link href="/partner/animals?needs=1">
          <b>{stats.needs_help}</b> needing attention
        </Link>
        <Link href="/partner/animals">
          <b>{stats.added_7d}</b> added this week
        </Link>
        <Link href="/partner/animals">
          <b>{stats.added_30d}</b> in the last 30 days
        </Link>
      </div>
    </section>
  );
}
