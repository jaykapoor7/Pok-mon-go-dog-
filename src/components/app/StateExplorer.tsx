"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, MapPin } from "lucide-react";

export type StateRow = {
  code: string;
  name: string;
  kind: "state" | "ut";
  population: number | null;
  populationSource: string | null;
  populationYear: number | null;
  bites2024: number | null;
  bites2022: number | null;
  biteSource: string | null;
  deaths2024: number | null;
  abcCoverage: number | null;
  abcSource: string | null;
  orgCount: number;
  orgs: { id: string; name: string; city: string; url?: string }[];
  cityGroups: { city: string; orgs: { id: string; name: string; url?: string }[] }[];
};

/* ════════════════════════════════════════════════════════════════════
   What is established, place by place.

   TWO LAYOUTS, ONE COMPONENT. On a desktop this is a list beside a
   detail panel, which is the right shape when there is room for both.
   On a phone that same grid held a 196px list against a 153px panel:
   the bars collapsed to nothing, the names were clipped and every source
   line broke to a word a line. A phone gets the list at full width and
   opens the record underneath the row that was tapped, which is how a
   register is read on a phone and needs no second column at all.

   The breakpoint is read with matchMedia rather than inferred from CSS,
   because these are two different trees, not one tree styled two ways.

   THE BAR MEASURES WHAT THE LIST IS SORTED BY. Population used to be the
   only bar, including when the list was ordered by something else.
   ════════════════════════════════════════════════════════════════════ */

export function StateExplorer({ rows }: { rows: StateRow[] }) {
  const [selected, setSelected] = useState<StateRow>(
    rows.find((r) => r.abcCoverage !== null) ?? rows[0]
  );
  const [phone, setPhone] = useState(false);
  /* On a phone a row opens in place, only when tapped, and the list starts
     at the ten largest; a detail open by default doubled the page. */
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* Console search links here with a state code, so the explorer opens on
     that state instead of the default first row. */
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("state");
    if (!code) return;
    const match = rows.find((r) => r.code === code);
    if (match) setSelected(match);
  }, [rows]);

  const [sort, setSort] = useState<"population" | "bites" | "name" | "orgs">("bites");

  const sorted = useMemo(() => {
    const c = [...rows];
    if (sort === "name") c.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "orgs") c.sort((a, b) => b.orgCount - a.orgCount);
    else if (sort === "population") c.sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
    else c.sort((a, b) => (b.bites2024 ?? 0) - (a.bites2024 ?? 0));
    return c;
  }, [rows, sort]);

  const measure = sort === "population" ? "population" : sort === "bites" ? "bites" : null;
  const valueOf = (r: StateRow) =>
    measure === "population" ? r.population : measure === "bites" ? r.bites2024 : null;
  const max = useMemo(() => {
    const vals = rows.map((r) =>
      measure === "population" ? r.population : measure === "bites" ? r.bites2024 : null
    );
    return Math.max(...vals.map((v) => v ?? 0), 1);
  }, [rows, measure]);

  const withCoverage = rows.filter((r) => r.abcCoverage !== null).length;
  const states = rows.filter((r) => r.kind === "state").length;
  const uts = rows.filter((r) => r.kind === "ut").length;

  return (
    <div className="se">
      <div className="se-bar">
        <p className="spa-mono">
          {states} states and {uts} union territories · {withCoverage} with published
          sterilisation coverage
        </p>
        <div className="se-sort">
          {(
            [
              ["bites", "Dog bites"],
              ["population", "Population"],
              ["orgs", "Organisations"],
              ["name", "A–Z"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              className={sort === k ? "active" : ""}
              onClick={() => setSort(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="se-body" data-layout={phone ? "stack" : "split"}>
        <ol className="se-list">
          {(phone && !all ? sorted.slice(0, 10) : sorted).map((r) => {
            const v = valueOf(r);
            const pct = v ? (v / max) * 100 : 0;
            const open = phone && openCode === r.code;
            return (
              <li key={r.code} className={open ? "open" : undefined}>
                <button
                  className={selected.code === r.code ? "on" : ""}
                  onClick={() => { setSelected(r); if (phone) setOpenCode((c) => (c === r.code ? null : r.code)); }}
                  aria-pressed={selected.code === r.code}
                  aria-expanded={phone ? open : undefined}
                >
                  <span className="se-name">{r.name}</span>
                  <span className="se-track" aria-hidden="true">
                    <i style={{ width: `${pct}%` }} />
                    {measure === "population" && r.abcCoverage !== null && (
                      <em style={{ width: `${pct * r.abcCoverage}%` }} />
                    )}
                  </span>
                  <span className="se-val spa-mono">{v ? nf(v) : "None"}</span>
                  {phone && <ChevronDown size={15} className="se-chev" aria-hidden />}
                </button>
                {open && <Record row={r} rows={rows} withCoverage={withCoverage} />}
              </li>
            );
          })}
        </ol>
        {phone && !all && sorted.length > 10 && (
          <button type="button" className="se-all" onClick={() => setAll(true)}>Show all {sorted.length}</button>
        )}

        {!phone && (
          <aside className="se-detail">
            <span className="spa-mono">Selected</span>
            <h3>{selected.name}</h3>
            <Record row={selected} rows={rows} withCoverage={withCoverage} />
          </aside>
        )}
      </div>

      <p className="se-legend spa-mono">
        <span className="key pop" />
        {measure === "population" ? "Population" : "Dog bites reported, 2024"}
        {measure === "population" && (
          <>
            <span className="key cov" /> Of which sterilised, where published
          </>
        )}
      </p>
    </div>
  );
}

/** The record itself, identical on both layouts: a phone is not given a
    cut-down version, it is given the same record in one column. */
function Record({
  row,
  rows,
  withCoverage,
}: {
  row: StateRow;
  rows: StateRow[];
  withCoverage: number;
}) {
  const change =
    row.bites2024 !== null && row.bites2022 ? row.bites2024 / row.bites2022 - 1 : null;

  return (
    <div className="se-record">
      <dl>
        <div>
          <dt>Dog bites reported, 2024</dt>
          <dd>
            {row.bites2024 !== null
              ? row.bites2024.toLocaleString("en-IN")
              : "Not published"}
          </dd>
          {change !== null && (
            <p className="se-delta">
              {change >= 0 ? "Up" : "Down"} {Math.abs(Math.round(change * 100))}% on 2022
              {row.bites2022 ? ` (${row.bites2022.toLocaleString("en-IN")})` : ""}
            </p>
          )}
          {row.biteSource && <p className="se-src spa-mono">{row.biteSource}</p>}
        </div>

        <div>
          <dt>Suspected human rabies deaths, 2024</dt>
          <dd>{row.deaths2024 !== null ? row.deaths2024 : "Not published"}</dd>
          <p className="se-src spa-mono">
            Deaths caught by passive surveillance. Modelling puts the real national
            toll near 19,000 a year, so this is what was recorded rather than what
            happened.
          </p>
        </div>

        <div>
          <dt>Street-dog population</dt>
          <dd>{row.population ? nf(row.population) : "Not published"}</dd>
          {row.populationSource && (
            <p className="se-src spa-mono">
              {row.populationSource}
              {row.populationYear ? ` (${row.populationYear})` : ""}
            </p>
          )}
        </div>

        <div>
          <dt>Sterilisation coverage</dt>
          {row.abcCoverage !== null ? (
            <>
              <dd>{Math.round(row.abcCoverage * 100)}%</dd>
              {row.abcSource && <p className="se-src spa-mono">{row.abcSource}</p>}
            </>
          ) : (
            <>
              <dd className="se-blank">Not published</dd>
              <p className="se-src spa-mono">
                No coverage figure has been released here, which is the normal case:{" "}
                {rows.length - withCoverage} of {rows.length} states and union
                territories are in it.
              </p>
            </>
          )}
        </div>

        <div>
          <dt>Listed organisations</dt>
          <dd>{row.orgCount || "None listed"}</dd>
        </div>
      </dl>

      {row.cityGroups.length > 0 && (
        <section
          className="se-city-network"
          aria-label={`Organisations by city in ${row.name}`}
        >
          <div className="se-city-network-head">
            <b>Who is working, by city</b>
            <Link href={`/orgs?state=${row.code}`}>Open directory</Link>
          </div>
          {row.cityGroups.map((group) => (
            <div className="se-city-group" key={group.city}>
              <Link href={`/orgs?state=${row.code}&city=${encodeURIComponent(group.city)}`}>
                <MapPin size={11} />
                {group.city}
                {group.orgs.length > 1 && <span>{group.orgs.length} organisations</span>}
              </Link>
              <ul>
                {group.orgs.map((o) => {
                  const Item = o.url ? "a" : "span";
                  return (
                    <li key={o.id}>
                      <Item
                        {...(o.url
                          ? { href: o.url, target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {o.name}
                        {o.url && <ExternalLink size={11} />}
                      </Item>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function nf(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(n >= 1000000 ? 1 : 2)} L`;
  return n.toLocaleString("en-IN");
}
