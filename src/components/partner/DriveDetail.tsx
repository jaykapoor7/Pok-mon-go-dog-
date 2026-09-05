"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackLink } from "@/components/app/BackLink";
import { CalendarRange, Loader2, MapPin, Users } from "lucide-react";
import {
  campaignAnimals,
  campaignStats,
  KIND_LABEL,
  type CampaignAnimal,
  type CampaignStats,
} from "@/lib/campaigns";

/* One drive, in full: its coverage, and the animals behind every figure.

   Each number is a filter. Clicking "Not sterilised" shows exactly those
   animals, from the same definition the figure was counted with, which is
   also the fastest way to check one is right. */

const STER = [
  { key: null, label: "All animals" },
  { key: "sterilised", label: "Sterilised" },
  { key: "not_sterilised", label: "Not sterilised" },
  { key: "unknown", label: "Status unknown" },
];

function pct(n: number | null) {
  return n === null ? "—" : `${n}%`;
}

export function DriveDetail({ id }: { id: string }) {
  const [stats, setStats] = useState<CampaignStats | null | "loading">("loading");
  const [animals, setAnimals] = useState<CampaignAnimal[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [vacc, setVacc] = useState<string | null>(null);

  useEffect(() => {
    campaignStats(id)
      .then((s) => setStats(s))
      .catch(() => setStats(null));
  }, [id]);

  useEffect(() => {
    campaignAnimals(id, filter, vacc).then(setAnimals).catch(() => setAnimals([]));
  }, [id, filter, vacc]);

  if (stats === "loading") {
    return (
      <div className="spa-empty">
        <Loader2 size={26} className="imp-spin" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="spa-empty">
        <h2>Drive not found</h2>
        <p>It may belong to another organisation, or have been removed.</p>
        <Link href="/partner/drives">Back to drives</Link>
      </div>
    );
  }

  const dateText =
    stats.starts_on && stats.ends_on && stats.starts_on !== stats.ends_on
      ? `${stats.starts_on} to ${stats.ends_on}`
      : stats.starts_on ?? "No dates set";

  return (
    <div>
      <BackLink label="All drives" to="/partner/drives" />

      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">
          {stats.name}
        </h1>
        <p className="dr-meta">
          {KIND_LABEL[stats.kind]} · <CalendarRange size={13} /> {dateText}
          {stats.zone && (
            <>
              {" · "}
              <MapPin size={13} /> {stats.zone}
            </>
          )}
          {stats.people > 0 && (
            <>
              {" · "}
              <Users size={13} /> {stats.people}{" "}
              {stats.people === 1 ? "person" : "people"}
            </>
          )}
        </p>
      </header>

      <section className="pgm" aria-label="Drive coverage">
        <div className="pgm-block">
          <h2>
            Sterilisation <span>in this drive</span>
          </h2>
          <div className="pgm-grid">
            <div className="pgm-figure">
              <b className="pgm-value">{stats.total}</b>
              <span>Animals</span>
            </div>
            <div className="pgm-figure">
              <b className="pgm-value good">{stats.sterilised}</b>
              <span>Sterilised</span>
            </div>
            <div className="pgm-figure">
              <b className="pgm-value warn">{stats.not_sterilised}</b>
              <span>Not sterilised</span>
            </div>
            <div className="pgm-figure">
              <b className="pgm-value muted">{stats.ster_unknown}</b>
              <span>Status unknown</span>
            </div>
          </div>
          <p className="pgm-pct">
            <b>{pct(stats.ster_pct_of_known)}</b> of the animals whose status
            you established in this drive are sterilised.
            {stats.ster_unknown > 0 && (
              <>
                {" "}
                Across everything recorded in it, <b>{pct(stats.ster_pct_of_all)}</b>,
                because {stats.ster_unknown}{" "}
                {stats.ster_unknown === 1 ? "animal was" : "animals were"} not
                checked.
              </>
            )}
          </p>
        </div>

        <div className="pgm-block">
          <h2>
            Rabies <span>in this drive</span>
          </h2>
          <div className="pgm-grid">
            <div className="pgm-figure">
              <b className="pgm-value good">{stats.vaccinated}</b>
              <span>Vaccinated</span>
            </div>
            <div className="pgm-figure">
              <b className="pgm-value warn">{stats.not_vaccinated}</b>
              <span>Not vaccinated</span>
            </div>
            <div className="pgm-figure">
              <b className="pgm-value muted">{stats.vacc_unknown}</b>
              <span>Status unknown</span>
            </div>
            <div className="pgm-figure">
              <b className="pgm-value">{pct(stats.vacc_pct_of_known)}</b>
              <span>Of those checked</span>
            </div>
          </div>
        </div>

        <div className="pgm-strip">
          <span>
            <b>{stats.observations}</b> observation
            {stats.observations === 1 ? "" : "s"} filed
          </span>
          <span>
            <b>{stats.needs_help}</b> needing attention
          </span>
        </div>
      </section>

      <section className="dr-animals">
        <div className="dr-filters" role="group" aria-label="Filter animals">
          {STER.map((f) => (
            <button
              key={f.label}
              type="button"
              className={filter === f.key ? "on" : ""}
              aria-pressed={filter === f.key}
              onClick={() => {
                setFilter(f.key);
                setVacc(null);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {animals.length === 0 ? (
          <p className="dr-none">
            No animals match. File observations into this drive from{" "}
            <Link href="/partner/incoming">Incoming</Link>.
          </p>
        ) : (
          <ul className="dr-animal-list">
            {animals.map((a) => (
              <li key={a.id}>
                <Link href={`/dog/${a.id}`}>
                  {a.cover_photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.cover_photo} alt="" loading="lazy" />
                  ) : (
                    <span className="inc-nophoto" aria-hidden />
                  )}
                  <span>
                    <b>{a.name || a.code || "Unnamed"}</b>
                    <small>
                      {a.zone || "No zone"} ·{" "}
                      {a.sterilisation_status === "sterilised"
                        ? "Sterilised"
                        : a.sterilisation_status === "not_sterilised"
                          ? "Not sterilised"
                          : "Sterilisation unknown"}
                    </small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
