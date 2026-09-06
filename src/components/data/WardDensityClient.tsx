"use client";

import { useEffect, useMemo, useState } from "react";
import { MapCanvas } from "@/components/map/MapCanvas";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import {
  WARD_METRICS,
  WARD_RAMP,
  WARD_UNSURVEYED,
  getWardCoverage,
  getWardDensity,
  type WardCoverage,
  type WardFeatureCollection,
  type WardMetric,
  type WardProps,
  type AreaLevel,
  AREA_NOUN,
  getWardCities,
} from "@/lib/wards";

/**
 * Ward density, the view a municipality or a funder is handed.
 *
 * The design argument is the order of the page. Coverage comes first, before
 * any rate, because "we have surveyed 2 of 200 wards" is the sentence that
 * qualifies everything under it. A sterilisation percentage printed above
 * that number invites the reader to take it as a city-wide figure, which it
 * is not and may never be.
 *
 * Unsurveyed wards are grey and stay grey under every metric. They are not
 * the bottom of the scale; they are outside it.
 */
export function WardDensityClient({ city }: { city: string | null }) {
  /* Two tiers. India opens on districts, because a national map that shows
     one city's wards and nothing else is not a national map. Picking a city
     drops to its wards, which is the resolution a pilot actually works at. */
  const [level, setLevel] = useState<AreaLevel>(city ? "ward" : "district");
  const [region, setRegion] = useState<string | null>(city);
  const [places, setPlaces] = useState<{ level: AreaLevel; city: string; wards: number }[]>([]);
  const [wards, setWards] = useState<WardFeatureCollection | null>(null);
  const [coverage, setCoverage] = useState<WardCoverage | null>(null);
  const [metric, setMetric] = useState<WardMetric>("animals");
  const [selected, setSelected] = useState<WardProps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWardCities().then(setPlaces).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setSelected(null);
    Promise.all([getWardDensity(region, level), getWardCoverage(region, level)])
      .then(([w, c]) => {
        if (!alive) return;
        setWards(w);
        setCoverage(c);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [region, level]);

  const noun = AREA_NOUN[level];
  const cities = places.filter((p) => p.level === "ward");

  const meta = WARD_METRICS[metric];
  const rows = useMemo(
    () => (wards?.features ?? []).map((f) => f.properties),
    [wards]
  );
  const hasBoundaries = rows.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Coverage, before anything else ─────────────────────────── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          ))}
        </div>
      ) : coverage && hasBoundaries ? (
        <>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            <Figure
              label={`${noun.many[0].toUpperCase()}${noun.many.slice(1)} surveyed`}
              value={`${coverage.wards_surveyed} of ${coverage.wards_total}`}
              note={
                coverage.pct_wards_surveyed != null
                  ? `${coverage.pct_wards_surveyed}% of ${region ?? "India"}`
                  : undefined
              }
            />
            <Figure
              label="Area covered"
              value={`${coverage.area_km2_surveyed} km²`}
              note={`of ${coverage.area_km2_total} km²`}
            />
            <Figure
              label="Animals on record"
              value={coverage.animals.toLocaleString("en-IN")}
              note={`${coverage.sterilised_unknown} not yet checked`}
            />
            <Figure
              label="Sterilised"
              value={
                coverage.ster_pct_of_known != null
                  ? `${coverage.ster_pct_of_known}%`
                  : "—"
              }
              /* Both denominators, side by side, always. One of them is
                 flattering and the other is honest, and which is which
                 depends on how much checking has been done. */
              note={
                coverage.ster_pct_of_all != null
                  ? `of checked · ${coverage.ster_pct_of_all}% of all recorded`
                  : "nothing checked yet"
              }
            />
          </div>
          {coverage.wards_unsurveyed > 0 && (
            <Alert>
              <AlertTitle>
                {coverage.wards_unsurveyed} of {coverage.wards_total} {noun.many}{" "}
                have no records yet.
              </AlertTitle>
              <AlertDescription>
                Those {noun.many} are grey on the map below. Grey means nobody
                has surveyed them, not that they have no animals — the two are
                opposite findings and this map will never merge them.
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : null}

      {!loading && !hasBoundaries && (
        <Alert>
          <AlertTitle>
            No {noun.one} boundaries loaded for {region ?? "India"}.
          </AlertTitle>
          <AlertDescription>
            This map needs published boundaries. Run{" "}
            <code>supabase/ward-density.sql</code>, then{" "}
            <code>supabase/districts-india.sql</code> for the national tier and{" "}
            <code>supabase/wards-chennai.sql</code> for Chennai&apos;s wards.
          </AlertDescription>
        </Alert>
      )}

      {hasBoundaries && (
        <>
          <Separator />

          {/* ── Which slice of the country ─────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={level === "district" ? "default" : "outline"}
              onClick={() => { setLevel("district"); setRegion(null); }}
            >
              All India · districts
            </Button>
            {cities.map((c) => (
              <Button
                key={c.city}
                size="sm"
                variant={level === "ward" && region === c.city ? "default" : "outline"}
                onClick={() => { setLevel("ward"); setRegion(c.city); }}
              >
                {c.city} · {c.wards} wards
              </Button>
            ))}
          </div>

          {/* ── Which number is being shaded ───────────────────────── */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Tabs value={metric} onValueChange={(v) => setMetric(v as WardMetric)}>
              <TabsList className="h-auto flex-wrap">
                {(Object.keys(WARD_METRICS) as WardMetric[]).map((k) => (
                  <TabsTrigger key={k} value={k}>
                    {WARD_METRICS[k].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  `straypaw-${(region ?? "india").toLowerCase().replace(/\s+/g, "-")}-${noun.many}.csv`,
                  rows.map((r) => ({
                    [noun.one]: r.ward_name ?? r.ward_no,
                    zone: r.zone_name ?? "",
                    area_km2: r.area_km2,
                    surveyed: r.surveyed ? "yes" : "no",
                    animals: r.animals,
                    per_km2: r.per_km2 ?? "",
                    sterilised: r.sterilised,
                    not_sterilised: r.not_sterilised,
                    not_checked: r.sterilised_unknown,
                    vaccinated: r.vaccinated,
                    needs_help: r.needs_help,
                    sterilised_pct_of_checked: r.ster_pct_of_known ?? "",
                    sterilised_pct_of_all: r.ster_pct_of_all ?? "",
                  }))
                )
              }
            >
              Download ward table (CSV)
            </Button>
          </div>

          <Legend metric={metric} />

          <div className="relative h-[62vh] min-h-[420px] overflow-hidden rounded-lg border">
            <MapCanvas
              dogs={[]}
              wards={wards}
              wardMetric={metric}
              onWardSelect={(w) => setSelected((w as WardProps) ?? null)}
            />
          </div>

          {selected && (
            <div className="rounded-lg border p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <span className="spa-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {selected.zone_name ?? region ?? "India"}
                  </span>
                  <h3 className="font-display text-2xl">
                    {selected.ward_name && level === "district"
              ? selected.ward_name
              : `Ward ${selected.ward_no}`}
                  </h3>
                </div>
                <Badge variant={selected.surveyed ? "secondary" : "outline"}>
                  {selected.surveyed ? "Surveyed" : "Not surveyed"}
                </Badge>
              </div>
              <p className="mt-2 text-[13.5px] text-muted-foreground">
                {meta.describe(selected)} · {selected.area_km2.toFixed(2)} km²
              </p>
              <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-4">
                <Stat label="Animals" value={selected.animals} />
                <Stat label="Sterilised" value={selected.sterilised} />
                <Stat label="Not sterilised" value={selected.not_sterilised} />
                <Stat label="Not checked" value={selected.sterilised_unknown} />
              </dl>
            </div>
          )}

          {coverage?.boundary_source && (
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Ward boundaries: {coverage.boundary_source}
              {coverage.boundary_licence && ` · ${coverage.boundary_licence}`}
              {coverage.boundary_source_url && (
                <>
                  {" · "}
                  <a
                    className="underline underline-offset-2"
                    href={coverage.boundary_source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    source
                  </a>
                </>
              )}
              . Counts are animals recorded in StrayPaw, not an estimated
              population.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div>
      <span className="spa-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <p className="mt-1.5 font-display text-[34px] leading-none tracking-tight">
        {value}
      </p>
      {note && <p className="mt-1.5 text-[12.5px] text-muted-foreground">{note}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11.5px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-xl font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** The bands, printed from the same breaks the map paints with. */
function Legend({ metric }: { metric: WardMetric }) {
  const { breaks, unit } = WARD_METRICS[metric];
  const labels = [
    `0–${breaks[0]}`,
    ...breaks.slice(0, -1).map((b, i) => `${b}–${breaks[i + 1]}`),
    `${breaks[breaks.length - 1]}+`,
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px]">
      <span className="spa-mono uppercase tracking-[0.14em] text-muted-foreground">
        {unit}
      </span>
      <div className="flex items-center gap-1.5">
        {WARD_RAMP.map((c, i) => (
          <span key={c} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3.5 rounded-[2px] border border-black/10"
              style={{ background: c }}
            />
            <span className="tabular-nums text-muted-foreground">{labels[i]}</span>
          </span>
        ))}
      </div>
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="size-3.5 rounded-[2px] border border-black/10"
          style={{ background: WARD_UNSURVEYED }}
        />
        <span className="text-muted-foreground">Not surveyed</span>
      </span>
    </div>
  );
}
