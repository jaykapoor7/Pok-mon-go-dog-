"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MapPin, Search, X } from "lucide-react";
import type { OrgEntry } from "@/lib/platform/orgs";

/**
 * The directory of real, named animal-welfare organisations across India.
 *
 * Previously these rendered as inert cards with no way to filter or open
 * them, which made 38 organisations effectively unusable. Every entry now
 * links out to the organisation itself, and can be narrowed by state, by
 * what the organisation actually does, or by name.
 */
export function DirectoryClient({
  orgs,
  states,
  focuses,
}: {
  orgs: (OrgEntry & { stateName: string })[];
  states: { code: string; name: string; count: number }[];
  focuses: { focus: string; count: number }[];
}) {
  const [state, setState] = useState("all");
  const [focus, setFocus] = useState("all");
  const [q, setQ] = useState("");

  /* Console search links here with the organisation already named, so the
     directory opens filtered to it rather than at the top of 38 entries. */
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("q");
    if (v) setQ(v);
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orgs.filter((o) => {
      if (state !== "all" && o.stateCode !== state) return false;
      if (focus !== "all" && !o.focus.includes(focus)) return false;
      if (
        needle &&
        !`${o.name} ${o.city} ${o.stateName} ${o.summary}`.toLowerCase().includes(needle)
      ) {
        return false;
      }
      return true;
    });
  }, [orgs, state, focus, q]);

  const filtered = state !== "all" || focus !== "all" || q.trim() !== "";

  return (
    <>
      <div className="dir-controls">
        <label className="dir-search">
          <Search size={14} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, city or state"
            aria-label="Search organisations"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear search">
              <X size={13} />
            </button>
          )}
        </label>

        <label className="dir-select">
          <span>State</span>
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="all">All India ({orgs.length})</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name} ({s.count})
              </option>
            ))}
          </select>
        </label>

        <label className="dir-select">
          <span>Does</span>
          <select value={focus} onChange={(e) => setFocus(e.target.value)}>
            <option value="all">Anything</option>
            {focuses.map((f) => (
              <option key={f.focus} value={f.focus}>
                {f.focus} ({f.count})
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="dir-count spa-mono">
        {results.length} organisation{results.length === 1 ? "" : "s"}
        {filtered && (
          <button
            className="dir-clear"
            onClick={() => {
              setState("all");
              setFocus("all");
              setQ("");
            }}
          >
            Clear filters
          </button>
        )}
      </p>

      {results.length === 0 ? (
        <div className="spa-empty">
          <h2>No organisations match those filters</h2>
          <p>
            No listed organisation fits those filters. The directory covers{" "}
            {states.length} states, try widening it.
          </p>
        </div>
      ) : (
        <div className="dir-grid">
          {results.map((o) => {
            const Card = o.url ? "a" : "div";
            return (
              <Card
                key={o.id}
                className="dir-card"
                {...(o.url
                  ? { href: o.url, target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                <div className="dir-card-head">
                  <h3>{o.name}</h3>
                  {o.url && <ExternalLink size={14} />}
                </div>

                <p className="dir-place">
                  <MapPin size={12} /> {o.city}, {o.stateName}
                  {o.founded && <span className="dir-since">est. {o.founded}</span>}
                </p>

                <p className="dir-summary">{o.summary}</p>

                <div className="dir-tags">
                  {o.focus.map((f) => (
                    <span key={f} className="dir-tag">
                      {f}
                    </span>
                  ))}
                </div>

                <p className="dir-source spa-mono">Source: {o.source}</p>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
