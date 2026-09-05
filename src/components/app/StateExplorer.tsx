"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";

export type StateRow = {
  code: string;
  name: string;
  population: number | null;
  populationSource: string | null;
  populationYear: number | null;
  abcCoverage: number | null;
  abcSource: string | null;
  orgCount: number;
  orgs: { id: string; name: string; city: string; url?: string }[];
};

/**
 * State-by-state view of what is actually established.
 *
 * The bar is population, the one metric published for nearly every state.
 * Coverage is shown only where a state has actually published it, which is
 * the point: two states out of thirty have, and the rest are blank because
 * nobody measured, not because we did not load it.
 */
export function StateExplorer({ rows }: { rows: StateRow[] }) {
  const [selected, setSelected] = useState<StateRow>(
    rows.find((r) => r.abcCoverage !== null) ?? rows[0]
  );
  /* Console search links here with a state code, so the explorer opens on
     that state instead of the default first row. */
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("state");
    if (!code) return;
    const match = rows.find((r) => r.code === code);
    if (match) setSelected(match);
  }, [rows]);

  const [sort, setSort] = useState<"population" | "name" | "orgs">("population");

  const sorted = useMemo(() => {
    const c = [...rows];
    if (sort === "name") c.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "orgs") c.sort((a, b) => b.orgCount - a.orgCount);
    else c.sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
    return c;
  }, [rows, sort]);

  const max = useMemo(
    () => Math.max(...rows.map((r) => r.population ?? 0), 1),
    [rows]
  );

  const withCoverage = rows.filter((r) => r.abcCoverage !== null).length;

  return (
    <div className="se">
      <div className="se-bar">
        <p className="spa-mono">
          {rows.length} states · {withCoverage} with published coverage ·{" "}
          {rows.length - withCoverage} without
        </p>
        <div className="se-sort">
          {(
            [
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

      <div className="se-body">
        <ol className="se-list">
          {sorted.map((r) => {
            const pct = r.population ? (r.population / max) * 100 : 0;
            return (
              <li key={r.code}>
                <button
                  className={selected.code === r.code ? "on" : ""}
                  onClick={() => setSelected(r)}
                  aria-pressed={selected.code === r.code}
                >
                  <span className="se-name">{r.name}</span>
                  <span className="se-track" aria-hidden="true">
                    <i style={{ width: `${pct}%` }} />
                    {r.abcCoverage !== null && (
                      <em style={{ width: `${pct * r.abcCoverage}%` }} />
                    )}
                  </span>
                  <span className="se-val spa-mono">
                    {r.population ? nf(r.population) : ", "}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <aside className="se-detail">
          <span className="spa-mono">Selected state</span>
          <h3>{selected.name}</h3>

          <dl>
            <div>
              <dt>Street-dog population</dt>
              <dd>
                {selected.population ? nf(selected.population) : "Not published"}
              </dd>
              {selected.populationSource && (
                <p className="se-src spa-mono">
                  {selected.populationSource}
                  {selected.populationYear ? ` (${selected.populationYear})` : ""}
                </p>
              )}
            </div>

            <div>
              <dt>Sterilisation coverage</dt>
              {selected.abcCoverage !== null ? (
                <>
                  <dd>{Math.round(selected.abcCoverage * 100)}%</dd>
                  {selected.abcSource && (
                    <p className="se-src spa-mono">{selected.abcSource}</p>
                  )}
                </>
              ) : (
                <>
                  <dd className="se-blank">Not published</dd>
                  <p className="se-src spa-mono">
                    No state-level coverage figure has been released. This is the
                    gap, and it is the normal case, {rows.length - withCoverage} of{" "}
                    {rows.length} states are in it.
                  </p>
                </>
              )}
            </div>

            <div>
              <dt>Listed organisations</dt>
              <dd>{selected.orgCount || "None listed"}</dd>
            </div>
          </dl>

          {selected.orgs.length > 0 && (
            <ul className="se-orgs">
              {selected.orgs.map((o) => {
                const Item = o.url ? "a" : "span";
                return (
                  <li key={o.id}>
                    <Item
                      {...(o.url
                        ? { href: o.url, target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      <b>{o.name}</b>
                      <span>
                        <MapPin size={10} /> {o.city}
                      </span>
                      {o.url && <ExternalLink size={11} />}
                    </Item>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      <p className="se-legend spa-mono">
        <span className="key pop" /> Population
        <span className="key cov" /> Of which sterilised, where published
      </p>
    </div>
  );
}

function nf(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(n >= 1000000 ? 1 : 2)} L`;
  return n.toLocaleString("en-IN");
}
